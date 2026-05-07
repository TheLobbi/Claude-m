import { z } from "zod";
import { makeResourceTool } from "./_resource.js";
const ARM_RESOURCE = "https://management.azure.com";
const ARM_BASE = "https://management.azure.com";
const ARM_API_VERSION = "2022-12-01";
export const azure_listSubscriptions = makeResourceTool({
    name: "azure_listSubscriptions",
    description: "List Azure subscriptions visible to the service principal.",
    namespace: "azure-ops",
    resource: ARM_RESOURCE,
    baseUrl: ARM_BASE,
    inputSchema: z.object({}),
    call: async (_input, client) => client.get("/subscriptions", { "api-version": ARM_API_VERSION }),
});
export const azure_listResourceGroups = makeResourceTool({
    name: "azure_listResourceGroups",
    description: "List Azure resource groups in a subscription.",
    namespace: "azure-ops",
    resource: ARM_RESOURCE,
    baseUrl: ARM_BASE,
    inputSchema: z.object({ subscriptionId: z.string() }),
    call: async ({ subscriptionId }, client) => client.get(`/subscriptions/${subscriptionId}/resourcegroups`, { "api-version": "2021-04-01" }),
});
export const azure_listResources = makeResourceTool({
    name: "azure_listResources",
    description: "List Azure resources in a subscription or resource group.",
    namespace: "azure-ops",
    resource: ARM_RESOURCE,
    baseUrl: ARM_BASE,
    inputSchema: z.object({
        subscriptionId: z.string(),
        resourceGroupName: z.string().optional(),
    }),
    call: async ({ subscriptionId, resourceGroupName }, client) => {
        const path = resourceGroupName
            ? `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/resources`
            : `/subscriptions/${subscriptionId}/resources`;
        return client.get(path, { "api-version": "2021-04-01" });
    },
});
export const azureTools = [
    azure_listSubscriptions,
    azure_listResourceGroups,
    azure_listResources,
];
//# sourceMappingURL=azureOps.js.map