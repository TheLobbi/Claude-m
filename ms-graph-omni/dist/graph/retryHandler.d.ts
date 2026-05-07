export interface RetryOptions {
    /** Maximum number of retries (default 3). */
    maxRetries?: number;
    /** Base delay in ms used for the exponential backoff (default 1000). */
    baseDelayMs?: number;
    /** Hard ceiling on a single delay in ms (default 60_000). */
    maxDelayMs?: number;
    /** Description used in log lines for diagnostics. */
    context?: string;
}
/**
 * Run `fn` and retry on retryable errors honoring Retry-After when present.
 *
 * Retryable conditions are determined by the error translator. On success
 * returns the value; on exhaustion re-throws the last error.
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T>;
