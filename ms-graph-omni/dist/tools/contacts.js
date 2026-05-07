/**
 * Outlook contacts.
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, makeTool } from "./_helpers.js";
const userTarget = z.string().optional();
export const contacts_list = makeTool({
    name: "contacts_list",
    description: "List the user's Outlook contacts.",
    mode: "delegated",
    inputSchema: ListOptionsSchema.extend({ user: userTarget }),
    call: async ({ user, ...opts }, client) => {
        const base = user ? `/users/${user}` : "/me";
        return await applyListOptions(client.api(`${base}/contacts`), opts).get();
    },
});
export const contacts_get = makeTool({
    name: "contacts_get",
    description: "Get a single contact by id.",
    mode: "delegated",
    inputSchema: z.object({ contactId: z.string(), user: userTarget }),
    call: async ({ contactId, user }, client) => {
        const base = user ? `/users/${user}` : "/me";
        return await client.api(`${base}/contacts/${contactId}`).get();
    },
});
export const contacts_create = makeTool({
    name: "contacts_create",
    description: "Create a new contact.",
    mode: "delegated",
    inputSchema: z.object({
        user: userTarget,
        givenName: z.string().optional(),
        surname: z.string().optional(),
        displayName: z.string().optional(),
        emailAddresses: z.array(z.object({ address: z.string(), name: z.string().optional() })).optional(),
        businessPhones: z.array(z.string()).optional(),
        mobilePhone: z.string().optional(),
        companyName: z.string().optional(),
        jobTitle: z.string().optional(),
    }),
    call: async ({ user, ...payload }, client) => {
        const base = user ? `/users/${user}` : "/me";
        return await client.api(`${base}/contacts`).post(payload);
    },
});
export const contacts_update = makeTool({
    name: "contacts_update",
    description: "Update fields on a contact.",
    mode: "delegated",
    inputSchema: z.object({
        contactId: z.string(),
        user: userTarget,
        patch: z.record(z.string(), z.unknown()).describe("Fields to update."),
    }),
    call: async ({ contactId, user, patch }, client) => {
        const base = user ? `/users/${user}` : "/me";
        return await client.api(`${base}/contacts/${contactId}`).patch(patch);
    },
});
export const contacts_delete = makeTool({
    name: "contacts_delete",
    description: "Delete a contact.",
    mode: "delegated",
    inputSchema: z.object({ contactId: z.string(), user: userTarget }),
    call: async ({ contactId, user }, client) => {
        const base = user ? `/users/${user}` : "/me";
        await client.api(`${base}/contacts/${contactId}`).delete();
        return { ok: true };
    },
});
export const contactsTools = [contacts_list, contacts_get, contacts_create, contacts_update, contacts_delete];
//# sourceMappingURL=contacts.js.map