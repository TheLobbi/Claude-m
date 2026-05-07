import type { ToolAnnotationsHints } from "../tools/types.js";
/** True when the tool performs any state-changing call. */
export declare function isWriteTool(annotations: ToolAnnotationsHints | undefined): boolean;
/**
 * Hash an email address (or other PII string) to a 12-char prefix so audit
 * grep can correlate "the same recipient" across calls without storing the
 * address in plaintext.
 */
export declare function hashPii(value: string): string;
/**
 * Build a small, redacted fingerprint of a tool input. Strategy:
 *  - keep type-of values for primitives
 *  - strip body/content/attachment fields entirely
 *  - hash recipient lists, preserving counts
 *  - preserve identifier-shaped fields (id, eventId, messageId, listId, taskId, etc.)
 */
export declare function fingerprintInput(input: unknown): Record<string, unknown>;
export interface AuditEntry {
    timestamp: string;
    correlationId: string;
    tool: string;
    mode: "app" | "delegated";
    durationMs: number;
    outcome: "ok" | "error";
    errorCode?: string;
    inputFingerprint: Record<string, unknown>;
    annotations?: ToolAnnotationsHints;
}
export declare function writeAuditEntry(entry: AuditEntry): void;
export declare function newCorrelationId(): string;
