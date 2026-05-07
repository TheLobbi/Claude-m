/**
 * Generic Microsoft Graph passthrough — escape hatch for any endpoint not yet
 * exposed by a dedicated tool. Pass the relative Graph URL + method + optional
 * body/headers and get the raw response.
 */
import { z } from "zod";
import { makeTool } from "./_helpers.js";
export const graph_request = makeTool({
    name: "graph_request",
    description: "Generic Microsoft Graph REST passthrough. Use this when a dedicated tool doesn't exist for the endpoint you need. Path is relative to https://graph.microsoft.com/v1.0 by default; use absolute https:// URLs for /beta or other API surfaces. Mode 'app' uses the cert-based app-only token; 'delegated' uses your user token. Method defaults to GET. Returns parsed JSON for read responses; { ok: true } for 204 No Content.",
    mode: "app",
    inputSchema: z.object({
        path: z.string().describe("Graph endpoint path, e.g. '/me', '/users', '/groups/{id}/sites'. Absolute URL also accepted."),
        method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]).default("GET"),
        body: z.unknown().optional().describe("Request body for POST/PATCH/PUT."),
        headers: z.record(z.string(), z.string()).optional().describe("Extra headers, e.g. { 'If-Match': 'W/...', 'ConsistencyLevel': 'eventual' }."),
        mode: z.enum(["app", "delegated"]).default("app").describe("Auth mode override; default app-only."),
        queryParams: z.record(z.string(), z.string()).optional().describe("URL query params (will be appended)."),
    }),
    call: async ({ path, method, body, headers, queryParams }, client) => {
        let req = client.api(path);
        if (queryParams)
            req = req.query(queryParams);
        if (headers) {
            for (const [k, v] of Object.entries(headers))
                req = req.header(k, v);
        }
        switch (method) {
            case "GET":
                return await req.get();
            case "POST":
                return await req.post(body ?? {});
            case "PATCH":
                return await req.patch(body ?? {});
            case "PUT":
                return await req.put(body ?? {});
            case "DELETE":
                await req.delete();
                return { ok: true };
        }
    },
});
export const graphTools = [graph_request];
//# sourceMappingURL=graph.js.map