/**
 * OneDrive + drive items (files/folders). Works for personal OneDrive (/me/drive),
 * a user's drive (/users/{id}/drive), or a SharePoint document library
 * (/sites/{siteId}/drives/{driveId}).
 */
import { z } from "zod";
import type { Client } from "@microsoft/microsoft-graph-client";
import { LargeFileUploadTask, type FileObject, type LargeFileUploadSession } from "@microsoft/microsoft-graph-client";
import { applyListOptions, ListOptionsSchema, makeTool } from "./_helpers.js";

const driveTarget = z.discriminatedUnion("type", [
  z.object({ type: z.literal("me") }),
  z.object({
    type: z.literal("user"),
    user: z
      .string()
      .describe(
        "User UPN (e.g. user@thelobbi.io) or directory object id (guid). UPNs are resolved to a guid internally before the Graph call."
      ),
  }),
  z.object({ type: z.literal("site"), siteId: z.string(), driveId: z.string().optional() }),
]);

const GUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function resolveUserToGuid(user: string, client: Client): Promise<string> {
  if (GUID_RE.test(user)) return user;
  const res = await client
    .api(`/users/${encodeURIComponent(user)}`)
    .select("id")
    .get();
  if (!res?.id) {
    throw new Error(`Could not resolve user '${user}' to a directory id.`);
  }
  return res.id as string;
}

async function drivePath(t: z.infer<typeof driveTarget>, client: Client): Promise<string> {
  if (t.type === "me") return "/me/drive";
  if (t.type === "user") {
    const userId = await resolveUserToGuid(t.user, client);
    return `/users/${userId}/drive`;
  }
  return t.driveId ? `/sites/${t.siteId}/drives/${t.driveId}` : `/sites/${t.siteId}/drive`;
}

export const drive_listItems = makeTool({
  name: "drive_listItems",
  description: "List items at a folder path (or drive root). Path is the OneDrive/SharePoint path, e.g. '/Documents/2026'.",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({
    target: driveTarget.default({ type: "me" }),
    path: z.string().optional().describe("Folder path. Omit for root."),
  }),
  call: async ({ target, path, ...opts }, client) => {
    const base = await drivePath(target, client);
    const itemPath = path ? `${base}/root:${path}:/children` : `${base}/root/children`;
    return await applyListOptions(client.api(itemPath), opts).get();
  },
});

export const drive_getItem = makeTool({
  name: "drive_getItem",
  description: "Get metadata for a single item by id or path.",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    itemId: z.string().optional(),
    path: z.string().optional(),
  }),
  call: async ({ target, itemId, path }, client) => {
    if (!itemId && !path) throw new Error("Provide either itemId or path");
    const base = await drivePath(target, client);
    const itemPath = itemId ? `${base}/items/${itemId}` : `${base}/root:${path}`;
    return await client.api(itemPath).get();
  },
});

export const drive_downloadFile = makeTool({
  name: "drive_downloadFile",
  description: "Download a file's content. Returns base64-encoded bytes (small files only — for large files use drive_getDownloadUrl).",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    itemId: z.string().optional(),
    path: z.string().optional(),
  }),
  call: async ({ target, itemId, path }, client) => {
    if (!itemId && !path) throw new Error("Provide either itemId or path");
    const base = await drivePath(target, client);
    const url = itemId ? `${base}/items/${itemId}/content` : `${base}/root:${path}:/content`;
    const stream = await client.api(url).getStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) chunks.push(Buffer.from(chunk));
    return { contentBase64: Buffer.concat(chunks).toString("base64") };
  },
});

export const drive_getDownloadUrl = makeTool({
  name: "drive_getDownloadUrl",
  description: "Get a short-lived (~1h) pre-authenticated download URL for a file. Use for large files instead of streaming. Returns { url, name, id, size, mimeType, expiresInSeconds }. Throws if the item is a folder, OneNote section, or otherwise restricted by policy (no @microsoft.graph.downloadUrl annotation in the response).",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    itemId: z.string().optional(),
    path: z.string().optional(),
  }),
  call: async ({ target, itemId, path }, client) => {
    if (!itemId && !path) throw new Error("Provide either itemId or path");
    const base = await drivePath(target, client);
    const url = itemId ? `${base}/items/${itemId}` : `${base}/root:${path}`;
    // The instance annotation @microsoft.graph.downloadUrl is only emitted
    // when the response is NOT projected via $select. Using .select(...) here
    // strips it (which is exactly why this tool was returning {name,id} only
    // in the field). Fetch the item without $select, then read the annotation
    // off the response object.
    const item: any = await client.api(url).get();
    const downloadUrl = item?.["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
      throw new Error(
        `No @microsoft.graph.downloadUrl on item '${item?.name ?? itemId ?? path}'. ` +
          "This usually means the item is a folder, a OneNote item, or restricted by tenant policy. " +
          "Use drive_listItems to confirm the item is a file."
      );
    }
    return {
      url: downloadUrl,
      name: item.name,
      id: item.id,
      size: item.size,
      mimeType: item.file?.mimeType,
      // Graph documents the URL as short-lived (~1 hour). We don't get an
      // explicit expiry from the response, so we surface the documented
      // value so callers don't have to guess.
      expiresInSeconds: 3600,
    };
  },
});

export const drive_uploadFile = makeTool({
  name: "drive_uploadFile",
  description: "Upload a file (< 4 MB; use drive_uploadLargeFile for bigger). path is the destination including filename.",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    path: z.string().describe("Destination path including filename, e.g. '/Documents/notes.txt'."),
    contentBase64: z.string().describe("Base64 of the file bytes."),
    conflictBehavior: z.enum(["fail", "replace", "rename"]).default("replace"),
  }),
  call: async ({ target, path, contentBase64, conflictBehavior }, client) => {
    const base = await drivePath(target, client);
    const buf = Buffer.from(contentBase64, "base64");
    const url = `${base}/root:${path}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
    return await client.api(url).put(buf);
  },
});

export const drive_createFolder = makeTool({
  name: "drive_createFolder",
  description: "Create a folder. parentPath defaults to drive root.",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    name: z.string(),
    parentPath: z.string().optional(),
  }),
  call: async ({ target, name, parentPath }, client) => {
    const base = await drivePath(target, client);
    const parentUrl = parentPath ? `${base}/root:${parentPath}:/children` : `${base}/root/children`;
    return await client.api(parentUrl).post({ name, folder: {}, "@microsoft.graph.conflictBehavior": "rename" });
  },
});

export const drive_deleteItem = makeTool({
  name: "drive_deleteItem",
  description: "Delete a file or folder.",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    itemId: z.string().optional(),
    path: z.string().optional(),
  }),
  call: async ({ target, itemId, path }, client) => {
    const base = await drivePath(target, client);
    const url = itemId ? `${base}/items/${itemId}` : `${base}/root:${path}`;
    await client.api(url).delete();
    return { ok: true };
  },
});

export const drive_createShareLink = makeTool({
  name: "drive_createShareLink",
  description: "Create a sharing link for a file. type: 'view' | 'edit' | 'embed'. scope: 'anonymous' | 'organization'.",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    itemId: z.string().optional(),
    path: z.string().optional(),
    type: z.enum(["view", "edit", "embed"]).default("view"),
    scope: z.enum(["anonymous", "organization", "users"]).default("organization"),
    password: z.string().optional(),
    expirationDateTime: z.string().optional().describe("ISO datetime."),
  }),
  call: async ({ target, itemId, path, type, scope, password, expirationDateTime }, client) => {
    const base = await drivePath(target, client);
    const url = itemId ? `${base}/items/${itemId}/createLink` : `${base}/root:${path}:/createLink`;
    const payload: any = { type, scope };
    if (password) payload.password = password;
    if (expirationDateTime) payload.expirationDateTime = expirationDateTime;
    return await client.api(url).post(payload);
  },
});

export const drive_search = makeTool({
  name: "drive_search",
  description: "Search the user's OneDrive (or a SharePoint drive) by query.",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    query: z.string(),
    top: z.number().int().default(25),
  }),
  call: async ({ target, query, top }, client) => {
    const base = await drivePath(target, client);
    return await client.api(`${base}/root/search(q='${encodeURIComponent(query)}')`).top(top).get();
  },
});

export const drive_uploadLargeFile = makeTool({
  name: "drive_uploadLargeFile",
  description:
    "Upload a file >4 MB (and up to ~250 GB) to OneDrive or SharePoint via a Graph upload session. " +
    "Uses POST createUploadSession + chunked PUT (320 KiB-aligned, max 60 MiB per chunk). " +
    "Resilient to chunk failures: each chunk gets retry-with-backoff. " +
    "For files <=4 MB use drive_uploadFile (one HTTP, faster).",
  mode: "delegated",
  inputSchema: z.object({
    target: driveTarget.default({ type: "me" }),
    path: z.string().describe("Destination path including filename, e.g. '/Recordings/quarterly-review.mp4'."),
    contentBase64: z.string().describe("Base64 of the file bytes."),
    conflictBehavior: z.enum(["fail", "replace", "rename"]).default("rename"),
    /** Range size in MiB (1-60). Default 4 MiB. Larger = fewer round trips, more retry blast on failure. */
    chunkSizeMiB: z.number().int().min(1).max(60).default(4),
  }),
  call: async ({ target, path, contentBase64, conflictBehavior, chunkSizeMiB }, client) => {
    const base = await drivePath(target, client);
    // Strip a leading slash for safe concatenation into the colon-segmented path syntax.
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const filename = cleanPath.slice(cleanPath.lastIndexOf("/") + 1);
    if (!filename) throw new Error("path must end in a filename, e.g. '/folder/movie.mp4'");

    // Step 1: ask Graph for an upload session URL.
    const sessionUrl = `${base}/root:${cleanPath}:/createUploadSession`;
    const session = (await client.api(sessionUrl).post({
      item: {
        "@microsoft.graph.conflictBehavior": conflictBehavior,
        name: filename,
      },
    })) as LargeFileUploadSession;

    // Step 2: stream the bytes via the SDK's chunked uploader.
    const buf = Buffer.from(contentBase64, "base64");
    // Range size MUST be a multiple of 320 KiB per docs.
    const KiB = 1024;
    const stride = 320 * KiB;
    const requested = chunkSizeMiB * 1024 * KiB;
    const rangeSize = Math.max(stride, Math.floor(requested / stride) * stride);

    const fileObject: FileObject<Buffer> = {
      content: buf,
      name: filename,
      size: buf.byteLength,
      sliceFile(range: { minValue: number; maxValue: number }) {
        // maxValue is inclusive; +1 for end-exclusive slice
        return buf.subarray(range.minValue, range.maxValue + 1);
      },
    };

    const task = new LargeFileUploadTask(client, fileObject, session, { rangeSize });
    const result = await task.upload();

    // The SDK's upload() returns either a DriveItem (success) or partial progress info.
    // Surface the driveItem fields the LLM cares about.
    const item = (result as { responseBody?: unknown }).responseBody ?? result;
    return {
      ok: true,
      sessionUrl: session.url,
      sizeBytes: buf.byteLength,
      rangeSizeBytes: rangeSize,
      item,
    };
  },
});

export const onedriveTools = [
  drive_listItems,
  drive_getItem,
  drive_downloadFile,
  drive_getDownloadUrl,
  drive_uploadFile,
  drive_uploadLargeFile,
  drive_createFolder,
  drive_deleteItem,
  drive_createShareLink,
  drive_search,
];
