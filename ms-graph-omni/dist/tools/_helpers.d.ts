/**
 * Shared helpers for tool authoring.
 *
 * - `makeTool` removes boilerplate: pass a `call` fn that gets a Graph client.
 * - `ListOptionsSchema` is the standard Graph odata shape (top, skip, select, ...).
 * - `applyListOptions` applies them to a GraphRequest.
 */
import { z } from "zod";
import type { Client, GraphRequest } from "@microsoft/microsoft-graph-client";
import { type AuthMode } from "../auth/index.js";
import type { ToolDef, ToolAnnotationsHints } from "./types.js";
export declare const ListOptionsSchema: z.ZodObject<{
    top: z.ZodOptional<z.ZodNumber>;
    skip: z.ZodOptional<z.ZodNumber>;
    select: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    expand: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    filter: z.ZodOptional<z.ZodString>;
    orderby: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    count: z.ZodOptional<z.ZodBoolean>;
    pageToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}, {
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}>;
export type ListOptions = z.infer<typeof ListOptionsSchema>;
export declare function applyListOptions(req: GraphRequest, opts?: ListOptions): GraphRequest;
/**
 * Encode an `@odata.nextLink` URL (returned by Graph in any list response) into
 * an opaque pageToken the LLM can echo back. Today this is the URL itself
 * base64url-encoded; we keep it opaque so we can swap encodings later
 * (compression, signing, etc.) without breaking callers.
 *
 * Returns null if no nextLink is present (last page).
 */
export declare function encodeNextPageToken(response: unknown): string | null;
/** Decode a pageToken back to the underlying Graph URL. */
export declare function decodePageToken(token: string): string;
/**
 * Add an opaque `nextPageToken` to a Graph list response without removing any
 * of the original fields. Callers that already read `value` + `@odata.nextLink`
 * keep working; new callers can echo `nextPageToken` back through `pageToken`
 * for the next page without dealing with raw URL state.
 *
 * The function returns a NEW object — the input is not mutated.
 */
export declare function shapeListResponse<T extends Record<string, unknown>>(response: T): T & {
    nextPageToken: string | null;
};
/**
 * Convenience for tools: given the standard ListOptions and the base Graph URL
 * the tool would normally call, return either:
 *   - a request that follows the pageToken (if provided)
 *   - the normal `applyListOptions(client.api(baseUrl), opts)` request
 *
 * Tools call this once at the top of their handler instead of branching.
 */
export declare function listRequest(client: Client, baseUrl: string, opts?: ListOptions): GraphRequest;
export declare function makeTool<TSchema extends z.ZodTypeAny>(opts: {
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
}): ToolDef<z.input<TSchema>>;
/**
 * Heuristic annotation defaults derived from the tool name suffix.
 *
 * Goal: every tool gets sensible defaults so that autonomy gates (e.g.
 * `unattended-review` profile) can auto-approve reads while pausing on writes
 * without having to enumerate the full tool list.
 *
 * Override per-tool by passing `annotations: {...}` to `makeTool`.
 */
export declare function defaultAnnotationsForName(name: string): ToolAnnotationsHints;
