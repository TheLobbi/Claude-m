/**
 * Persist delta tokens (`@odata.deltaLink` URLs) so we can resume change tracking
 * across MCP server restarts.
 *
 * Layout: ~/.msgo-cache/delta/{tenantSlug}-{resource}-{user}.json
 *
 * Entry shape: { deltaLink, savedAt, syncedAt? }
 *   - deltaLink: the URL to call next time to get changes since
 *   - savedAt: when we wrote the token
 *   - syncedAt: when the most recent successful resume completed (for diagnostics)
 *
 * The store handles three error modes that Microsoft documents:
 *   - Token expired: 410 Gone or 400 syncStateNotFound -> caller deletes the
 *     token and starts fresh (handled in delta tools, not here)
 *   - Token invalid: 400 syncStateInvalid -> same recovery
 *   - First call ever: no file -> caller starts fresh
 *
 * Source: https://learn.microsoft.com/graph/delta-query-overview
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { logger } from "../logger.js";
const STORE_DIR = process.env.MSGO_DELTA_DIR ??
    join(process.env.USERPROFILE ?? process.env.HOME ?? ".", ".msgo-cache", "delta");
function ensureDir() {
    if (!existsSync(STORE_DIR))
        mkdirSync(STORE_DIR, { recursive: true });
}
function safeSlug(s) {
    return s.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);
}
function tokenPath(tenantSlug, resource, scope) {
    return join(STORE_DIR, `${safeSlug(tenantSlug)}-${safeSlug(resource)}-${safeSlug(scope)}.json`);
}
export function readDelta(tenantSlug, resource, scope) {
    try {
        ensureDir();
        const p = tokenPath(tenantSlug, resource, scope);
        if (!existsSync(p))
            return null;
        return JSON.parse(readFileSync(p, "utf-8"));
    }
    catch (e) {
        logger.warn({ err: e.message }, "delta store read failed; treating as fresh");
        return null;
    }
}
export function writeDelta(tenantSlug, resource, scope, deltaLink) {
    try {
        ensureDir();
        const entry = {
            deltaLink,
            savedAt: new Date().toISOString(),
            syncedAt: new Date().toISOString(),
        };
        const p = tokenPath(tenantSlug, resource, scope);
        if (!existsSync(dirname(p)))
            mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, JSON.stringify(entry, null, 2), { encoding: "utf-8", mode: 0o600 });
    }
    catch (e) {
        logger.warn({ err: e.message }, "delta store write failed; next call will start fresh");
    }
}
/** Drop a stored delta token. Call this when Graph returns syncStateNotFound / syncStateInvalid. */
export function clearDelta(tenantSlug, resource, scope) {
    try {
        const p = tokenPath(tenantSlug, resource, scope);
        if (existsSync(p))
            unlinkSync(p);
    }
    catch {
        // Best-effort
    }
}
/** Extract the deltaLink (if any) from a Graph delta response. */
export function extractDeltaLink(response) {
    if (typeof response !== "object" || response === null)
        return null;
    const v = response["@odata.deltaLink"];
    return typeof v === "string" ? v : null;
}
/** Extract the @odata.nextLink (intermediate page during a multi-page delta sync). */
export function extractNextLink(response) {
    if (typeof response !== "object" || response === null)
        return null;
    const v = response["@odata.nextLink"];
    return typeof v === "string" ? v : null;
}
//# sourceMappingURL=deltaStore.js.map