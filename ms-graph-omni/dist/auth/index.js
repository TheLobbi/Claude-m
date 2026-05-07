/**
 * The single entry point any tool uses to get an authenticated Graph client.
 *
 *   const client = await getGraphClient({ mode: "app" });                                  // default tenant
 *   const client = await getGraphClient({ mode: "app", tenantSlug: "client-acme" });       // specific tenant
 *   const client = await getGraphClient({ mode: "delegated" });                            // act as user
 *
 * Each tool file declares its mode at the top. Optionally a tool can pass
 * tenantSlug from its input. The factory caches Graph clients per (tenantSlug, mode)
 * so we don't spin up token requests on every call.
 */
import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import { getAppOnlyToken } from "./app-only-client.js";
import { getDelegatedToken } from "./delegated-client.js";
import { loadConfig, getTenant } from "../config.js";
const clientCache = new Map();
function cacheKey(mode, tenantSlug) {
    return `${tenantSlug}|${mode}`;
}
export async function getGraphClient(opts) {
    const tenant = getTenant(opts.tenantSlug);
    const key = cacheKey(opts.mode, tenant.slug);
    const cached = clientCache.get(key);
    if (cached)
        return cached;
    const cfg = loadConfig();
    const client = Client.init({
        authProvider: async (done) => {
            try {
                const token = opts.mode === "app"
                    ? await getAppOnlyToken({
                        tenantId: tenant.tenantId,
                        clientId: tenant.clientId,
                        vaultUrl: tenant.vaultUrl,
                        certName: tenant.certName,
                        cachePolicy: tenant.environment === "client" ? "memory" : "persistent",
                    })
                    : await getDelegatedToken({
                        tenantId: tenant.tenantId,
                        clientId: tenant.clientId,
                        tokenCacheDir: cfg.tokenCacheDir,
                        scopes: opts.scopes,
                    });
                done(null, token);
            }
            catch (e) {
                done(e, null);
            }
        },
        defaultVersion: "v1.0",
    });
    clientCache.set(key, client);
    return client;
}
//# sourceMappingURL=index.js.map