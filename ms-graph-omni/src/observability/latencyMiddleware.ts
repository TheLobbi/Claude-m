/**
 * Per-tool-call instrumentation wrapper. Every tool handler in server.ts is
 * wrapped in `withObservability` so that:
 *
 *   1. A correlation id is attached to every log line for the call's lifetime
 *   2. Wall-clock latency is measured and emitted at INFO
 *   3. Write operations get an audit-log line under ~/.msgo-cache/audit/YYYY-MM.ndjson
 *   4. Failures emit one ERROR line + one audit-log entry tagged outcome:"error"
 *
 * Designed to be cheap: the audit fingerprint only walks the top level of the
 * input object and never serializes bodies or attachments.
 */
import { logger } from "../logger.js";
import {
  fingerprintInput,
  isWriteTool,
  newCorrelationId,
  writeAuditEntry,
  type AuditEntry,
} from "./auditLog.js";
import type { ToolAnnotationsHints } from "../tools/types.js";

interface ObsContext {
  toolName: string;
  mode: "app" | "delegated";
  annotations?: ToolAnnotationsHints;
  /** Optional input fingerprint override (e.g. when raw input shouldn't be walked). */
  inputForAudit?: unknown;
}

export async function withObservability<T>(
  ctx: ObsContext,
  fn: () => Promise<T>
): Promise<T> {
  const correlationId = newCorrelationId();
  const startedAt = process.hrtime.bigint();
  const audit = isWriteTool(ctx.annotations);

  logger.debug({ tool: ctx.toolName, correlationId, mode: ctx.mode }, "tool call started");

  try {
    const result = await fn();
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

    logger.info(
      { tool: ctx.toolName, correlationId, durationMs, outcome: "ok", mode: ctx.mode },
      "tool call completed"
    );

    if (audit) {
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        correlationId,
        tool: ctx.toolName,
        mode: ctx.mode,
        durationMs,
        outcome: "ok",
        inputFingerprint: fingerprintInput(ctx.inputForAudit),
        annotations: ctx.annotations,
      };
      writeAuditEntry(entry);
    }

    return result;
  } catch (err) {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    const errorCode = (err as { code?: string })?.code;

    if (audit) {
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        correlationId,
        tool: ctx.toolName,
        mode: ctx.mode,
        durationMs,
        outcome: "error",
        errorCode,
        inputFingerprint: fingerprintInput(ctx.inputForAudit),
        annotations: ctx.annotations,
      };
      writeAuditEntry(entry);
    }

    throw err;
  }
}
