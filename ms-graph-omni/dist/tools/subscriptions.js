/**
 * Microsoft Graph subscription (change-notification) management.
 *
 * Endpoints:  /subscriptions
 * Permissions: surface-specific (Mail.Read for messages, Calendars.Read for events,
 *              Files.ReadWrite.All for driveItem, Group.Read.All for groups, etc.).
 *
 * A subscription needs:
 *   - resource:                   what to watch (e.g. "/me/messages")
 *   - changeType:                 created,updated,deleted
 *   - notificationUrl:            HTTPS endpoint Graph POSTs to
 *   - lifecycleNotificationUrl:   HTTPS endpoint for reauth/missed/removed
 *   - expirationDateTime:         max ~3 days for most resources, 60min for chats; renew before expiry
 *   - clientState:                random string we echo back to verify authenticity
 *
 * On creation, Graph performs a synchronous validation handshake against
 * notificationUrl: it sends `?validationToken=<random>` and expects a 200 with
 * the token echoed in the body within 10s. Our webhook receiver
 * (src/streaming/webhookReceiver.ts) handles this.
 *
 * Source:
 *   https://learn.microsoft.com/graph/api/resources/subscription
 *   https://learn.microsoft.com/graph/change-notifications-overview
 */
import { z } from "zod";
import { listRequest, ListOptionsSchema, makeTool, shapeListResponse } from "./_helpers.js";
import { randomUUID } from "node:crypto";
/* ------------------------------------------------------------------ list / get */
export const subscriptions_list = makeTool({
    name: "subscriptions_list",
    description: "List active change-notification subscriptions visible to the calling app/user. " +
        "Includes notificationUrl, resource path, expirationDateTime, applicationId, and clientState.",
    mode: "app",
    inputSchema: ListOptionsSchema.extend({
        tenantSlug: z.string().optional(),
    }),
    call: async (opts, client) => {
        return shapeListResponse(await listRequest(client, "/subscriptions", opts).get());
    },
});
export const subscriptions_get = makeTool({
    name: "subscriptions_get",
    description: "Get a single subscription by id.",
    mode: "app",
    inputSchema: z.object({
        subscriptionId: z.string(),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ subscriptionId }, client) => {
        return await client.api(`/subscriptions/${subscriptionId}`).get();
    },
});
/* ------------------------------------------------------------------ create */
const RESOURCE_PRESETS = z
    .enum([
    "me/messages",
    "me/mailFolders/inbox/messages",
    "me/events",
    "me/drive/root",
    "me/contacts",
    "me/chats/getAllMessages",
    "groups",
    "users",
    "callRecords",
])
    .describe("Common resource paths. Pick one of these or pass a custom string in `resource` — the preset is just a hint.");
export const subscriptions_create = makeTool({
    name: "subscriptions_create",
    description: "Create a change-notification subscription. " +
        "Graph synchronously validates the notificationUrl by sending GET ?validationToken=...; the receiver must reply 200 with the token in 10s. " +
        "Use src/streaming/webhookReceiver.ts (run via `pnpm receiver`) and expose it via Cloudflare Tunnel / ngrok / Azure Function. " +
        "expirationDateTime caps at ~71 hours for most resources (3 days), 1 hour for chat messages — adjust accordingly.",
    mode: "app",
    inputSchema: z.object({
        resource: z.string().describe("Graph resource path, e.g. '/me/messages' or '/users/{id}/events'."),
        resourcePreset: RESOURCE_PRESETS.optional().describe("Helper enum surfacing common resource paths. The `resource` field still wins."),
        changeType: z
            .enum(["created", "updated", "deleted", "created,updated", "created,updated,deleted"])
            .default("created,updated"),
        notificationUrl: z
            .string()
            .url()
            .describe("HTTPS endpoint to receive notifications. Must validate within 10s of subscription creation."),
        lifecycleNotificationUrl: z
            .string()
            .url()
            .optional()
            .describe("HTTPS endpoint for reauthorizationRequired / missed / subscriptionRemoved notifications. STRONGLY recommended for long-lived subscriptions."),
        expirationDateTime: z
            .string()
            .optional()
            .describe("ISO 8601. Max ~71h for most resources, 1h for chatMessage. Default: 60h from now (safe for mail/event/drive)."),
        clientState: z
            .string()
            .optional()
            .describe("Random string echoed back in every notification. Use to verify authenticity. Auto-generated when omitted (UUID)."),
        includeResourceData: z
            .boolean()
            .default(false)
            .describe("If true, Graph encrypts and includes the resource payload in each notification (Outlook + Teams only). Requires encryptionCertificate + encryptionCertificateId."),
        encryptionCertificate: z
            .string()
            .optional()
            .describe("Base64 PEM cert (when includeResourceData=true)."),
        encryptionCertificateId: z.string().optional().describe("Id you assigned to the cert."),
        tenantSlug: z.string().optional(),
    }),
    call: async (input, client) => {
        const expirationDateTime = input.expirationDateTime ??
            new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString(); // 60h default
        const clientState = input.clientState ?? randomUUID();
        const payload = {
            changeType: input.changeType,
            notificationUrl: input.notificationUrl,
            resource: input.resource,
            expirationDateTime,
            clientState,
        };
        if (input.lifecycleNotificationUrl)
            payload.lifecycleNotificationUrl = input.lifecycleNotificationUrl;
        if (input.includeResourceData) {
            payload.includeResourceData = true;
            if (!input.encryptionCertificate || !input.encryptionCertificateId) {
                throw new Error("includeResourceData=true requires encryptionCertificate + encryptionCertificateId.");
            }
            payload.encryptionCertificate = input.encryptionCertificate;
            payload.encryptionCertificateId = input.encryptionCertificateId;
        }
        return await client.api("/subscriptions").post(payload);
    },
});
/* ------------------------------------------------------------------ renew */
export const subscriptions_renew = makeTool({
    name: "subscriptions_renew",
    description: "Extend a subscription's expirationDateTime. Required before each subscription expires (within ~71h). " +
        "Default: extend by 60h from now. Pair with the lifecycleNotificationUrl `reauthorizationRequired` event for production renewal cadence.",
    mode: "app",
    inputSchema: z.object({
        subscriptionId: z.string(),
        expirationDateTime: z
            .string()
            .optional()
            .describe("ISO 8601. Default: now + 60h."),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ subscriptionId, expirationDateTime }, client) => {
        const exp = expirationDateTime ?? new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString();
        return await client.api(`/subscriptions/${subscriptionId}`).patch({ expirationDateTime: exp });
    },
});
/* ------------------------------------------------------------------ delete */
export const subscriptions_delete = makeTool({
    name: "subscriptions_delete",
    description: "Delete a change-notification subscription. Graph stops sending notifications immediately.",
    mode: "app",
    inputSchema: z.object({
        subscriptionId: z.string(),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ subscriptionId }, client) => {
        await client.api(`/subscriptions/${subscriptionId}`).delete();
        return { ok: true };
    },
});
export const subscriptionsTools = [
    subscriptions_list,
    subscriptions_get,
    subscriptions_create,
    subscriptions_renew,
    subscriptions_delete,
];
//# sourceMappingURL=subscriptions.js.map