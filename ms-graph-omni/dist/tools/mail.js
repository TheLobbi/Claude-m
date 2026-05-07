/**
 * Outlook mail tools. Default delegated (acts as the signed-in user). Use `userId` to
 * target a specific mailbox in app-only mode (admin scenarios).
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, listRequest, makeTool, shapeListResponse } from "./_helpers.js";
const userTarget = z
    .string()
    .optional()
    .describe("Target mailbox UPN or id (e.g. user@thelobbi.io). Omit for /me (delegated).");
export const mail_listMessages = makeTool({
    name: "mail_listMessages",
    description: "List messages in the user's mailbox. Defaults to inbox; supports filtering by folder, sender, subject, importance, etc. via $filter.",
    mode: "delegated",
    inputSchema: ListOptionsSchema.extend({
        user: userTarget,
        folderId: z.string().optional().describe("Folder id (well-known: 'inbox', 'sentitems', 'drafts', 'archive', 'deleteditems'). Defaults to inbox."),
    }),
    call: async ({ user, folderId, ...opts }, client) => {
        const base = user ? `/users/${user}` : "/me";
        const folder = folderId ?? "inbox";
        const response = await listRequest(client, `${base}/mailFolders/${folder}/messages`, opts).get();
        return shapeListResponse(response);
    },
});
// Slim default $select keeps responses under the MCP token cap. The full
// message body can blow past 25 kB for a single message, so we project
// down to headers + bodyPreview by default.
const DEFAULT_MESSAGE_SELECT = [
    "id",
    "subject",
    "from",
    "toRecipients",
    "ccRecipients",
    "receivedDateTime",
    "sentDateTime",
    "bodyPreview",
    "hasAttachments",
    "importance",
    "isRead",
    "webLink",
    "conversationId",
];
export const mail_searchMessages = makeTool({
    name: "mail_searchMessages",
    description: "Search messages across the user's mailbox by KQL query (e.g. 'subject:invoice from:ar@vendor.com'). Faster than \$filter for full-text. KQL property restrictions (subject:, from:, body:, hasAttachment:, etc.) are wrapped in quotes server-side so colon-form queries work as written. Defaults to top=25 and a slim \$select projection (id, subject, from, recipients, receivedDateTime, bodyPreview, ...) to stay under the MCP token cap. Pass \`select: []\` to disable the projection or fetch full bodies via mail_getMessage.",
    mode: "delegated",
    inputSchema: z.object({
        query: z.string().describe("KQL search query (e.g. 'subject:invoice', 'from:user@x.com', 'body:budget AND received>2026-01-01')."),
        user: userTarget,
        top: z.number().int().min(1).max(250).default(25),
        select: z
            .array(z.string())
            .optional()
            .describe("Override the default \$select projection. Pass [] to disable and fetch full message objects."),
    }),
    call: async ({ query, user, top, select }, client) => {
        const base = user ? `/users/${user}` : "/me";
        // Graph's $search expects a quoted KQL value, e.g. $search="subject:SOTU".
        // The Graph SDK's .search() helper does NOT add the surrounding quotes,
        // so colon-form property restrictions like 'subject:SOTU' fail with
        // "Syntax error: character ':' is not valid at position N". Wrap the
        // query ourselves and escape any embedded double-quotes.
        const wrapped = /^".*"$/.test(query) ? query : `"${query.replace(/"/g, '\\"')}"`;
        let req = client
            .api(`${base}/messages`)
            .search(wrapped)
            .top(top)
            .header("ConsistencyLevel", "eventual");
        const effectiveSelect = select === undefined ? DEFAULT_MESSAGE_SELECT : select;
        if (effectiveSelect.length > 0) {
            req = req.select(effectiveSelect.join(","));
        }
        return await req.get();
    },
});
export const mail_getMessage = makeTool({
    name: "mail_getMessage",
    description: "Get a single message by id, including body, attachments metadata, headers.",
    mode: "delegated",
    inputSchema: z.object({
        messageId: z.string(),
        user: userTarget,
        expand: z.array(z.string()).optional().describe("Expand attachments, mentions, etc."),
    }),
    call: async ({ messageId, user, expand }, client) => {
        const base = user ? `/users/${user}` : "/me";
        let req = client.api(`${base}/messages/${messageId}`);
        if (expand?.length)
            req = req.expand(expand.join(","));
        return await req.get();
    },
});
export const mail_sendMail = makeTool({
    name: "mail_sendMail",
    description: "Compose and send an email immediately. Supports HTML body, multiple recipients, CC/BCC, attachments (base64).",
    mode: "delegated",
    inputSchema: z.object({
        user: userTarget,
        to: z.array(z.string()).describe("To recipients (email addresses)."),
        cc: z.array(z.string()).optional(),
        bcc: z.array(z.string()).optional(),
        subject: z.string(),
        body: z.string().describe("Email body."),
        bodyType: z.enum(["text", "html"]).default("html"),
        saveToSentItems: z.boolean().default(true),
        attachments: z
            .array(z.object({
            name: z.string(),
            contentBase64: z.string(),
            contentType: z.string().default("application/octet-stream"),
        }))
            .optional(),
        replyTo: z.array(z.string()).optional(),
    }),
    call: async ({ user, to, cc, bcc, subject, body, bodyType, saveToSentItems, attachments, replyTo }, client) => {
        const base = user ? `/users/${user}` : "/me";
        const message = {
            subject,
            body: { contentType: bodyType, content: body },
            toRecipients: to.map((a) => ({ emailAddress: { address: a } })),
        };
        if (cc?.length)
            message.ccRecipients = cc.map((a) => ({ emailAddress: { address: a } }));
        if (bcc?.length)
            message.bccRecipients = bcc.map((a) => ({ emailAddress: { address: a } }));
        if (replyTo?.length)
            message.replyTo = replyTo.map((a) => ({ emailAddress: { address: a } }));
        if (attachments?.length) {
            message.attachments = attachments.map((a) => ({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: a.name,
                contentType: a.contentType,
                contentBytes: a.contentBase64,
            }));
        }
        await client.api(`${base}/sendMail`).post({ message, saveToSentItems });
        return { ok: true };
    },
});
export const mail_createDraft = makeTool({
    name: "mail_createDraft",
    description: "Create a draft message (does not send). Returns the draft id so it can be edited or sent later.",
    mode: "delegated",
    inputSchema: z.object({
        user: userTarget,
        to: z.array(z.string()).optional(),
        cc: z.array(z.string()).optional(),
        bcc: z.array(z.string()).optional(),
        subject: z.string(),
        body: z.string(),
        bodyType: z.enum(["text", "html"]).default("html"),
    }),
    call: async ({ user, ...rest }, client) => {
        const base = user ? `/users/${user}` : "/me";
        const payload = {
            subject: rest.subject,
            body: { contentType: rest.bodyType, content: rest.body },
        };
        if (rest.to?.length)
            payload.toRecipients = rest.to.map((a) => ({ emailAddress: { address: a } }));
        if (rest.cc?.length)
            payload.ccRecipients = rest.cc.map((a) => ({ emailAddress: { address: a } }));
        if (rest.bcc?.length)
            payload.bccRecipients = rest.bcc.map((a) => ({ emailAddress: { address: a } }));
        return await client.api(`${base}/messages`).post(payload);
    },
});
export const mail_replyMessage = makeTool({
    name: "mail_replyMessage",
    description: "Reply to a message. Set replyAll=true to reply to all recipients.",
    mode: "delegated",
    inputSchema: z.object({
        messageId: z.string(),
        comment: z.string().describe("Body content to add to the reply."),
        replyAll: z.boolean().default(false),
        user: userTarget,
    }),
    call: async ({ messageId, comment, replyAll, user }, client) => {
        const base = user ? `/users/${user}` : "/me";
        const action = replyAll ? "replyAll" : "reply";
        await client.api(`${base}/messages/${messageId}/${action}`).post({ comment });
        return { ok: true };
    },
});
export const mail_forwardMessage = makeTool({
    name: "mail_forwardMessage",
    description: "Forward a message to one or more recipients with an optional comment.",
    mode: "delegated",
    inputSchema: z.object({
        messageId: z.string(),
        to: z.array(z.string()),
        comment: z.string().optional(),
        user: userTarget,
    }),
    call: async ({ messageId, to, comment, user }, client) => {
        const base = user ? `/users/${user}` : "/me";
        await client.api(`${base}/messages/${messageId}/forward`).post({
            comment: comment ?? "",
            toRecipients: to.map((a) => ({ emailAddress: { address: a } })),
        });
        return { ok: true };
    },
});
export const mail_moveMessage = makeTool({
    name: "mail_moveMessage",
    description: "Move a message to a different folder. destinationId can be a well-known name ('archive', 'inbox', 'deleteditems') or a folder id.",
    mode: "delegated",
    inputSchema: z.object({
        messageId: z.string(),
        destinationId: z.string(),
        user: userTarget,
    }),
    call: async ({ messageId, destinationId, user }, client) => {
        const base = user ? `/users/${user}` : "/me";
        return await client.api(`${base}/messages/${messageId}/move`).post({ destinationId });
    },
});
export const mail_deleteMessage = makeTool({
    name: "mail_deleteMessage",
    description: "Delete a message (move to Deleted Items). Use mail_moveMessage with 'deleteditems' for soft delete; this is hard.",
    mode: "delegated",
    inputSchema: z.object({
        messageId: z.string(),
        user: userTarget,
    }),
    call: async ({ messageId, user }, client) => {
        const base = user ? `/users/${user}` : "/me";
        await client.api(`${base}/messages/${messageId}`).delete();
        return { ok: true };
    },
});
export const mail_listFolders = makeTool({
    name: "mail_listFolders",
    description: "List mail folders for the user (Inbox, Sent Items, custom folders, etc.).",
    mode: "delegated",
    inputSchema: ListOptionsSchema.extend({
        user: userTarget,
        includeHidden: z.boolean().default(false),
    }),
    call: async ({ user, includeHidden, ...opts }, client) => {
        const base = user ? `/users/${user}` : "/me";
        let req = applyListOptions(client.api(`${base}/mailFolders`), opts);
        if (includeHidden)
            req = req.query({ includeHiddenFolders: "true" });
        return await req.get();
    },
});
export const mailTools = [
    mail_listMessages,
    mail_searchMessages,
    mail_getMessage,
    mail_sendMail,
    mail_createDraft,
    mail_replyMessage,
    mail_forwardMessage,
    mail_moveMessage,
    mail_deleteMessage,
    mail_listFolders,
];
//# sourceMappingURL=mail.js.map