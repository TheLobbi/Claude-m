import { z } from "zod";
import type { ToolNamespace } from "../capabilities.js";

/**
 * MCP tool annotations — hints to the client about a tool's behavior.
 * These don't affect execution; they let autonomy gates / UIs reason about safety.
 */
export interface ToolAnnotationsHints {
  /** Human-readable display title (rendered in UIs in place of the tool name). */
  title?: string;
  /** True if the tool only reads data (no writes). */
  readOnlyHint?: boolean;
  /** True if the tool may delete or irreversibly modify data. */
  destructiveHint?: boolean;
  /** True if calling the tool repeatedly with the same inputs has the same effect. */
  idempotentHint?: boolean;
  /** True if the tool calls external APIs whose state the server doesn't fully control. */
  openWorldHint?: boolean;
}

export interface ToolDef<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  /** "app" | "delegated" — declares which auth mode this tool needs. */
  mode: "app" | "delegated";
  /** Capability namespace used to enforce per-tenant install profiles. */
  namespace?: ToolNamespace;
  /** MCP tool annotations. Optional; defaults applied per-surface in _helpers. */
  annotations?: ToolAnnotationsHints;
  /** Optional zod schema for the tool's output, surfaced as MCP `structuredContent`. */
  outputSchema?: z.ZodTypeAny;
  handler: (input: TInput) => Promise<unknown>;
}
