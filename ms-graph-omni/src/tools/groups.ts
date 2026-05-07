/**
 * Groups (security, M365, distribution). App-only.
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, listRequest, makeTool, shapeListResponse } from "./_helpers.js";

export const groups_list = makeTool({
  name: "groups_list",
  description: "List groups in the directory. $filter examples: \"groupTypes/any(c:c eq 'Unified')\" for M365 groups, \"securityEnabled eq true\" for security groups. Returns nextPageToken; pass as `pageToken` to fetch more.",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) => shapeListResponse(await listRequest(client, "/groups", opts).get()),
});

export const groups_get = makeTool({
  name: "groups_get",
  description: "Get a single group by id.",
  mode: "app",
  inputSchema: z.object({
    groupId: z.string(),
    select: z.array(z.string()).optional(),
    expand: z.array(z.string()).optional(),
  }),
  call: async ({ groupId, select, expand }, client) => {
    let req = client.api(`/groups/${groupId}`);
    if (select?.length) req = req.select(select.join(","));
    if (expand?.length) req = req.expand(expand.join(","));
    return await req.get();
  },
});

export const groups_create = makeTool({
  name: "groups_create",
  description: "Create a group. Set groupType='M365' to create a Microsoft 365 group, 'security' for a security group, 'distribution' for a mail-enabled distribution list.",
  mode: "app",
  inputSchema: z.object({
    displayName: z.string(),
    mailNickname: z.string(),
    description: z.string().optional(),
    groupType: z.enum(["M365", "security", "distribution"]).default("security"),
    visibility: z.enum(["Private", "Public", "HiddenMembership"]).optional(),
    ownerIds: z.array(z.string()).optional(),
    memberIds: z.array(z.string()).optional(),
  }),
  call: async (input, client) => {
    const payload: any = {
      displayName: input.displayName,
      mailNickname: input.mailNickname,
      description: input.description,
    };
    if (input.groupType === "M365") {
      payload.groupTypes = ["Unified"];
      payload.mailEnabled = true;
      payload.securityEnabled = false;
    } else if (input.groupType === "distribution") {
      payload.groupTypes = [];
      payload.mailEnabled = true;
      payload.securityEnabled = false;
    } else {
      payload.groupTypes = [];
      payload.mailEnabled = false;
      payload.securityEnabled = true;
    }
    if (input.visibility) payload.visibility = input.visibility;
    if (input.ownerIds?.length) {
      payload["owners@odata.bind"] = input.ownerIds.map((id) => `https://graph.microsoft.com/v1.0/users/${id}`);
    }
    if (input.memberIds?.length) {
      payload["members@odata.bind"] = input.memberIds.map((id) => `https://graph.microsoft.com/v1.0/users/${id}`);
    }
    return await client.api("/groups").post(payload);
  },
});

export const groups_update = makeTool({
  name: "groups_update",
  description: "Patch group fields.",
  mode: "app",
  inputSchema: z.object({ groupId: z.string(), patch: z.record(z.string(), z.unknown()) }),
  call: async ({ groupId, patch }, client) => client.api(`/groups/${groupId}`).patch(patch),
});

export const groups_delete = makeTool({
  name: "groups_delete",
  description: "Soft-delete a group (recoverable for 30 days).",
  mode: "app",
  inputSchema: z.object({ groupId: z.string() }),
  call: async ({ groupId }, client) => {
    await client.api(`/groups/${groupId}`).delete();
    return { ok: true };
  },
});

export const groups_listMembers = makeTool({
  name: "groups_listMembers",
  description: "List members of a group.",
  mode: "app",
  inputSchema: ListOptionsSchema.extend({ groupId: z.string(), transitive: z.boolean().default(false) }),
  call: async ({ groupId, transitive, ...opts }, client) => {
    const path = transitive ? `/groups/${groupId}/transitiveMembers` : `/groups/${groupId}/members`;
    return shapeListResponse(await listRequest(client, path, opts).get());
  },
});

export const groups_addMember = makeTool({
  name: "groups_addMember",
  description: "Add a user (or another group) to a group as a member.",
  mode: "app",
  inputSchema: z.object({ groupId: z.string(), memberId: z.string() }),
  call: async ({ groupId, memberId }, client) => {
    await client.api(`/groups/${groupId}/members/$ref`).post({
      "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${memberId}`,
    });
    return { ok: true };
  },
});

export const groups_removeMember = makeTool({
  name: "groups_removeMember",
  description: "Remove a member from a group.",
  mode: "app",
  inputSchema: z.object({ groupId: z.string(), memberId: z.string() }),
  call: async ({ groupId, memberId }, client) => {
    await client.api(`/groups/${groupId}/members/${memberId}/$ref`).delete();
    return { ok: true };
  },
});

export const groups_listOwners = makeTool({
  name: "groups_listOwners",
  description: "List group owners.",
  mode: "app",
  inputSchema: z.object({ groupId: z.string() }),
  call: async ({ groupId }, client) => client.api(`/groups/${groupId}/owners`).get(),
});

export const groups_addOwner = makeTool({
  name: "groups_addOwner",
  description: "Add an owner to a group.",
  mode: "app",
  inputSchema: z.object({ groupId: z.string(), ownerId: z.string() }),
  call: async ({ groupId, ownerId }, client) => {
    await client.api(`/groups/${groupId}/owners/$ref`).post({
      "@odata.id": `https://graph.microsoft.com/v1.0/users/${ownerId}`,
    });
    return { ok: true };
  },
});

export const groupsTools = [
  groups_list,
  groups_get,
  groups_create,
  groups_update,
  groups_delete,
  groups_listMembers,
  groups_addMember,
  groups_removeMember,
  groups_listOwners,
  groups_addOwner,
];
