import { logger } from "../logger.js";
import { retryWithBackoff } from "./retryHandler.js";
import { translateGraphError } from "./errorTranslator.js";
const MAX_REQUESTS_PER_BATCH = 20; // Microsoft hard limit
/**
 * Submit a batch. If the batch contains more than 20 requests, splits into
 * multiple round-trips automatically. Failed sub-responses (429/503) are
 * retried per-request with the same backoff policy used elsewhere.
 */
export async function submitBatch(client, requests) {
    if (requests.length === 0)
        return [];
    const out = [];
    for (let i = 0; i < requests.length; i += MAX_REQUESTS_PER_BATCH) {
        const chunk = requests.slice(i, i + MAX_REQUESTS_PER_BATCH);
        const responses = await runBatchChunk(client, chunk);
        out.push(...responses);
    }
    return out;
}
async function runBatchChunk(client, chunk) {
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
    const result = (await client.api("/$batch").post(payload));
    const subResponses = result.responses ?? [];
    const subById = new Map();
    const toRetry = [];
    for (const sub of subResponses) {
        if (sub.status >= 400) {
            // Hand off to the error translator so the LLM (and our retry loop) sees structure
            const synthErr = {
                statusCode: sub.status,
                message: typeof sub.body === "object" && sub.body !== null && "error" in sub.body
                    ? sub.body.error?.message ?? `Batch sub-request ${sub.id} failed`
                    : `Batch sub-request ${sub.id} failed`,
                body: sub.body,
                headers: sub.headers,
            };
            const translated = translateGraphError(synthErr);
            if (translated.isRetryable) {
                const original = chunk.find((r) => r.id === sub.id);
                if (original)
                    toRetry.push(original);
            }
            subById.set(sub.id, { id: sub.id, status: sub.status, body: sub.body, headers: sub.headers, error: translated });
        }
        else {
            subById.set(sub.id, { id: sub.id, status: sub.status, body: sub.body, headers: sub.headers });
        }
    }
    // Per-request retry loop for retryable failures (429, 503)
    if (toRetry.length > 0) {
        logger.warn({ count: toRetry.length }, "batch sub-requests retryable; re-batching after backoff");
        const retried = await retryWithBackoff(() => runBatchChunk(client, toRetry), { context: `batch-retry(${toRetry.length})` });
        for (const r of retried) {
            // Last writer wins — replace the failed entry with the retry result
            subById.set(r.id, r);
        }
    }
    // Preserve original order
    return chunk.map((r) => subById.get(r.id) ?? { id: r.id, status: 0, error: translateGraphError(new Error("missing batch response")) });
}
//# sourceMappingURL=batcher.js.map