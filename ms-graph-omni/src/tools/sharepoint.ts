/**
 * SharePoint sites + lists.
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, makeTool } from "./_helpers.js";

export const sites_search = makeTool({
  name: "sites_search",
  description: "Search SharePoint sites by query (title, URL keyword). Use sites_get for a specific known site.",
  mode: "app",
  inputSchema: z.object({ query: z.string(), top: z.number().int().default(25) }),
  call: async ({ query, top }, client) =>
    client.api(`/sites`).query({ search: query, $top: String(top) }).get(),
});

export const sites_get = makeTool({
  name: "sites_get",
  description: "Get a SharePoint site by id or hostname/path (e.g. 'thelobbi.sharepoint.com:/sites/Marketing').",
  mode: "app",
  inputSchema: z.object({ site: z.string() }),
  call: async ({ site }, client) => client.api(`/sites/${site}`).get(),
});

export const sites_getRoot = makeTool({
  name: "sites_getRoot",
  description: "Get the tenant root SharePoint site.",
  mode: "app",
  inputSchema: z.object({}),
  call: async (_input, client) => client.api(`/sites/root`).get(),
});

export const sites_listLists = makeTool({
  name: "sites_listLists",
  description: "List the SharePoint lists/libraries in a site.",
  mode: "app",
  inputSchema: ListOptionsSchema.extend({ siteId: z.string() }),
  call: async ({ siteId, ...opts }, client) =>
    applyListOptions(client.api(`/sites/${siteId}/lists`), opts).get(),
});

export const sites_listListItems = makeTool({
  name: "sites_listListItems",
  description: "List items in a SharePoint list. Use expand=['fields'] to get column values.",
  mode: "app",
  inputSchema: ListOptionsSchema.extend({
    siteId: z.string(),
    listId: z.string(),
  }),
  call: async ({ siteId, listId, ...opts }, client) =>
    applyListOptions(client.api(`/sites/${siteId}/lists/${listId}/items`), opts).get(),
});

export const sites_createListItem = makeTool({
  name: "sites_createListItem",
  description: "Create a new item in a SharePoint list.",
  mode: "app",
  inputSchema: z.object({
    siteId: z.string(),
    listId: z.string(),
    fields: z.record(z.string(), z.unknown()).describe("Column values, e.g. { Title: 'foo', Status: 'Open' }."),
  }),
  call: async ({ siteId, listId, fields }, client) =>
    client.api(`/sites/${siteId}/lists/${listId}/items`).post({ fields }),
});

export const sites_updateListItem = makeTool({
  name: "sites_updateListItem",
  description: "Update an item's fields in a SharePoint list.",
  mode: "app",
  inputSchema: z.object({
    siteId: z.string(),
    listId: z.string(),
    itemId: z.string(),
    fields: z.record(z.string(), z.unknown()),
  }),
  call: async ({ siteId, listId, itemId, fields }, client) =>
    client.api(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`).patch(fields),
});

export const sites_deleteListItem = makeTool({
  name: "sites_deleteListItem",
  description: "Delete an item from a SharePoint list.",
  mode: "app",
  inputSchema: z.object({ siteId: z.string(), listId: z.string(), itemId: z.string() }),
  call: async ({ siteId, listId, itemId }, client) => {
    await client.api(`/sites/${siteId}/lists/${listId}/items/${itemId}`).delete();
    return { ok: true };
  },
});

export const sharepointTools = [
  sites_search,
  sites_get,
  sites_getRoot,
  sites_listLists,
  sites_listListItems,
  sites_createListItem,
  sites_updateListItem,
  sites_deleteListItem,
];
