/**
 * Shared helpers for tool authoring.
 *
 * - `makeTool` removes boilerplate: pass a `call` fn that gets a Graph client.
 * - `ListOptionsSchema` is the standard Graph odata shape (top, skip, select, ...).
 * - `applyListOptions` applies them to a GraphRequest.
 */
import { z } from "zod";
import type { Client, GraphRequest } from "@microsoft/microsoft-graph-client";
import { getGraphClient, type AuthMode } from "../auth/index.js";
import { assertTenantAllowsNamespace, namespaceForToolName } from "../capabilities.js";
import { getTenant } from "../config.js";
import type { ToolDef, ToolAnnotationsHints } from "./types.js";

export const ListOptionsSchema = z.object({
  top: z.number().int().min(1).max(999).optional().describe("Page size (1-999, default 25)."),
  skip: z.number().int().min(0).optional().describe("Skip first N items."),
  select: z.array(z.string()).optional().describe("Fields to return ($select)."),
  expand: z.array(z.string()).optional().describe("Related resources to expand ($expand)."),
  filter: z.string().optional().describe("OData filter expression ($filter)."),
  orderby: z.string().optional().describe("OData order expression ($orderby)."),
  search: z.string().optional().describe("Search expression ($search). Use with consistencyLevel=eventual headers when needed."),
  count: z.boolean().optional().describe("Include @odata.count in response."),
  pageToken: z
    .string()
    .optional()
    .describe(
      "Opaque page token returned in `nextPageToken` from a previous call. When provided, all other query options are ignored — the token already encodes them."
    ),
});

export type ListOptions = z.infer<typeof ListOptionsSchema>;

export function applyListOptions(req: GraphRequest, opts: ListOptions = {}): GraphRequest {
  // pageToken is an opaque cursor (the @odata.nextLink URL we returned earlier).
  // It already contains every query option from the original call, so we don't
  // re-apply them here. The actual URL switch happens in the tool by calling
  // client.api(decodePageToken(opts.pageToken)) instead of client.api(<base>).
  if (opts.pageToken) return req;
  if (opts.top !== undefined) req = req.top(opts.top);
  if (opts.skip !== undefined) req = req.skip(opts.skip);
  if (opts.select?.length) req = req.select(opts.select.join(","));
  if (opts.expand?.length) req = req.expand(opts.expand.join(","));
  if (opts.filter) req = req.filter(opts.filter);
  if (opts.orderby) req = req.orderby(opts.orderby);
  if (opts.search) req = req.search(opts.search);
  if (opts.count) req = req.count(true);
  // Advanced queries require eventual consistency
  if (opts.filter || opts.search || opts.count) {
    req = req.header("ConsistencyLevel", "eventual");
  }
  return req;
}

/**
 * Encode an `@odata.nextLink` URL (returned by Graph in any list response) into
 * an opaque pageToken the LLM can echo back. Today this is the URL itself
 * base64url-encoded; we keep it opaque so we can swap encodings later
 * (compression, signing, etc.) without breaking callers.
 *
 * Returns null if no nextLink is present (last page).
 */
export function encodeNextPageToken(response: unknown): string | null {
  if (typeof response !== "object" || response === null) return null;
  const next = (response as Record<string, unknown>)["@odata.nextLink"];
  if (typeof next !== "string" || next.length === 0) return null;
  return Buffer.from(next, "utf-8").toString("base64url");
}

/** Decode a pageToken back to the underlying Graph URL. */
export function decodePageToken(token: string): string {
  return Buffer.from(token, "base64url").toString("utf-8");
}

/**
 * Add an opaque `nextPageToken` to a Graph list response without removing any
 * of the original fields. Callers that already read `value` + `@odata.nextLink`
 * keep working; new callers can echo `nextPageToken` back through `pageToken`
 * for the next page without dealing with raw URL state.
 *
 * The function returns a NEW object — the input is not mutated.
 */
export function shapeListResponse<T extends Record<string, unknown>>(
  response: T
): T & { nextPageToken: string | null } {
  return {
    ...response,
    nextPageToken: encodeNextPageToken(response),
  };
}

/**
 * Convenience for tools: given the standard ListOptions and the base Graph URL
 * the tool would normally call, return either:
 *   - a request that follows the pageToken (if provided)
 *   - the normal `applyListOptions(client.api(baseUrl), opts)` request
 *
 * Tools call this once at the top of their handler instead of branching.
 */
export function listRequest(
  client: Client,
  baseUrl: string,
  opts: ListOptions = {}
): GraphRequest {
  if (opts.pageToken) {
    return client.api(decodePageToken(opts.pageToken));
  }
  return applyListOptions(client.api(baseUrl), opts);
}

export function makeTool<TSchema extends z.ZodTypeAny>(opts: {
  name: string;
  description: string;
  inputSchema: TSchema;
  mode: AuthMode;
  /** Capability namespace used to enforce per-tenant install profiles. Defaults from tool name prefix. */
  namespace?: ToolDef["namespace"];
  /** Optional MCP annotations. If omitted, surface-level defaults from `defaultAnnotationsForName` apply. */
  annotations?: ToolAnnotationsHints;
  /** Optional zod schema for typed output (becomes MCP `structuredContent`). */
  outputSchema?: z.ZodTypeAny;
  /**
   * Receives the parsed (post-default) output of the schema. So an input field
   * declared as `z.array(z.string()).default([])` is `string[]` here, not
   * `string[] | undefined`.
   */
  call: (input: z.output<TSchema>, client: Client) => Promise<unknown>;
}): ToolDef<z.input<TSchema>> {
  const namespace = opts.namespace ?? namespaceForToolName(opts.name);
  return {
    name: opts.name,
    description: opts.description,
    inputSchema: opts.inputSchema,
    mode: opts.mode,
    namespace,
    annotations: opts.annotations ?? defaultAnnotationsForName(opts.name),
    outputSchema: opts.outputSchema,
    handler: async (rawInput: z.input<TSchema>) => {
      const parsed = opts.inputSchema.parse(rawInput) as z.output<TSchema>;
      // Multi-tenant: every tool implicitly accepts an optional `tenantSlug` on
      // its input even when its zod schema doesn't declare it. We extract it
      // from the raw input (zod strips unknown keys by default) and route the
      // Graph client to the matching tenant. When absent, the auth factory
      // resolves to defaultTenant.
      const tenantSlug =
        rawInput && typeof rawInput === "object" && "tenantSlug" in (rawInput as Record<string, unknown>)
          ? ((rawInput as Record<string, unknown>).tenantSlug as string | undefined)
          : undefined;
      assertTenantAllowsNamespace(getTenant(tenantSlug), opts.name, namespace);
      const client = await getGraphClient({ mode: opts.mode, tenantSlug });
      return await opts.call(parsed, client);
    },
  };
}

/**
 * Heuristic annotation defaults derived from the tool name suffix.
 *
 * Goal: every tool gets sensible defaults so that autonomy gates (e.g.
 * `unattended-review` profile) can auto-approve reads while pausing on writes
 * without having to enumerate the full tool list.
 *
 * Override per-tool by passing `annotations: {...}` to `makeTool`.
 */
export function defaultAnnotationsForName(name: string): ToolAnnotationsHints {
  // Match the verb portion after the last underscore, e.g. mail_listMessages -> "listMessages"
  const verb = name.includes("_") ? name.slice(name.lastIndexOf("_") + 1) : name;
  const v = verb.toLowerCase();

  // Reads — safe to auto-approve
  if (
    v.startsWith("get") ||
    v.startsWith("list") ||
    v.startsWith("search") ||
    v.startsWith("find") ||
    v.startsWith("read") ||
    v.startsWith("download") ||
    v.startsWith("query")
  ) {
    return { readOnlyHint: true, openWorldHint: true };
  }

  // Destructive — must prompt
  if (
    v.startsWith("delete") ||
    v.startsWith("remove") ||
    v.startsWith("archive") ||
    v.startsWith("revoke") ||
    v.startsWith("close")
  ) {
    return { destructiveHint: true, openWorldHint: true };
  }

  // Idempotent updates / patches
  if (
    v.startsWith("update") ||
    v.startsWith("set") ||
    v.startsWith("patch") ||
    v.startsWith("assign") ||
    v.startsWith("complete") ||
    v.startsWith("move") ||
    v.startsWith("apply")
  ) {
    return { idempotentHint: true, openWorldHint: true };
  }

  // Default for create/send/post — non-idempotent open-world write
  return { openWorldHint: true };
}
