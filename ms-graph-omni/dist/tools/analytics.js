import { z } from "zod";
import { makeResourceTool } from "./_resource.js";
export const powerbi_listWorkspaces = makeResourceTool({
    name: "powerbi_listWorkspaces",
    description: "List Power BI workspaces available to the service principal.",
    namespace: "analytics",
    resource: "https://analysis.windows.net/powerbi/api",
    baseUrl: "https://api.powerbi.com",
    inputSchema: z.object({}),
    call: async (_input, client) => client.get("/v1.0/myorg/groups"),
});
export const powerbi_listReports = makeResourceTool({
    name: "powerbi_listReports",
    description: "List Power BI reports in a workspace.",
    namespace: "analytics",
    resource: "https://analysis.windows.net/powerbi/api",
    baseUrl: "https://api.powerbi.com",
    inputSchema: z.object({ workspaceId: z.string() }),
    call: async ({ workspaceId }, client) => client.get(`/v1.0/myorg/groups/${workspaceId}/reports`),
});
export const powerbi_listDatasets = makeResourceTool({
    name: "powerbi_listDatasets",
    description: "List Power BI semantic models/datasets in a workspace.",
    namespace: "analytics",
    resource: "https://analysis.windows.net/powerbi/api",
    baseUrl: "https://api.powerbi.com",
    inputSchema: z.object({ workspaceId: z.string() }),
    call: async ({ workspaceId }, client) => client.get(`/v1.0/myorg/groups/${workspaceId}/datasets`),
});
export const fabric_listWorkspaces = makeResourceTool({
    name: "fabric_listWorkspaces",
    description: "List Microsoft Fabric workspaces available to the service principal.",
    namespace: "analytics",
    resource: "https://api.fabric.microsoft.com",
    baseUrl: "https://api.fabric.microsoft.com",
    inputSchema: z.object({}),
    call: async (_input, client) => client.get("/v1/workspaces"),
});
export const fabric_listItems = makeResourceTool({
    name: "fabric_listItems",
    description: "List Microsoft Fabric items in a workspace.",
    namespace: "analytics",
    resource: "https://api.fabric.microsoft.com",
    baseUrl: "https://api.fabric.microsoft.com",
    inputSchema: z.object({ workspaceId: z.string() }),
    call: async ({ workspaceId }, client) => client.get(`/v1/workspaces/${workspaceId}/items`),
});
export const analyticsTools = [
    powerbi_listWorkspaces,
    powerbi_listReports,
    powerbi_listDatasets,
    fabric_listWorkspaces,
    fabric_listItems,
];
//# sourceMappingURL=analytics.js.map