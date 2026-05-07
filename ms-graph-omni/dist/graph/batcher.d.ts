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
/**
 * Submit a batch. If the batch contains more than 20 requests, splits into
 * multiple round-trips automatically. Failed sub-responses (429/503) are
 * retried per-request with the same backoff policy used elsewhere.
 */
export declare function submitBatch(client: Client, requests: BatchRequest[]): Promise<BatchSubResponse[]>;
