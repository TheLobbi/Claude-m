/**
 * Runtime config — multi-tenant aware as of v0.2.
 *
 * Two paths:
 *   (a) MSGO_TENANTS_JSON   — JSON array of tenant configs. Preferred.
 *   (b) MSGO_TENANT_ID + MSGO_CLIENT_ID + MSGO_KEY_VAULT_URL + MSGO_CERT_NAME
 *       — legacy single-tenant env. Auto-promoted to a one-tenant array with
 *       slug "default" so existing .mcp.json files keep working unchanged.
 *
 * Tools accept an optional `tenantSlug` field on their input. When present, the
 * auth factory routes to the matching tenant; when absent, it uses
 * `defaultTenant` (or the only tenant if there's just one).
 *
 * Example MSGO_TENANTS_JSON:
 *   [
 *     {"slug":"primary","tenantId":"<tenant-guid>","clientId":"<app-guid>",
 *      "vaultUrl":"https://<your-vault>.vault.azure.net/","certName":"<cert-name>"},
 *     {"slug":"client-acme","tenantId":"...","clientId":"...","vaultUrl":"...","certName":"..."}
 *   ]
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTenantCapabilityProfile } from "./capabilities.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
function loadRuntimeJson() {
    try {
        const path = resolve(__dirname, "..", "config", "runtime.json");
        const raw = readFileSync(path, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function parseTenantsEnv() {
    const raw = process.env.MSGO_TENANTS_JSON;
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            throw new Error("MSGO_TENANTS_JSON must be a JSON array");
        }
        for (const t of parsed) {
            if (!t.slug || !t.tenantId || !t.clientId || !t.vaultUrl || !t.certName) {
                throw new Error("Each MSGO_TENANTS_JSON entry needs: slug, tenantId, clientId, vaultUrl, certName");
            }
            validateTenantCapabilityProfile(t);
        }
        return parsed;
    }
    catch (e) {
        throw new Error(`MSGO_TENANTS_JSON parse error: ${e.message}`);
    }
}
let cached = null;
export function loadConfig() {
    if (cached)
        return cached;
    const fromFile = loadRuntimeJson();
    // Path (a): explicit multi-tenant JSON
    const fromEnvMulti = parseTenantsEnv();
    if (fromEnvMulti) {
        const defaultTenant = process.env.MSGO_DEFAULT_TENANT ?? (fromEnvMulti[0]?.slug ?? "default");
        cached = {
            tenants: fromEnvMulti,
            defaultTenant,
            tokenCacheDir: resolveTokenCacheDir(),
            logLevel: process.env.MSGO_LOG_LEVEL ?? "info",
        };
        validateDefault(cached);
        return cached;
    }
    // Path (b): legacy single-tenant env or runtime.json
    const tenantId = process.env.MSGO_TENANT_ID ?? fromFile.tenantId ?? "";
    const clientId = process.env.MSGO_CLIENT_ID ?? fromFile.clientId ?? "";
    const vaultUrl = process.env.MSGO_KEY_VAULT_URL ?? fromFile.vaultUrl ?? "";
    const certName = process.env.MSGO_CERT_NAME ?? fromFile.certName ?? "";
    const missing = [];
    if (!tenantId)
        missing.push("MSGO_TENANT_ID");
    if (!clientId)
        missing.push("MSGO_CLIENT_ID");
    if (!vaultUrl)
        missing.push("MSGO_KEY_VAULT_URL");
    if (!certName)
        missing.push("MSGO_CERT_NAME");
    if (missing.length > 0) {
        throw new Error(`ms-graph-omni: missing config: ${missing.join(", ")}. ` +
            `Provide MSGO_TENANTS_JSON for multi-tenant, or set the four legacy env vars. ` +
            `Run scripts/provision-azure.ps1 first.`);
    }
    cached = {
        tenants: [{ slug: "default", tenantId, clientId, vaultUrl, certName }],
        defaultTenant: "default",
        tokenCacheDir: resolveTokenCacheDir(),
        logLevel: process.env.MSGO_LOG_LEVEL ?? "info",
    };
    return cached;
}
function resolveTokenCacheDir() {
    return (process.env.MSGO_TOKEN_CACHE_DIR ??
        `${process.env.USERPROFILE ?? process.env.HOME}/.msgo-cache`);
}
function validateDefault(cfg) {
    if (!cfg.tenants.find((t) => t.slug === cfg.defaultTenant)) {
        throw new Error(`MSGO_DEFAULT_TENANT='${cfg.defaultTenant}' does not match any configured tenant slug. ` +
            `Configured slugs: ${cfg.tenants.map((t) => t.slug).join(", ")}.`);
    }
}
/**
 * Look up a tenant by slug. Throws if not found, with a helpful list of
 * available slugs in the error message.
 */
export function getTenant(slug) {
    const cfg = loadConfig();
    const wantSlug = slug ?? cfg.defaultTenant;
    const found = cfg.tenants.find((t) => t.slug === wantSlug);
    if (!found) {
        throw new Error(`Unknown tenantSlug='${wantSlug}'. Configured slugs: ${cfg.tenants
            .map((t) => t.slug)
            .join(", ")}.`);
    }
    return found;
}
//# sourceMappingURL=config.js.map