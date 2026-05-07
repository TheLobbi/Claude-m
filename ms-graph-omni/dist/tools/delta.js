/**
 * Delta query tools — incremental change tracking for resources that support
 * the `delta` function in Graph.
 *
 * Pattern (per resource):
 *   1. First call:  GET /<resource>/delta              -> returns initial state +
 *                                                          @odata.nextLink (more pages)
 *                                                          OR @odata.deltaLink (done)
 *   2. Walk nextLinks until a page returns @odata.deltaLink
 *   3. Save the deltaLink to ~/.msgo-cache/delta/
 *   4. Next call:  GET <saved-deltaLink>               -> returns changes since
 *                                                          last call + new deltaLink
 *
 * If Graph returns 400 syncStateNotFound / syncStateInvalid, we drop the
 * stored token and the caller can re-run for a fresh full sync.
 *
 * Resources covered (matching the Microsoft-documented support matrix):
 *   - mail_delta          /me/mailFolders/{id}/messages/delta or /users/{id}/mailFolders/{id}/messages/delta
 *   - calendar_delta      /me/calendarView/delta?startDateTime=...&endDateTime=...
 *   - drive_delta         /me/drive/root/delta or /users/{id}/drive/root/delta
 *   - users_delta         /users/delta  (app-only; tenant-wide directory sync)
 *   - groups_delta        /groups/delta (app-only; tenant-wide group sync)
 *   - todo_delta          /me/todo/lists/{id}/tasks/delta
 *
 * Source: https://learn.microsoft.com/graph/delta-query-overview
 */
import { z } from "zod";
import { makeTool } from "./_helpers.js";
import { readDelta, writeDelta, clearDelta, extractDeltaLink, extractNextLink, } from "../streaming/deltaStore.js";
import { translateGraphError } from "../graph/errorTranslator.js";
import { loadConfig } from "../config.js";
async function runDelta(opts) {
    const cfg = loadConfig();
    const tenantSlug = opts.tenantSlug || cfg.defaultTenant;
    const stored = readDelta(tenantSlug, opts.resource, opts.scope);
    let url = stored?.deltaLink ?? opts.freshUrl();
    let resumed = stored !== null;
    let resyncReason;
    const maxPages = opts.maxPages ?? 5;
    const merged = [];
    let lastDeltaLink = null;
    let lastNextLink = null;
    let pages = 0;
    while (true) {
        let response;
        try {
            response = await opts.client.api(url).get();
        }
        catch (e) {
            const translated = translateGraphError(e, { tool: opts.resource, mode: "app" });
            if (translated.code === "syncStateNotFound" || translated.code === "syncStateInvalid") {
                // Server told us our token is dead. Wipe and restart from scratch.
                clearDelta(tenantSlug, opts.resource, opts.scope);
                url = opts.freshUrl();
                resumed = false;
                resyncReason = `Stored delta token rejected (${translated.code}); restarted full sync.`;
                continue;
            }
            throw e;
        }
        pages += 1;
        const value = Array.isArray(response?.value) ? response.value : [];
        merged.push(...value);
        lastDeltaLink = extractDeltaLink(response);
        lastNextLink = extractNextLink(response);
        if (lastDeltaLink)
            break; // sync complete
        if (!lastNextLink)
            break; // no more data, no deltaLink (shouldn't happen but be safe)
        if (pages >= maxPages)
            break;
        url = lastNextLink;
    }
    if (lastDeltaLink) {
        writeDelta(tenantSlug, opts.resource, opts.scope, lastDeltaLink);
    }
    return {
        value: merged,
        changeCount: merged.length,
        resumed,
        complete: lastDeltaLink !== null,
        ...(lastDeltaLink ? {} : { nextLink: lastNextLink ?? undefined }),
        ...(resyncReason ? { resyncReason } : {}),
    };
}
/* ------------------------------------------------------------------ mail */
export const mail_delta = makeTool({
    name: "mail_delta",
    description: "Incremental change tracking for messages in a mail folder. First call returns all messages and a deltaLink; subsequent calls return only changes (added / updated / deleted) since last invocation. " +
        "Resumes automatically from a saved deltaLink under ~/.msgo-cache/delta/. " +
        "Use over mail_listMessages when polling for new mail — much cheaper on Graph quota and avoids duplicate work.",
    mode: "delegated",
    inputSchema: z.object({
        folderId: z.string().default("inbox").describe("Mail folder id or well-known name (default: inbox)."),
        user: z.string().optional().describe("Target mailbox (UPN/id). Omit for /me."),
        maxPages: z.number().int().min(1).max(20).default(5),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ folderId, user, maxPages, tenantSlug }, client) => {
        const base = user ? `/users/${user}` : "/me";
        return await runDelta({
            client,
            tenantSlug: tenantSlug ?? "",
            resource: "mail",
            scope: `${user ?? "me"}_${folderId}`,
            freshUrl: () => `${base}/mailFolders/${folderId}/messages/delta`,
            maxPages,
        });
    },
});
/* ------------------------------------------------------------------ calendar */
export const calendar_delta = makeTool({
    name: "calendar_delta",
    description: "Incremental change tracking for calendar events in a date window. Note: calendarView/delta REQUIRES startDateTime + endDateTime parameters on the FIRST call; resumes via deltaLink thereafter. Default window = next 30 days from invocation.",
    mode: "delegated",
    inputSchema: z.object({
        user: z.string().optional(),
        startDateTime: z.string().optional().describe("ISO 8601. Default: now."),
        endDateTime: z.string().optional().describe("ISO 8601. Default: now + 30d."),
        maxPages: z.number().int().min(1).max(20).default(5),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ user, startDateTime, endDateTime, maxPages, tenantSlug }, client) => {
        const base = user ? `/users/${user}` : "/me";
        const start = startDateTime ?? new Date().toISOString();
        const end = endDateTime ?? new Date(Date.now() + 30 * 86400000).toISOString();
        return await runDelta({
            client,
            tenantSlug: tenantSlug ?? "",
            resource: "calendar",
            scope: `${user ?? "me"}`,
            freshUrl: () => `${base}/calendarView/delta?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
            maxPages,
        });
    },
});
/* ------------------------------------------------------------------ drive */
export const drive_delta = makeTool({
    name: "drive_delta",
    description: "Incremental change tracking for OneDrive / SharePoint drive items. Default scope is /me/drive/root; pass userId to target another user's drive (app-only) or {siteId, driveId} for a SharePoint document library.",
    mode: "delegated",
    inputSchema: z.object({
        userId: z.string().optional(),
        siteId: z.string().optional(),
        driveId: z.string().optional(),
        maxPages: z.number().int().min(1).max(20).default(5),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ userId, siteId, driveId, maxPages, tenantSlug }, client) => {
        let basePath;
        let scope;
        if (siteId) {
            basePath = driveId ? `/sites/${siteId}/drives/${driveId}` : `/sites/${siteId}/drive`;
            scope = `site_${siteId}_${driveId ?? "default"}`;
        }
        else if (userId) {
            basePath = `/users/${userId}/drive`;
            scope = `user_${userId}`;
        }
        else {
            basePath = `/me/drive`;
            scope = "me";
        }
        return await runDelta({
            client,
            tenantSlug: tenantSlug ?? "",
            resource: "drive",
            scope,
            freshUrl: () => `${basePath}/root/delta`,
            maxPages,
        });
    },
});
/* ------------------------------------------------------------------ users */
export const users_delta = makeTool({
    name: "users_delta",
    description: "Tenant-wide directory sync of user objects. App-only (delegated unsupported here). Useful for keeping a local user mirror in sync without re-listing the entire directory each run.",
    mode: "app",
    inputSchema: z.object({
        select: z.array(z.string()).optional().describe("Fields to project on each user."),
        maxPages: z.number().int().min(1).max(50).default(10),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ select, maxPages, tenantSlug }, client) => {
        const sel = select?.length ? `?$select=${select.join(",")}` : "";
        return await runDelta({
            client,
            tenantSlug: tenantSlug ?? "",
            resource: "users",
            scope: "tenant",
            freshUrl: () => `/users/delta${sel}`,
            maxPages,
        });
    },
});
/* ------------------------------------------------------------------ groups */
export const groups_delta = makeTool({
    name: "groups_delta",
    description: "Tenant-wide directory sync of group objects (security, M365, distribution). App-only. Use $expand=members in a custom select string to also track group membership changes.",
    mode: "app",
    inputSchema: z.object({
        select: z.array(z.string()).optional(),
        expandMembers: z.boolean().default(false).describe("Include group membership changes via $expand=members."),
        maxPages: z.number().int().min(1).max(50).default(10),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ select, expandMembers, maxPages, tenantSlug }, client) => {
        const params = [];
        if (select?.length)
            params.push(`$select=${select.join(",")}`);
        if (expandMembers)
            params.push("$expand=members");
        const qs = params.length ? `?${params.join("&")}` : "";
        return await runDelta({
            client,
            tenantSlug: tenantSlug ?? "",
            resource: "groups",
            scope: expandMembers ? "tenant_with_members" : "tenant",
            freshUrl: () => `/groups/delta${qs}`,
            maxPages,
        });
    },
});
/* ------------------------------------------------------------------ todo */
export const todo_delta = makeTool({
    name: "todo_delta",
    description: "Incremental change tracking for tasks in a Microsoft To Do list. Useful for keeping a local task mirror in sync.",
    mode: "delegated",
    inputSchema: z.object({
        listId: z.string().describe("To Do list id (use todo_listLists to find)."),
        maxPages: z.number().int().min(1).max(20).default(5),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ listId, maxPages, tenantSlug }, client) => {
        return await runDelta({
            client,
            tenantSlug: tenantSlug ?? "",
            resource: "todo",
            scope: `me_${listId}`,
            freshUrl: () => `/me/todo/lists/${listId}/tasks/delta`,
            maxPages,
        });
    },
});
/* ------------------------------------------------------------------ control */
export const delta_clear = makeTool({
    name: "delta_clear",
    description: "Drop a stored delta token to force the next call to start a fresh full sync. Use when you suspect drift (e.g. someone added properties via another tool, or the user wants to re-pull everything).",
    mode: "app",
    inputSchema: z.object({
        resource: z.enum(["mail", "calendar", "drive", "users", "groups", "todo"]),
        scope: z.string().describe("Same scope string used by the original tool — see each tool's source for the formula."),
        tenantSlug: z.string().optional(),
    }),
    call: async ({ resource, scope, tenantSlug }, _client) => {
        const cfg = loadConfig();
        clearDelta(tenantSlug ?? cfg.defaultTenant, resource, scope);
        return { ok: true, cleared: { resource, scope, tenantSlug: tenantSlug ?? cfg.defaultTenant } };
    },
});
export const deltaTools = [
    mail_delta,
    calendar_delta,
    drive_delta,
    users_delta,
    groups_delta,
    todo_delta,
    delta_clear,
];
//# sourceMappingURL=delta.js.map