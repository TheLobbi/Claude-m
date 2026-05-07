/**
 * Teams + Channels + Chats. Mix of app-only (tenant-wide) and delegated (act-as-user).
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, makeTool } from "./_helpers.js";
// ============================================================================ Teams
export const teams_list = makeTool({
    name: "teams_list",
    description: "List all teams in the tenant (Microsoft 365 groups with a team).",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => applyListOptions(client.api("/teams"), opts).get(),
});
export const teams_get = makeTool({
    name: "teams_get",
    description: "Get a single team by id including settings.",
    mode: "app",
    inputSchema: z.object({ teamId: z.string() }),
    call: async ({ teamId }, client) => client.api(`/teams/${teamId}`).get(),
});
export const teams_create = makeTool({
    name: "teams_create",
    description: "Create a new team. Backed by an M365 group; Graph creates both. Use teamTemplate='standard' (default), 'educationClass', etc.",
    mode: "app",
    inputSchema: z.object({
        displayName: z.string(),
        description: z.string().optional(),
        teamTemplate: z.string().default("standard"),
        visibility: z.enum(["public", "private"]).default("private"),
        ownerIds: z.array(z.string()).min(1).describe("At least one user id required."),
    }),
    call: async ({ displayName, description, teamTemplate, visibility, ownerIds }, client) => {
        const payload = {
            "template@odata.bind": `https://graph.microsoft.com/v1.0/teamsTemplates('${teamTemplate}')`,
            displayName,
            description,
            visibility,
            members: ownerIds.map((id) => ({
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                roles: ["owner"],
                "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${id}')`,
            })),
        };
        return await client.api("/teams").post(payload);
    },
});
export const teams_archive = makeTool({
    name: "teams_archive",
    description: "Archive (or unarchive) a team. Archived teams are read-only.",
    mode: "app",
    inputSchema: z.object({ teamId: z.string(), unarchive: z.boolean().default(false) }),
    call: async ({ teamId, unarchive }, client) => {
        await client.api(`/teams/${teamId}/${unarchive ? "unarchive" : "archive"}`).post({});
        return { ok: true };
    },
});
// ============================================================================ Channels
// Note: Graph's /teams/{id}/channels endpoint does NOT support $top — the
// service rejects it with "Query option 'Top' is not allowed". Channels lists
// are tiny (rarely more than a few dozen per team) so we just omit `top`
// from the schema rather than silently strip it.
export const teams_listChannels = makeTool({
    name: "teams_listChannels",
    description: "List channels in a team (standard, private, shared). Pagination is not supported by Graph on this endpoint; the response includes all channels.",
    mode: "app",
    inputSchema: ListOptionsSchema.omit({ top: true }).extend({ teamId: z.string() }),
    call: async ({ teamId, ...opts }, client) => applyListOptions(client.api(`/teams/${teamId}/channels`), opts).get(),
});
export const teams_createChannel = makeTool({
    name: "teams_createChannel",
    description: "Create a channel in a team. membershipType: 'standard' | 'private' | 'shared'.",
    mode: "app",
    inputSchema: z.object({
        teamId: z.string(),
        displayName: z.string(),
        description: z.string().optional(),
        membershipType: z.enum(["standard", "private", "shared"]).default("standard"),
    }),
    call: async ({ teamId, displayName, description, membershipType }, client) => client.api(`/teams/${teamId}/channels`).post({ displayName, description, membershipType }),
});
export const teams_listChannelMessages = makeTool({
    name: "teams_listChannelMessages",
    description: "List messages in a channel. Top-level only (use teams_listMessageReplies for thread replies).",
    mode: "app",
    inputSchema: ListOptionsSchema.extend({ teamId: z.string(), channelId: z.string() }),
    call: async ({ teamId, channelId, ...opts }, client) => applyListOptions(client.api(`/teams/${teamId}/channels/${channelId}/messages`), opts).get(),
});
export const teams_sendChannelMessage = makeTool({
    name: "teams_sendChannelMessage",
    description: "Post a message to a channel. Mentions array uses 0-indexed positions referenced in body via <at id='0'>...</at>.",
    mode: "delegated",
    inputSchema: z.object({
        teamId: z.string(),
        channelId: z.string(),
        body: z.string(),
        bodyType: z.enum(["text", "html"]).default("html"),
        subject: z.string().optional(),
        importance: z.enum(["normal", "high", "urgent"]).optional(),
        mentions: z
            .array(z.object({
            id: z.number().int(),
            mentionText: z.string(),
            userId: z.string(),
            userDisplayName: z.string().optional(),
        }))
            .optional(),
    }),
    call: async ({ teamId, channelId, body, bodyType, subject, importance, mentions }, client) => {
        const payload = {
            body: { content: body, contentType: bodyType },
        };
        if (subject)
            payload.subject = subject;
        if (importance)
            payload.importance = importance;
        if (mentions?.length) {
            payload.mentions = mentions.map((m) => ({
                id: m.id,
                mentionText: m.mentionText,
                mentioned: {
                    user: {
                        id: m.userId,
                        displayName: m.userDisplayName,
                        userIdentityType: "aadUser",
                    },
                },
            }));
        }
        return await client.api(`/teams/${teamId}/channels/${channelId}/messages`).post(payload);
    },
});
export const teams_replyToChannelMessage = makeTool({
    name: "teams_replyToChannelMessage",
    description: "Reply to an existing channel message (creates a thread reply).",
    mode: "delegated",
    inputSchema: z.object({
        teamId: z.string(),
        channelId: z.string(),
        messageId: z.string(),
        body: z.string(),
        bodyType: z.enum(["text", "html"]).default("html"),
    }),
    call: async ({ teamId, channelId, messageId, body, bodyType }, client) => {
        return await client.api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`).post({
            body: { content: body, contentType: bodyType },
        });
    },
});
// ============================================================================ Chats
export const teams_listChats = makeTool({
    name: "teams_listChats",
    description: "List the user's chats (1:1 and group chats).",
    mode: "delegated",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => applyListOptions(client.api("/me/chats"), opts).get(),
});
export const teams_sendChatMessage = makeTool({
    name: "teams_sendChatMessage",
    description: "Send a message in a 1:1 or group chat.",
    mode: "delegated",
    inputSchema: z.object({
        chatId: z.string(),
        body: z.string(),
        bodyType: z.enum(["text", "html"]).default("html"),
    }),
    call: async ({ chatId, body, bodyType }, client) => client.api(`/chats/${chatId}/messages`).post({ body: { content: body, contentType: bodyType } }),
});
export const teams_createChat = makeTool({
    name: "teams_createChat",
    description: "Create a chat with one or more users. chatType='oneOnOne' for 2-person, 'group' for 3+.",
    mode: "delegated",
    inputSchema: z.object({
        chatType: z.enum(["oneOnOne", "group"]),
        userIds: z.array(z.string()).min(1).describe("Other participants (do NOT include yourself; you are auto-added)."),
        topic: z.string().optional().describe("Group chat name."),
    }),
    call: async ({ chatType, userIds, topic }, client) => {
        const me = await client.api("/me").select("id").get();
        const members = [me.id, ...userIds].map((id) => ({
            "@odata.type": "#microsoft.graph.aadUserConversationMember",
            roles: ["owner"],
            "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${id}')`,
        }));
        const payload = { chatType, members };
        if (topic)
            payload.topic = topic;
        return await client.api("/chats").post(payload);
    },
});
export const teamsTools = [
    teams_list,
    teams_get,
    teams_create,
    teams_archive,
    teams_listChannels,
    teams_createChannel,
    teams_listChannelMessages,
    teams_sendChannelMessage,
    teams_replyToChannelMessage,
    teams_listChats,
    teams_sendChatMessage,
    teams_createChat,
];
//# sourceMappingURL=teams.js.map