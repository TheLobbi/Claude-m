import { z } from "zod";
import { makeTool, ListOptionsSchema, listRequest, shapeListResponse } from "./_helpers.js";
import { makeResourceTool } from "./_resource.js";
export const security_listIncidents = makeTool({
    name: "security_listIncidents",
    description: "List Microsoft Graph Security incidents.",
    namespace: "security",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => shapeListResponse(await listRequest(client, "/security/incidents", opts).get()),
});
export const security_listAlerts = makeTool({
    name: "security_listAlerts",
    description: "List Microsoft Graph Security alerts_v2.",
    namespace: "security",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => shapeListResponse(await listRequest(client, "/security/alerts_v2", opts).get()),
});
export const security_listSecureScores = makeTool({
    name: "security_listSecureScores",
    description: "List Microsoft Secure Score records.",
    namespace: "security",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => shapeListResponse(await listRequest(client, "/security/secureScores", opts).get()),
});
export const defender_runAdvancedHunting = makeResourceTool({
    name: "defender_runAdvancedHunting",
    description: "Run a Microsoft Defender XDR advanced hunting KQL query.",
    namespace: "security",
    resource: "https://api.security.microsoft.com",
    baseUrl: "https://api.security.microsoft.com",
    inputSchema: z.object({ query: z.string() }),
    call: async ({ query }, client) => client.post("/api/advancedhunting/run", { Query: query }),
});
export const securityTools = [
    security_listIncidents,
    security_listAlerts,
    security_listSecureScores,
    defender_runAdvancedHunting,
];
//# sourceMappingURL=security.js.map