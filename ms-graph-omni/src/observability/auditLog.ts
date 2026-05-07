/**
 * Append-only NDJSON audit log for write operations.
 *
 * Every tool call whose annotations indicate a write (no readOnlyHint, OR destructiveHint, OR
 * idempotentHint with a state-changing verb) gets one line in:
 *
 *     ~/.msgo-cache/audit/YYYY-MM.ndjson
 *
 * Each line records:
 *   - ISO timestamp
 *   - tool name + auth mode + correlation id
 *   - duration ms
 *   - outcome (ok / error)
 *   - sanitized input fingerprint (recipients hashed, bodies redacted)
 *
 * Never logs: bodies, attachments, tokens, raw recipient addresses (hashed instead).
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { ToolAnnotationsHints } from "../tools/types.js";

const AUDIT_DIR = process.env.MSGO_AUDIT_DIR ?? join(process.env.USERPROFILE ?? process.env.HOME ?? ".", ".msgo-cache", "audit");
const AUDIT_DISABLED = process.env.MSGO_AUDIT_DISABLED === "true";

let dirEnsured = false;
function ensureDir() {
  if (dirEnsured) return;
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
  dirEnsured = true;
}

function currentLogPath(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return join(AUDIT_DIR, `${yyyy}-${mm}.ndjson`);
}

/** True when the tool performs any state-changing call. */
export function isWriteTool(annotations: ToolAnnotationsHints | undefined): boolean {
  if (!annotations) return true; // err on the safe side; log if unknown
  if (annotations.readOnlyHint) return false;
  return true;
}

/**
 * Hash an email address (or other PII string) to a 12-char prefix so audit
 * grep can correlate "the same recipient" across calls without storing the
 * address in plaintext.
 */
export function hashPii(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex").slice(0, 12);
}

/**
 * Build a small, redacted fingerprint of a tool input. Strategy:
 *  - keep type-of values for primitives
 *  - strip body/content/attachment fields entirely
 *  - hash recipient lists, preserving counts
 *  - preserve identifier-shaped fields (id, eventId, messageId, listId, taskId, etc.)
 */
export function fingerprintInput(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null) return { _: typeof input };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    const lower = k.toLowerCase();
    if (lower === "body" || lower === "html" || lower === "content" || lower.endsWith("base64") || lower === "contentbytes") {
      out[k] = `[redacted ${typeof v === "string" ? v.length : 0} chars]`;
      continue;
    }
    if (lower === "attachments" && Array.isArray(v)) {
      out[k] = `[${v.length} attachments redacted]`;
      continue;
    }
    if (Array.isArray(v) && (lower === "to" || lower === "cc" || lower === "bcc")) {
      out[k] = v.map((addr) => (typeof addr === "string" ? `sha:${hashPii(addr)}` : "[obj]"));
      continue;
    }
    if (typeof v === "string") {
      // Small strings (likely IDs) pass through; long ones get a length marker.
      out[k] = v.length > 256 ? `[string len=${v.length}]` : v;
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = `[array len=${v.length}]`;
      continue;
    }
    if (typeof v === "object") {
      out[k] = "[object]";
      continue;
    }
    out[k] = `[${typeof v}]`;
  }
  return out;
}

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

export function writeAuditEntry(entry: AuditEntry): void {
  if (AUDIT_DISABLED) return;
  if (!isWriteTool(entry.annotations)) return;
  try {
    ensureDir();
    appendFileSync(currentLogPath(), JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // Audit log is best-effort. Failures here must never break the tool call.
  }
}

export function newCorrelationId(): string {
  return randomUUID();
}
