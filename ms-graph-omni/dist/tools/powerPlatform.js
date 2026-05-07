import { z } from "zod";
import { makeResourceTool } from "./_resource.js";
const BAP_RESOURCE = "https://api.bap.microsoft.com";
const BAP_BASE = "https://api.bap.microsoft.com";
const BAP_API_VERSION = "2020-10-01";
export const powerPlatform_listEnvironments = makeResourceTool({
    name: "powerPlatform_listEnvironments",
    description: "List Power Platform environments visible to the admin application.",
    namespace: "power-platform",
    resource: BAP_RESOURCE,
    baseUrl: BAP_BASE,
    inputSchema: z.object({}),
    call: async (_input, client) => client.get("/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments", {
        "api-version": BAP_API_VERSION,
    }),
});
export const powerPlatform_listDlpPolicies = makeResourceTool({
    name: "powerPlatform_listDlpPolicies",
    description: "List tenant DLP policies from Power Platform admin APIs.",
    namespace: "power-platform",
    resource: BAP_RESOURCE,
    baseUrl: BAP_BASE,
    inputSchema: z.object({}),
    call: async (_input, client) => client.get("/providers/Microsoft.BusinessAppPlatform/scopes/admin/policies", {
        "api-version": BAP_API_VERSION,
    }),
});
export const powerApps_listApps = makeResourceTool({
    name: "powerApps_listApps",
    description: "List Power Apps in a Power Platform environment.",
    namespace: "power-platform",
    resource: BAP_RESOURCE,
    baseUrl: BAP_BASE,
    inputSchema: z.object({ environmentName: z.string() }),
    call: async ({ environmentName }, client) => client.get(`/providers/Microsoft.BusinessAppPlatform/scopes/admin/environments/${environmentName}/apps`, {
        "api-version": BAP_API_VERSION,
    }),
});
export const powerAutomate_listFlows = makeResourceTool({
    name: "powerAutomate_listFlows",
    description: "List Power Automate flows in a Power Platform environment. Service principal support is limited to administrative scenarios.",
    namespace: "power-platform",
    resource: BAP_RESOURCE,
    baseUrl: BAP_BASE,
    inputSchema: z.object({ environmentName: z.string() }),
    call: async ({ environmentName }, client) => client.get(`/providers/Microsoft.ProcessSimple/scopes/admin/environments/${environmentName}/flows`, {
        "api-version": "2016-11-01",
    }),
});
function dataverseOrigin(environmentUrl) {
    return new URL(environmentUrl).origin;
}
export const dataverse_listTables = makeResourceTool({
    name: "dataverse_listTables",
    description: "List Dataverse table metadata for an environment.",
    namespace: "power-platform",
    resource: ({ environmentUrl }) => dataverseOrigin(environmentUrl),
    baseUrl: ({ environmentUrl }) => dataverseOrigin(environmentUrl),
    inputSchema: z.object({
        environmentUrl: z.string().url().describe("Dataverse environment URL, e.g. https://org.crm.dynamics.com"),
    }),
    call: async (_input, client) => client.get("/api/data/v9.2/EntityDefinitions", {
        "$select": "LogicalName,DisplayName,EntitySetName",
    }),
});
export const powerPlatformTools = [
    powerPlatform_listEnvironments,
    powerPlatform_listDlpPolicies,
    powerApps_listApps,
    powerAutomate_listFlows,
    dataverse_listTables,
];
//# sourceMappingURL=powerPlatform.js.map