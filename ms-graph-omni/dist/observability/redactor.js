/**
 * Redaction rules for pino. Applied to every log message so we never accidentally
 * leak access tokens, cert material, email bodies, or attachment bytes — even if
 * MSGO_LOG_LEVEL is bumped to debug for diagnostics.
 *
 * Pino's redact engine uses fast-redact paths (no regex). Each path is a dot-separated
 * accessor; `*` is a single-segment wildcard.
 *
 * Update with intent — adding paths is cheap, removing them is risky.
 */
export const REDACT_PATHS = [
    // Auth tokens / cert material
    "accessToken",
    "access_token",
    "refresh_token",
    "id_token",
    "clientCertificate",
    "clientCertificate.privateKey",
    "clientCertificate.thumbprint",
    "privateKey",
    "thumbprint",
    "secret",
    "password",
    "passwordProfile.password",
    // Mail bodies & attachments
    "body.content",
    "bodyPreview",
    "*.body.content",
    "*.bodyPreview",
    "message.body.content",
    "attachments[*].contentBytes",
    "attachments[*].contentBase64",
    // Recipients (PII; kept for ops via SHA-256 hash in audit-log instead)
    "to[*].emailAddress.address",
    "cc[*].emailAddress.address",
    "bcc[*].emailAddress.address",
    "toRecipients[*].emailAddress.address",
    "ccRecipients[*].emailAddress.address",
    "bccRecipients[*].emailAddress.address",
    // File contents
    "contentBase64",
    "contentBytes",
    // Headers that may contain bearer tokens
    "headers.authorization",
    "headers.Authorization",
    "*.headers.authorization",
    "*.headers.Authorization",
];
/**
 * Pino redact config object. Spread into `pino({ redact: ... })`.
 */
export const PINO_REDACT_CONFIG = {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
    remove: false,
};
//# sourceMappingURL=redactor.js.map