import { getTenant } from "../config.js";
import { getAppOnlyToken } from "./app-only-client.js";
export async function getResourceToken(opts) {
    const tenant = getTenant(opts.tenantSlug);
    return await getAppOnlyToken({
        tenantId: tenant.tenantId,
        clientId: tenant.clientId,
        vaultUrl: tenant.vaultUrl,
        certName: tenant.certName,
        scope: `${opts.resource}/.default`,
        cachePolicy: tenant.environment === "client" ? "memory" : "persistent",
    });
}
function buildUrl(baseUrl, path, query) {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    const url = new URL(normalizedPath, normalizedBase);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== undefined)
            url.searchParams.set(key, String(value));
    }
    return url.toString();
}
async function parseResponse(response) {
    if (response.status === 204)
        return { ok: true };
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json"))
        return await response.json();
    return await response.text();
}
export function createResourceClient(opts) {
    const fetchFn = opts.fetchFn ?? fetch;
    const request = async (method, path, requestOptions = {}) => {
        const token = await getResourceToken({ tenantSlug: opts.tenantSlug, resource: opts.resource });
        const headers = {
            accept: "application/json",
            authorization: `Bearer ${token}`,
            ...requestOptions.headers,
        };
        const init = { method, headers };
        if (requestOptions.body !== undefined) {
            headers["content-type"] = headers["content-type"] ?? "application/json";
            init.body =
                typeof requestOptions.body === "string"
                    ? requestOptions.body
                    : JSON.stringify(requestOptions.body);
        }
        const response = await fetchFn(buildUrl(opts.baseUrl, path, requestOptions.query), init);
        if (!response.ok) {
            const body = await parseResponse(response);
            throw new Error(`Resource request failed ${response.status}: ${JSON.stringify(body)}`);
        }
        return await parseResponse(response);
    };
    return {
        get: (path, query) => request("GET", path, { query }),
        post: (path, body, options = {}) => request("POST", path, { ...options, body }),
        patch: (path, body, options = {}) => request("PATCH", path, { ...options, body }),
        put: (path, body, options = {}) => request("PUT", path, { ...options, body }),
        delete: (path, options = {}) => request("DELETE", path, options),
        request,
    };
}
//# sourceMappingURL=resource-client.js.map