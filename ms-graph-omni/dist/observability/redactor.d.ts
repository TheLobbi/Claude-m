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
export declare const REDACT_PATHS: string[];
/**
 * Pino redact config object. Spread into `pino({ redact: ... })`.
 */
export declare const PINO_REDACT_CONFIG: {
    paths: string[];
    censor: string;
    remove: boolean;
};
