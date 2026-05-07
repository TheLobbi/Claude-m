import { z } from "zod";
import { makeResourceTool } from "./_resource.js";
const OMI_RESOURCE = "https://manage.office.com";
const OmiContentTypeSchema = z.enum([
    "Audit.AzureActiveDirectory",
    "Audit.Exchange",
    "Audit.SharePoint",
    "Audit.General",
    "DLP.All",
]);
export const omi_startSubscription = makeResourceTool({
    name: "omi_startSubscription",
    description: "Start an Office Management Activity API subscription for an audit content type.",
    namespace: "audit",
    resource: OMI_RESOURCE,
    baseUrl: OMI_RESOURCE,
    inputSchema: z.object({ contentType: OmiContentTypeSchema }),
    call: async ({ contentType }, client, tenant) => client.post(`/api/v1.0/${tenant.tenantId}/activity/feed/subscriptions/start`, undefined, {
        query: { contentType },
    }),
});
export const omi_listSubscriptions = makeResourceTool({
    name: "omi_listSubscriptions",
    description: "List Office Management Activity API subscriptions for the tenant.",
    namespace: "audit",
    resource: OMI_RESOURCE,
    baseUrl: OMI_RESOURCE,
    inputSchema: z.object({}),
    call: async (_input, client, tenant) => client.get(`/api/v1.0/${tenant.tenantId}/activity/feed/subscriptions/list`),
});
export const omi_listContent = makeResourceTool({
    name: "omi_listContent",
    description: "List available Office Management Activity API content blobs by type and time range.",
    namespace: "audit",
    resource: OMI_RESOURCE,
    baseUrl: OMI_RESOURCE,
    inputSchema: z.object({
        contentType: OmiContentTypeSchema,
        startTime: z.string(),
        endTime: z.string(),
    }),
    call: async ({ contentType, startTime, endTime }, client, tenant) => client.get(`/api/v1.0/${tenant.tenantId}/activity/feed/subscriptions/content`, {
        contentType,
        startTime,
        endTime,
    }),
});
export const omi_getContent = makeResourceTool({
    name: "omi_getContent",
    description: "Fetch an Office Management Activity API content blob by contentUri.",
    namespace: "audit",
    resource: OMI_RESOURCE,
    baseUrl: OMI_RESOURCE,
    inputSchema: z.object({ contentUri: z.string().url() }),
    call: async ({ contentUri }, client) => client.get(contentUri),
});
export const omiTools = [
    omi_startSubscription,
    omi_listSubscriptions,
    omi_listContent,
    omi_getContent,
];
//# sourceMappingURL=omi.js.map