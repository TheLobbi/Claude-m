/**
 * MSAL ConfidentialClientApplication for app-only (client credentials) auth.
 * One token cache per (tenant, clientId, scope) combo.
 *
 * Token cache is persisted to disk only when msal-node-extensions can create an
 * encrypted persistence layer. If platform protection is unavailable, app-only
 * auth falls back to MSAL's in-memory cache instead of writing plaintext JSON.
 *
 * Microsoft explicitly warns that msal-node-extensions PersistenceCachePlugin is not
 * recommended for confidential clients in multi-user / multi-tenant scenarios. We use
 * it only for our single-process daemon use case; if multi-tenant work lands later
 * (Phase C #6) we'll switch to per-tenant DistributedCachePlugin.
 *
 * Source: https://learn.microsoft.com/entra/msal/javascript/node/caching
 */
import { ConfidentialClientApplication, LogLevel } from "@azure/msal-node";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { getCertificate } from "./kv-cert-provider.js";
import { logger } from "../logger.js";
const clientPool = new Map();
function defaultCacheDir() {
    return process.env.MSGO_TOKEN_CACHE_DIR ?? join(process.env.USERPROFILE ?? process.env.HOME ?? ".", ".msgo-cache");
}
async function buildAppCachePlugin(clientId) {
    const cacheDir = defaultCacheDir();
    const cacheFile = join(cacheDir, `msal-app-${clientId}.json`);
    if (!existsSync(dirname(cacheFile)))
        mkdirSync(dirname(cacheFile), { recursive: true });
    // Client tenant profiles use cachePolicy=memory and do not call this path.
    // Internal/local profiles persist only through msal-node-extensions protected storage.
    try {
        const ext = await import("@azure/msal-node-extensions");
        const { FilePersistenceWithDataProtection, DataProtectionScope, PersistenceCachePlugin } = ext;
        const persistence = await FilePersistenceWithDataProtection.create(cacheFile, DataProtectionScope.CurrentUser);
        return new PersistenceCachePlugin(persistence);
    }
    catch (e) {
        logger.warn({ err: e.message, cacheFile }, "msal-node-extensions protected cache unavailable for app-only auth; using memory-only cache");
        return undefined;
    }
}
async function getClient(tenantId, clientId, vaultUrl, certName, cachePolicy) {
    const key = `${tenantId}|${clientId}|${vaultUrl}|${certName}|${cachePolicy}`;
    const existing = clientPool.get(key);
    if (existing)
        return existing;
    const { privateKey, thumbprint } = await getCertificate(vaultUrl, certName);
    const cachePlugin = cachePolicy === "persistent" ? await buildAppCachePlugin(clientId) : undefined;
    const clientConfig = {
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
            // x5c omitted — thumbprint + privateKey is sufficient for client_assertion
            // and matches the public cert uploaded to the app registration.
            clientCertificate: { thumbprint, privateKey },
        },
        system: {
            loggerOptions: {
                // TODO(2026-05-06): Investigate non-failing MSAL app-only "No client info in response" warning - see TODO.md
                loggerCallback: (level, message) => {
                    if (level === LogLevel.Error)
                        logger.error(message);
                    else if (level === LogLevel.Warning)
                        logger.warn(message);
                },
                piiLoggingEnabled: false,
            },
        },
    };
    const client = new ConfidentialClientApplication(cachePlugin ? { ...clientConfig, cache: { cachePlugin } } : clientConfig);
    clientPool.set(key, client);
    return client;
}
export async function getAppOnlyToken(opts) {
    const scope = opts.scope ?? "https://graph.microsoft.com/.default";
    const client = await getClient(opts.tenantId, opts.clientId, opts.vaultUrl, opts.certName, opts.cachePolicy ?? "persistent");
    const result = await client.acquireTokenByClientCredential({ scopes: [scope] });
    if (!result?.accessToken) {
        throw new Error("MSAL returned no access token (app-only)");
    }
    return result.accessToken;
}
//# sourceMappingURL=app-only-client.js.map