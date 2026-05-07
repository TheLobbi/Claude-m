/**
 * Retry helpers.
 *
 * The @microsoft/microsoft-graph-client SDK already wires a RetryHandler into
 * its default middleware chain (Client.init -> MiddlewareFactory.getDefaultMiddlewareChain),
 * which honors `Retry-After` on 429/503/504 with up to 3 retries and a 3s base delay.
 *
 * That default covers normal single-request tool calls. The places it does NOT help:
 *   - Inside a $batch sub-response (Microsoft confirms the SDK does not auto-retry batched 429s)
 *   - Ad-hoc HTTP work outside the Graph client (e.g., uploadUrl PUTs from createUploadSession)
 *
 * `retryWithBackoff` below is the primitive Phase B.1 (batcher) and Phase B.2
 * (large file upload) reuse to honor Retry-After + jittered exponential backoff
 * in those code paths.
 *
 * Per-tool opt-out: a tool can set `noRetry: true` in its annotations metadata; callers
 * can inspect that to skip the wrapper. (No tools opt out today; reserved for the future.)
 */
import { logger } from "../logger.js";
import { translateGraphError } from "./errorTranslator.js";
/**
 * Run `fn` and retry on retryable errors honoring Retry-After when present.
 *
 * Retryable conditions are determined by the error translator. On success
 * returns the value; on exhaustion re-throws the last error.
 */
export async function retryWithBackoff(fn, opts = {}) {
    const max = opts.maxRetries ?? 3;
    const base = opts.baseDelayMs ?? 1000;
    const ceiling = opts.maxDelayMs ?? 60_000;
    let lastErr;
    for (let attempt = 0; attempt <= max; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastErr = err;
            const translated = translateGraphError(err);
            if (!translated.isRetryable || attempt === max) {
                throw err;
            }
            const honoured = translated.retryAfterMs;
            const expo = Math.min(ceiling, base * 2 ** attempt);
            const jitter = Math.floor(Math.random() * (expo / 2));
            const delay = Math.min(ceiling, honoured ?? expo + jitter);
            logger.warn({
                context: opts.context,
                attempt: attempt + 1,
                delayMs: delay,
                code: translated.code,
                retryAfterHonoured: honoured != null,
            }, "retrying after retryable error");
            await sleep(delay);
        }
    }
    throw lastErr;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=retryHandler.js.map