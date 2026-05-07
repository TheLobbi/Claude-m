/**
 * Translate an unknown thrown value into a TranslatedError.
 *
 * Defensive against: GraphError instances, plain Error, FetchError, MSAL errors,
 * and bare strings. Never throws.
 */
export function translateGraphError(err, ctx = {}) {
    const e = err;
    const statusCode = pickStatus(e);
    const originalMessage = String(e?.message ?? err ?? "Unknown error");
    const originalCode = pickStringField(e, "code") ?? extractInnerCode(e?.body);
    const correlationId = pickStringField(e, "requestId") ??
        extractHeader(e?.headers ?? e?.response?.headers, "request-id") ??
        extractHeader(e?.headers ?? e?.response?.headers, "client-request-id") ??
        undefined;
    const base = {
        statusCode,
        originalMessage,
        originalCode,
        correlationId,
        tool: ctx.tool,
        mode: ctx.mode,
    };
    // 429 — throttling. Retry-After can come as seconds (number) or HTTP date.
    if (statusCode === 429) {
        const retryAfterMs = parseRetryAfter(e?.headers ?? e?.response?.headers);
        return {
            ...base,
            code: "tooManyRequests",
            summary: "Microsoft Graph throttled this request (429 Too Many Requests).",
            recoveryHint: retryAfterMs != null
                ? `Wait ${Math.ceil(retryAfterMs / 1000)}s, then retry. The retry middleware will do this automatically once configured.`
                : "Apply jittered exponential backoff (start at 1s) and retry.",
            retryAfterMs,
            isRetryable: true,
        };
    }
    // 503 — service-side unavailability; retryable with backoff.
    if (statusCode === 503) {
        return {
            ...base,
            code: "serviceUnavailable",
            summary: "Microsoft Graph is temporarily unavailable (503).",
            recoveryHint: "Retry with exponential backoff. If persistent, check https://status.office.com.",
            retryAfterMs: parseRetryAfter(e?.headers ?? e?.response?.headers) ?? 5000,
            isRetryable: true,
        };
    }
    // 412 — etag precondition failed. Non-retryable; caller must re-fetch + re-patch.
    if (statusCode === 412) {
        return {
            ...base,
            code: "preconditionFailed",
            summary: "ETag precondition failed — the resource changed since you last read it.",
            recoveryHint: "Re-fetch the resource (e.g., planner_getTask) to obtain the latest @odata.etag, then retry the patch with that value in If-Match.",
            isRetryable: false,
        };
    }
    // 409 — conflict (typical: duplicate name, concurrent modification not via etag).
    if (statusCode === 409) {
        return {
            ...base,
            code: "conflict",
            summary: "Resource conflict (409) — likely a duplicate name or concurrent modification.",
            recoveryHint: "Check whether a resource with the same name already exists, or set @microsoft.graph.conflictBehavior to 'replace' or 'rename' on file uploads.",
            isRetryable: false,
        };
    }
    // 404 — usually means the lookup is correct but the item is genuinely absent.
    if (statusCode === 404) {
        return {
            ...base,
            code: "itemNotFound",
            summary: "Resource not found (404).",
            recoveryHint: "Verify the id / path is correct. Common cause: targeting /me/manager when no manager is assigned, or using a stale id after a delete.",
            isRetryable: false,
        };
    }
    // 401 — auth invalid or token expired.
    if (statusCode === 401) {
        const code = /expired|lifetime/i.test(originalMessage)
            ? "expiredAuthentication"
            : "invalidAuthentication";
        return {
            ...base,
            code,
            summary: code === "expiredAuthentication"
                ? "Access token expired (401)."
                : "Authentication failed (401).",
            recoveryHint: ctx.mode === "delegated"
                ? "The delegated cache may be stale. Delete ~/.msgo-cache/msal.json and retry to trigger interactive sign-in."
                : "Check that the cert in Key Vault is current and admin consent is granted on the app registration.",
            isRetryable: false,
        };
    }
    // 403 — most interesting class. Tease apart scope / app-access-policy / generic forbidden.
    if (statusCode === 403) {
        // App access policy missing for OnlineMeetings / Transcripts / CallRecords.
        if (/no application access policy found for this app/i.test(originalMessage) ||
            originalCode === "Forbidden_ApplicationAccessPolicy") {
            return {
                ...base,
                code: "appAccessPolicyMissing",
                summary: "App-only access to this user's online meetings / transcripts requires an ApplicationAccessPolicy that is not configured for this user.",
                recoveryHint: "A tenant admin must run scripts/grant-meeting-access-policy.ps1 (Skype for Business PowerShell). Propagation can take up to 30 minutes.",
                isRetryable: false,
            };
        }
        // Insufficient scope — try to extract the missing permission name.
        const requiredScopes = extractRequiredScopes(e, originalMessage);
        return {
            ...base,
            code: "insufficientScope",
            summary: requiredScopes
                ? `App is missing one or more required scopes: ${requiredScopes.join(", ")}.`
                : "Forbidden (403). The app or user is not authorized for this operation.",
            recoveryHint: requiredScopes
                ? `Grant ${requiredScopes.join(", ")} via admin consent on the Lobbi-Cowork-Graph app, then retry. See scripts/add-permissions.ps1.`
                : "Check the permission table for this Graph endpoint at learn.microsoft.com and ensure the app has admin consent for the relevant scope.",
            ...(requiredScopes ? { requiredScopes } : {}),
            isRetryable: false,
        };
    }
    // 400 — bad request. Several Graph subcategories are common enough to call out.
    if (statusCode === 400) {
        // Delta-token rotation. Caller must restart the delta sync from scratch.
        if (originalCode === "syncStateNotFound" || /sync\s*state\s*not\s*found/i.test(originalMessage)) {
            return {
                ...base,
                code: "syncStateNotFound",
                summary: "The delta sync state token expired or is unknown.",
                recoveryHint: "Restart the delta sync from scratch by calling the *delta endpoint without a $deltatoken parameter.",
                isRetryable: false,
            };
        }
        if (originalCode === "syncStateInvalid" || /sync\s*state\s*invalid/i.test(originalMessage)) {
            return {
                ...base,
                code: "syncStateInvalid",
                summary: "The delta sync state is invalid (likely due to schema migration or property change).",
                recoveryHint: "Discard the saved deltaLink and restart the delta sync. The first follow-up call will return a fresh deltaLink.",
                isRetryable: false,
            };
        }
        if (/quota|throttle|exceed/i.test(originalMessage)) {
            return {
                ...base,
                code: "quotaLimitExceeded",
                summary: "Graph quota / soft-limit exceeded.",
                recoveryHint: "Reduce request volume, paginate via $top, or switch to delta queries for change tracking.",
                isRetryable: true,
            };
        }
        return {
            ...base,
            code: "invalidInput",
            summary: "Bad request (400). Graph rejected the payload or query.",
            recoveryHint: "Check parameter names, values, and combinations. Some endpoints (e.g. /teams/{id}/channels) reject $top — see the tool description.",
            isRetryable: false,
        };
    }
    // 500-class — server-side error.
    if (statusCode != null && statusCode >= 500) {
        return {
            ...base,
            code: "internalServerError",
            summary: `Microsoft Graph returned a server-side error (${statusCode}).`,
            recoveryHint: "Retry once with backoff. If persistent, capture the request-id and check Graph status.",
            isRetryable: true,
        };
    }
    // Fallback — unknown shape.
    return {
        ...base,
        code: "unknown",
        summary: originalMessage.slice(0, 240),
        recoveryHint: "Inspect originalMessage / originalCode for clues. If reproducible, file an issue.",
        isRetryable: false,
    };
}
/* ------------------------------------------------------------------ helpers */
function pickStatus(e) {
    if (!e)
        return null;
    if (typeof e.statusCode === "number")
        return e.statusCode;
    if (typeof e.status === "number")
        return e.status;
    if (typeof e.response?.status === "number")
        return e.response.status;
    return null;
}
function pickStringField(obj, field) {
    if (typeof obj !== "object" || obj === null)
        return undefined;
    const v = obj[field];
    return typeof v === "string" ? v : undefined;
}
function extractInnerCode(body) {
    if (typeof body === "string") {
        try {
            const j = JSON.parse(body);
            return j?.error?.code;
        }
        catch {
            return undefined;
        }
    }
    if (typeof body === "object" && body !== null) {
        return body?.error?.code;
    }
    return undefined;
}
function extractHeader(headers, name) {
    if (!headers)
        return undefined;
    if (typeof headers.get === "function") {
        return headers.get(name) ?? undefined;
    }
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === lower)
            return v;
    }
    return undefined;
}
function parseRetryAfter(headers) {
    const raw = extractHeader(headers, "retry-after");
    if (!raw)
        return undefined;
    // Numeric seconds form
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber))
        return Math.max(0, Math.round(asNumber * 1000));
    // HTTP-date form
    const asDate = Date.parse(raw);
    if (!Number.isNaN(asDate))
        return Math.max(0, asDate - Date.now());
    return undefined;
}
/**
 * Try to recover the missing-scope name from common Graph 403 shapes.
 * Looks at:
 *  - WWW-Authenticate header (Bearer ... claims with scope=)
 *  - error.message text scanning for "<Scope>.<Permission>" tokens
 *  - x-ms-diagnostics header
 */
function extractRequiredScopes(e, message) {
    const candidates = new Set();
    const headers = e?.headers ?? e?.response?.headers;
    const wwwAuth = extractHeader(headers, "www-authenticate");
    if (wwwAuth) {
        const scopeMatch = wwwAuth.match(/scope="?([^",]+)"?/i);
        if (scopeMatch?.[1]) {
            for (const s of scopeMatch[1].split(/\s+/)) {
                if (s)
                    candidates.add(s);
            }
        }
    }
    const xmsDiag = extractHeader(headers, "x-ms-diagnostics");
    if (xmsDiag) {
        const diagMatch = xmsDiag.match(/scope[s]?[:=]\s*"?([^",]+)"?/i);
        if (diagMatch?.[1]) {
            for (const s of diagMatch[1].split(/[\s,]+/)) {
                if (s)
                    candidates.add(s);
            }
        }
    }
    // Permission names look like "Mail.ReadWrite", "Tasks.ReadWrite.All", "Group.Read.All"
    // Scan the message for that pattern as a last resort.
    const re = /\b([A-Z][a-zA-Z]+(?:\.[A-Za-z]+){1,3})\b/g;
    let match;
    while ((match = re.exec(message)) !== null) {
        const candidate = match[1];
        if (candidate && /^[A-Z]/.test(candidate) && candidate.includes(".")) {
            // Filter out obvious non-permissions
            if (!/microsoft\.graph|odata|onmicrosoft|@odata/i.test(candidate)) {
                candidates.add(candidate);
            }
        }
    }
    return candidates.size > 0 ? Array.from(candidates) : undefined;
}
//# sourceMappingURL=errorTranslator.js.map