import { z } from "zod";
import { makeResourceTool } from "./_resource.js";

const EXCHANGE_RESOURCE = "https://outlook.office365.com";

export const exchange_listAcceptedDomains = makeResourceTool({
  name: "exchange_listAcceptedDomains",
  description:
    "List Exchange Online accepted domains through the Exchange admin REST surface used by app-only Exchange automation.",
  namespace: "exchange",
  resource: EXCHANGE_RESOURCE,
  baseUrl: EXCHANGE_RESOURCE,
  inputSchema: z.object({}),
  call: async (_input, client, tenant) =>
    client.get(`/adminapi/beta/${tenant.tenantId}/AcceptedDomain`),
});

export const exchange_listTransportRules = makeResourceTool({
  name: "exchange_listTransportRules",
  description: "List Exchange Online transport/mail-flow rules.",
  namespace: "exchange",
  resource: EXCHANGE_RESOURCE,
  baseUrl: EXCHANGE_RESOURCE,
  inputSchema: z.object({}),
  call: async (_input, client, tenant) =>
    client.get(`/adminapi/beta/${tenant.tenantId}/TransportRule`),
});

export const exchange_listSharedMailboxes = makeResourceTool({
  name: "exchange_listSharedMailboxes",
  description: "List Exchange Online shared mailboxes.",
  namespace: "exchange",
  resource: EXCHANGE_RESOURCE,
  baseUrl: EXCHANGE_RESOURCE,
  inputSchema: z.object({}),
  call: async (_input, client, tenant) =>
    client.get(`/adminapi/beta/${tenant.tenantId}/Mailbox`, {
      RecipientTypeDetails: "SharedMailbox",
    }),
});

export const exchangeTools = [
  exchange_listAcceptedDomains,
  exchange_listTransportRules,
  exchange_listSharedMailboxes,
];
