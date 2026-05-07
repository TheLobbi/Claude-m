/**
 * Entra (Azure AD) admin tools — apps, conditional access, auth methods, directory roles,
 * licenses, audit/sign-in logs, devices, organization.
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, listRequest, makeTool, shapeListResponse } from "./_helpers.js";

// ============================================================ App registrations
export const entra_listApplications = makeTool({
  name: "entra_listApplications",
  description: "List Entra application registrations.",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) => applyListOptions(client.api("/applications"), opts).get(),
});

export const entra_getApplication = makeTool({
  name: "entra_getApplication",
  description: "Get an Entra application by appId or objectId.",
  mode: "app",
  inputSchema: z.object({ appId: z.string().describe("Use objectId; or pass appId in $filter form.") }),
  call: async ({ appId }, client) => client.api(`/applications/${appId}`).get(),
});

export const entra_listServicePrincipals = makeTool({
  name: "entra_listServicePrincipals",
  description: "List service principals (enterprise apps).",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) => applyListOptions(client.api("/servicePrincipals"), opts).get(),
});

// ============================================================ Conditional Access
export const entra_listConditionalAccessPolicies = makeTool({
  name: "entra_listConditionalAccessPolicies",
  description: "List conditional access policies.",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) =>
    applyListOptions(client.api("/identity/conditionalAccess/policies"), opts).get(),
});

export const entra_getConditionalAccessPolicy = makeTool({
  name: "entra_getConditionalAccessPolicy",
  description: "Get a single CA policy by id.",
  mode: "app",
  inputSchema: z.object({ policyId: z.string() }),
  call: async ({ policyId }, client) =>
    client.api(`/identity/conditionalAccess/policies/${policyId}`).get(),
});

// ============================================================ Authentication methods
export const entra_listAuthenticationMethodConfigurations = makeTool({
  name: "entra_listAuthenticationMethodConfigurations",
  description: "List the tenant's authentication method policies (FIDO2, MS Authenticator, SMS, etc.).",
  mode: "app",
  inputSchema: z.object({}),
  call: async (_input, client) =>
    client.api("/policies/authenticationMethodsPolicy/authenticationMethodConfigurations").get(),
});

export const entra_listUserAuthenticationMethods = makeTool({
  name: "entra_listUserAuthenticationMethods",
  description: "List the methods registered for a user (passwordless, app, hardware token, etc.).",
  mode: "app",
  inputSchema: z.object({ user: z.string() }),
  call: async ({ user }, client) => client.api(`/users/${user}/authentication/methods`).get(),
});

// ============================================================ Directory roles & assignments
export const entra_listDirectoryRoles = makeTool({
  name: "entra_listDirectoryRoles",
  description: "List activated directory roles in the tenant.",
  mode: "app",
  inputSchema: z.object({}),
  call: async (_input, client) => client.api("/directoryRoles").get(),
});

export const entra_listRoleAssignments = makeTool({
  name: "entra_listRoleAssignments",
  description: "List active role assignments via the Unified Role Management API.",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) =>
    applyListOptions(client.api("/roleManagement/directory/roleAssignments"), opts).get(),
});

// ============================================================ Licenses
export const entra_listSubscribedSkus = makeTool({
  name: "entra_listSubscribedSkus",
  description: "List the tenant's purchased license SKUs (for use in users_assignLicense).",
  mode: "app",
  inputSchema: z.object({}),
  call: async (_input, client) => client.api("/subscribedSkus").get(),
});

// ============================================================ Audit & sign-in logs
export const entra_listSignInLogs = makeTool({
  name: "entra_listSignInLogs",
  description: "List sign-in logs (interactive + non-interactive). Filter by createdDateTime, userPrincipalName, status, etc. Returns nextPageToken; pass as `pageToken` to fetch more (this endpoint paginates aggressively).",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) => shapeListResponse(await listRequest(client, "/auditLogs/signIns", opts).get()),
});

export const entra_listAuditLogs = makeTool({
  name: "entra_listAuditLogs",
  description: "List directory audit logs (admin actions, group changes, etc.). Returns nextPageToken; pass as `pageToken` to fetch more.",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) => shapeListResponse(await listRequest(client, "/auditLogs/directoryAudits", opts).get()),
});

// ============================================================ Organization & devices
export const entra_listDevices = makeTool({
  name: "entra_listDevices",
  description: "List Entra-joined or registered devices.",
  mode: "app",
  inputSchema: ListOptionsSchema,
  call: async (opts, client) => applyListOptions(client.api("/devices"), opts).get(),
});

export const entra_listDomains = makeTool({
  name: "entra_listDomains",
  description: "List verified domains for the tenant.",
  mode: "app",
  inputSchema: z.object({}),
  call: async (_input, client) => client.api("/domains").get(),
});

export const entraTools = [
  entra_listApplications,
  entra_getApplication,
  entra_listServicePrincipals,
  entra_listConditionalAccessPolicies,
  entra_getConditionalAccessPolicy,
  entra_listAuthenticationMethodConfigurations,
  entra_listUserAuthenticationMethods,
  entra_listDirectoryRoles,
  entra_listRoleAssignments,
  entra_listSubscribedSkus,
  entra_listSignInLogs,
  entra_listAuditLogs,
  entra_listDevices,
  entra_listDomains,
];
