export interface TranslatedError {
    code: TranslatedErrorCode;
    statusCode: number | null;
    summary: string;
    recoveryHint: string;
    requiredScopes?: string[];
    retryAfterMs?: number;
    isRetryable: boolean;
    originalMessage: string;
    originalCode?: string;
    /** Tool that raised the error, when known (passed in by server.ts handler). */
    tool?: string;
    /** Auth mode in use when the error was raised. */
    mode?: "app" | "delegated";
    /** Free-form correlation string from Graph response (`request-id`, `client-request-id`). */
    correlationId?: string;
}
export type TranslatedErrorCode = "invalidAuthentication" | "expiredAuthentication" | "insufficientScope" | "appAccessPolicyMissing" | "itemNotFound" | "preconditionFailed" | "conflict" | "tooManyRequests" | "serviceUnavailable" | "internalServerError" | "syncStateNotFound" | "syncStateInvalid" | "badRequest" | "quotaLimitExceeded" | "invalidInput" | "unknown";
interface TranslateContext {
    tool?: string;
    mode?: "app" | "delegated";
}
/**
 * Translate an unknown thrown value into a TranslatedError.
 *
 * Defensive against: GraphError instances, plain Error, FetchError, MSAL errors,
 * and bare strings. Never throws.
 */
export declare function translateGraphError(err: unknown, ctx?: TranslateContext): TranslatedError;
export {};
