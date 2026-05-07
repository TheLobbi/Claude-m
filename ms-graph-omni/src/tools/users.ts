import { z } from "zod";
import { applyListOptions, ListOptionsSchema, listRequest, makeTool, shapeListResponse } from "./_helpers.js";

export const users_list = makeTool({
  name: "users_list",
  description: "List users in the directory. Supports filter, search, orderby. Common selects: id, displayName, mail, userPrincipalName, jobTitle, department, accountEnabled. Returns nextPageToken when more results exist; pass it as `pageToken` to fetch the next page.",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) => shapeListResponse(await listRequest(client, "/users", opts).get()),
});

export const users_get = makeTool({
  name: "users_get",
  description: "Get a single user by id or UPN.",
  mode: "app",
  inputSchema: z.object({
    user: z.string().describe("User id or UPN."),
    select: z.array(z.string()).optional(),
    expand: z.array(z.string()).optional(),
  }),
  call: async ({ user, select, expand }, client) => {
    let req = client.api(`/users/${user}`);
    if (select?.length) req = req.select(select.join(","));
    if (expand?.length) req = req.expand(expand.join(","));
    return await req.get();
  },
});

export const users_create = makeTool({
  name: "users_create",
  description: "Create a new user.",
  mode: "app",
  inputSchema: z.object({
    accountEnabled: z.boolean().default(true),
    displayName: z.string(),
    mailNickname: z.string(),
    userPrincipalName: z.string(),
    password: z.string(),
    forceChangePasswordNextSignIn: z.boolean().default(true),
    givenName: z.string().optional(),
    surname: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    usageLocation: z.string().optional(),
  }),
  call: async (input, client) => {
    const { password, forceChangePasswordNextSignIn, ...rest } = input;
    const payload = {
      ...rest,
      passwordProfile: { password, forceChangePasswordNextSignIn },
    };
    return await client.api("/users").post(payload);
  },
});

export const users_update = makeTool({
  name: "users_update",
  description: "Patch a user.",
  mode: "app",
  inputSchema: z.object({ user: z.string(), patch: z.record(z.string(), z.unknown()) }),
  call: async ({ user, patch }, client) => await client.api(`/users/${user}`).patch(patch),
});

export const users_delete = makeTool({
  name: "users_delete",
  description: "Soft-delete a user.",
  mode: "app",
  inputSchema: z.object({ user: z.string() }),
  call: async ({ user }, client) => {
    await client.api(`/users/${user}`).delete();
    return { ok: true };
  },
});

export const users_listManager = makeTool({
  name: "users_getManager",
  description: "Get the user's manager. Returns { manager: <obj> } or { manager: null, reason: 'not_set' } when no manager is assigned.",
  mode: "app",
  inputSchema: z.object({ user: z.string() }),
  call: async ({ user }, client) => {
    try {
      const manager = await client.api(`/users/${user}/manager`).get();
      return { manager };
    } catch (err: any) {
      const status = err?.statusCode ?? err?.status ?? err?.code;
      const isNotFound =
        status === 404 ||
        status === "Request_ResourceNotFound" ||
        /manager.*does not exist|not exist or one of its queried/i.test(err?.message ?? "");
      if (isNotFound) {
        return {
          manager: null,
          reason: "not_set",
          message: "User " + user + " has no manager assigned in Entra.",
        };
      }
      throw err;
    }
  },
});

export const users_listMemberOf = makeTool({
  name: "users_listMemberOf",
  description: "List groups the user is a direct member of.",
  mode: "app",
  inputSchema: z.object({ user: z.string(), transitive: z.boolean().default(false) }),
  call: async ({ user, transitive }, client) => {
    const path = transitive ? `/users/${user}/transitiveMemberOf` : `/users/${user}/memberOf`;
    return await client.api(path).get();
  },
});

export const users_assignLicense = makeTool({
  name: "users_assignLicense",
  description: "Assign or remove license SKUs from a user.",
  mode: "app",
  inputSchema: z.object({
    user: z.string(),
    addSkus: z.array(z.string()).default([]),
    removeSkus: z.array(z.string()).default([]),
    disabledServicePlans: z.array(z.string()).optional(),
  }),
  call: async ({ user, addSkus, removeSkus, disabledServicePlans }, client) => {
    return await client.api(`/users/${user}/assignLicense`).post({
      addLicenses: addSkus.map((skuId) => ({ skuId, disabledPlans: disabledServicePlans ?? [] })),
      removeLicenses: removeSkus,
    });
  },
});

export const users_listLicenses = makeTool({
  name: "users_listLicenses",
  description: "List license details for a user.",
  mode: "app",
  inputSchema: z.object({ user: z.string() }),
  call: async ({ user }, client) => client.api(`/users/${user}/licenseDetails`).get(),
});

export const users_resetPassword = makeTool({
  name: "users_resetPassword",
  description: "Reset a user's password (admin action).",
  mode: "app",
  inputSchema: z.object({
    user: z.string(),
    newPassword: z.string(),
    forceChangeNextSignIn: z.boolean().default(true),
  }),
  call: async ({ user, newPassword, forceChangeNextSignIn }, client) => {
    await client.api(`/users/${user}`).patch({
      passwordProfile: { password: newPassword, forceChangePasswordNextSignIn: forceChangeNextSignIn },
    });
    return { ok: true };
  },
});

export const usersTools = [
  users_list,
  users_get,
  users_create,
  users_update,
  users_delete,
  users_listManager,
  users_listMemberOf,
  users_assignLicense,
  users_listLicenses,
  users_resetPassword,
];
