import { z } from "zod";
import { applyListOptions, ListOptionsSchema, makeTool } from "./_helpers.js";

const userTarget = z.string().optional();

const ONENOTE_5K_HINT =
  "OneDrive document libraries that back this user OneNote contain more than 5,000 items, which Graph refuses to enumerate. Workarounds: (1) call with a specific notebookId/sectionId rather than tenant-wide listing, (2) use the OneNote desktop app to consolidate notebooks, or (3) use search_query with entityTypes=[driveItem] to find pages by title.";

function isOneNote5kError(err: any): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("5,000 onenote items") ||
    msg.includes("5000 onenote items") ||
    /onenote.*cannot be queried/i.test(msg)
  );
}

function rewrap5k(err: any): Error {
  const wrapped = new Error(
    "OneNote API limit exceeded: " + ONENOTE_5K_HINT + " (Original Graph error: " + (err?.message ?? err) + ")"
  );
  (wrapped as any).cause = err;
  (wrapped as any).code = "OneNoteItemLimitExceeded";
  return wrapped;
}

export const onenote_listNotebooks = makeTool({
  name: "onenote_listNotebooks",
  description: "List the user's OneNote notebooks.",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({ user: userTarget }),
  call: async ({ user, ...opts }, client) => {
    const base = user ? `/users/${user}` : "/me";
    try {
      return await applyListOptions(client.api(`${base}/onenote/notebooks`), opts).get();
    } catch (err) {
      if (isOneNote5kError(err)) throw rewrap5k(err);
      throw err;
    }
  },
});

export const onenote_listSections = makeTool({
  name: "onenote_listSections",
  description: "List sections in a notebook (or all sections if notebookId omitted). NOTE: Graph rejects this call when the user OneDrive contains more than 5,000 OneNote items.",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({ user: userTarget, notebookId: z.string().optional() }),
  call: async ({ user, notebookId, ...opts }, client) => {
    const base = user ? `/users/${user}` : "/me";
    const path = notebookId ? `${base}/onenote/notebooks/${notebookId}/sections` : `${base}/onenote/sections`;
    try {
      return await applyListOptions(client.api(path), opts).get();
    } catch (err) {
      if (isOneNote5kError(err)) throw rewrap5k(err);
      throw err;
    }
  },
});

export const onenote_listPages = makeTool({
  name: "onenote_listPages",
  description: "List pages in a section (or all pages if sectionId omitted). NOTE: Graph rejects this call when the user OneDrive contains more than 5,000 OneNote items.",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({ user: userTarget, sectionId: z.string().optional() }),
  call: async ({ user, sectionId, ...opts }, client) => {
    const base = user ? `/users/${user}` : "/me";
    const path = sectionId ? `${base}/onenote/sections/${sectionId}/pages` : `${base}/onenote/pages`;
    try {
      return await applyListOptions(client.api(path), opts).get();
    } catch (err) {
      if (isOneNote5kError(err)) throw rewrap5k(err);
      throw err;
    }
  },
});

export const onenote_getPageContent = makeTool({
  name: "onenote_getPageContent",
  description: "Get a OneNote page's HTML content.",
  mode: "delegated",
  inputSchema: z.object({ pageId: z.string(), user: userTarget }),
  call: async ({ pageId, user }, client) => {
    const base = user ? `/users/${user}` : "/me";
    const stream = await client.api(`${base}/onenote/pages/${pageId}/content`).getStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) chunks.push(Buffer.from(chunk));
    return { html: Buffer.concat(chunks).toString("utf-8") };
  },
});

export const onenote_createPage = makeTool({
  name: "onenote_createPage",
  description: "Create a new OneNote page in a section.",
  mode: "delegated",
  inputSchema: z.object({
    sectionId: z.string(),
    user: userTarget,
    html: z.string(),
  }),
  call: async ({ sectionId, user, html }, client) => {
    const base = user ? `/users/${user}` : "/me";
    return await client.api(`${base}/onenote/sections/${sectionId}/pages`).header("Content-Type", "text/html").post(html);
  },
});

export const onenoteTools = [
  onenote_listNotebooks,
  onenote_listSections,
  onenote_listPages,
  onenote_getPageContent,
  onenote_createPage,
];
