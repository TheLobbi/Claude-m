/**
 * MSAL PublicClientApplication for delegated (act-as-user) auth.
 *
 * First run: pops a browser tab for interactive login (uses http://localhost redirect
 * registered on the Entra app).
 * Subsequent runs: silent refresh from disk cache. Cache is JSON, optionally DPAPI-protected
 * via @azure/msal-node-extensions when available; falls back to plain JSON on disk if
 * extensions aren't installed.
 */
import { PublicClientApplication, LogLevel, } from "@azure/msal-node";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import open from "open";
import { logger } from "../logger.js";
const clientPool = new Map();
async function buildCachePlugin(cacheFile) {
    // Try msal-node-extensions for DPAPI on Windows, libsecret on Linux.
    // Falls back to plain file persistence if extensions aren't present.
    try {
        const ext = await import("@azure/msal-node-extensions");
        const { PersistenceCachePlugin, FilePersistenceWithDataProtection, DataProtectionScope } = ext;
        const persistence = await FilePersistenceWithDataProtection.create(cacheFile, DataProtectionScope.CurrentUser);
        return new PersistenceCachePlugin(persistence);
    }
    catch (e) {
        logger.warn({ err: e.message }, "msal-node-extensions unavailable, falling back to plain JSON cache (less secure)");
        return {
            beforeCacheAccess: async (ctx) => {
                if (existsSync(cacheFile)) {
                    ctx.tokenCache.deserialize(readFileSync(cacheFile, "utf-8"));
                }
            },
            afterCacheAccess: async (ctx) => {
                if (ctx.cacheHasChanged) {
                    writeFileSync(cacheFile, ctx.tokenCache.serialize());
                }
            },
        };
    }
}
async function getClient(tenantId, clientId, cacheDir) {
    const key = `${tenantId}|${clientId}|${cacheDir}`;
    const existing = clientPool.get(key);
    if (existing)
        return existing;
    if (!existsSync(cacheDir))
        mkdirSync(cacheDir, { recursive: true });
    const cacheFile = join(cacheDir, "msal.json");
    const cachePlugin = await buildCachePlugin(cacheFile);
    const client = new PublicClientApplication({
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
        },
        cache: { cachePlugin: cachePlugin },
        system: {
            loggerOptions: {
                loggerCallback: (level, message) => {
                    if (level === LogLevel.Error)
                        logger.error(message);
                },
                piiLoggingEnabled: false,
            },
        },
    });
    clientPool.set(key, client);
    return client;
}
export async function getDelegatedToken(opts) {
    const scopes = opts.scopes ?? ["https://graph.microsoft.com/.default"];
    const client = await getClient(opts.tenantId, opts.clientId, opts.tokenCacheDir);
    const cache = client.getTokenCache();
    const accounts = await cache.getAllAccounts();
    if (accounts.length > 0) {
        try {
            const result = await client.acquireTokenSilent({
                account: accounts[0],
                scopes,
            });
            if (result?.accessToken)
                return result.accessToken;
        }
        catch (e) {
            logger.info({ err: e.message }, "silent token refresh failed, falling back to interactive");
        }
    }
    logger.info("first-run interactive auth — opening browser");
    const result = await client.acquireTokenInteractive({
        scopes,
        openBrowser: async (url) => {
            await open(url);
        },
        successTemplate: "<html><body style='font-family:sans-serif;padding:40px'><h2>Signed in.</h2><p>You can close this tab. Claude has your token.</p></body></html>",
    });
    if (!result?.accessToken)
        throw new Error("MSAL returned no access token (delegated)");
    return result.accessToken;
}
//# sourceMappingURL=delegated-client.js.map