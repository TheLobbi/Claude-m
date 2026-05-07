/**
 * JSON $batch helper for Microsoft Graph.
 *
 * Status: SCAFFOLD. The runtime helper below collapses N independent Graph
 * calls into one HTTP roundtrip via POST /$batch (max 20 sub-requests per
 * batch per docs: https://learn.microsoft.com/graph/json-batching). It does NOT
 * yet auto-fan-in our existing tools' multi-call sequences (planner_completeTask
 * GET-then-PATCH, teams_createChat /me-then-POST, etc.) — that requires
 * surgical edits per tool. This file gives those edits a single, tested target.
 *
 * Microsoft confirms the SDK does NOT auto-retry 429s inside a batch
 * (https://learn.microsoft.com/graph/throttling#throttling-and-batching), so we
 * inspect each sub-response, parse Retry-After per failed entry, and re-batch
 * the failed entries with backoff via `retryWithBackoff` from ./retryHandler.
 *
 * Outlook batch caveat: when targeting the same mailbox without `dependsOn`,
 * Microsoft Graph fans out at most 4 sub-requests in parallel, regardless of
 * batch size, to stay within Outlook concurrency limits
 * (https://learn.microsoft.com/graph/throttling-limits#outlook-service-limits).
 */
import type { Client } from "@microsoft/microsoft-graph-client";
import { logger } from "../logger.js";
import { retryWithBackoff } from "./retryHandler.js";
import { translateGraphError } from "./errorTranslator.js";

/** Single sub-request in a batch. */
export interface BatchRequest {
  /** Caller-defined id used to match request->response. Must be unique within the batch. */
  id: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Relative Graph URL, e.g. "/me" or "/users/{id}/messages". */
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * Optional dependency. If set, this request runs only after the named ones complete.
   * Microsoft restricts dependsOn to: parallel (none), serial (chain), or same-target
   * (all dependents reference the same predecessor). Arbitrary DAGs are not supported.
   */
  dependsOn?: string[];
}

export interface BatchSubResponse<T = unknown> {
  id: string;
  status: number;
  body?: T;
  headers?: Record<string, string>;
  /** Translated structured error; only present when status >= 400 (after retries). */
  error?: ReturnType<typeof translateGraphError>;
}

const MAX_REQUESTS_PER_BATCH = 20; // Microsoft hard limit

/**
 * Submit a batch. If the batch contains more than 20 requests, splits into
 * multiple round-trips automatically. Failed sub-responses (429/503) are
 * retried per-request with the same backoff policy used elsewhere.
 */
export async function submitBatch(
  client: Client,
  requests: BatchRequest[]
): Promise<BatchSubResponse[]> {
  if (requests.length === 0) return [];

  const out: BatchSubResponse[] = [];
  for (let i = 0; i < requests.length; i += MAX_REQUESTS_PER_BATCH) {
    const chunk = requests.slice(i, i + MAX_REQUESTS_PER_BATCH);
    const responses = await runBatchChunk(client, chunk);
    out.push(...responses);
  }
  return out;
}

async function runBatchChunk(
  client: Client,
  chunk: BatchRequest[]
): Promise<BatchSubResponse[]> {
  const payload = {
    requests: chunk.map((r) => ({
      id: r.id,
      method: r.method,
      url: r.url,
      ...(r.body !== undefined ? { body: r.body } : {}),
      ...(r.headers ? { headers: r.headers } : {}),
      ...(r.dependsOn?.length ? { dependsOn: r.dependsOn } : {}),
    })),
  };

  const result = (await client.api("/$batch").post(payload)) as {
    responses?: Array<{
      id: string;
      status: number;
      body?: unknown;
      headers?: Record<string, string>;
    }>;
  };

  const subResponses = result.responses ?? [];
  const subById = new Map<string, BatchSubResponse>();
  const toRetry: BatchRequest[] = [];

  for (const sub of subResponses) {
    if (sub.status >= 400) {
      // Hand off to the error translator so the LLM (and our retry loop) sees structure
      const synthErr = {
        statusCode: sub.status,
        message: typeof sub.body === "object" && sub.body !== null && "error" in sub.body
          ? (sub.body as { error?: { message?: string } }).error?.message ?? `Batch sub-request ${sub.id} failed`
          : `Batch sub-request ${sub.id} failed`,
        body: sub.body,
        headers: sub.headers,
      };
      const translated = translateGraphError(synthErr);
      if (translated.isRetryable) {
        const original = chunk.find((r) => r.id === sub.id);
        if (original) toRetry.push(original);
      }
      subById.set(sub.id, { id: sub.id, status: sub.status, body: sub.body, headers: sub.headers, error: translated });
    } else {
      subById.set(sub.id, { id: sub.id, status: sub.status, body: sub.body, headers: sub.headers });
    }
  }

  // Per-request retry loop for retryable failures (429, 503)
  if (toRetry.length > 0) {
    logger.warn({ count: toRetry.length }, "batch sub-requests retryable; re-batching after backoff");
    const retried = await retryWithBackoff(
      () => runBatchChunk(client, toRetry),
      { context: `batch-retry(${toRetry.length})` }
    );
    for (const r of retried) {
      // Last writer wins — replace the failed entry with the retry result
      subById.set(r.id, r);
    }
  }

  // Preserve original order
  return chunk.map((r) => subById.get(r.id) ?? { id: r.id, status: 0, error: translateGraphError(new Error("missing batch response")) });
}
