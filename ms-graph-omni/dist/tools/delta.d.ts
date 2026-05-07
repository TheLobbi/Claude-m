export declare const mail_delta: import("./types.js").ToolDef<{
    tenantSlug?: string | undefined;
    user?: string | undefined;
    folderId?: string | undefined;
    maxPages?: number | undefined;
}>;
export declare const calendar_delta: import("./types.js").ToolDef<{
    tenantSlug?: string | undefined;
    user?: string | undefined;
    startDateTime?: string | undefined;
    endDateTime?: string | undefined;
    maxPages?: number | undefined;
}>;
export declare const drive_delta: import("./types.js").ToolDef<{
    tenantSlug?: string | undefined;
    userId?: string | undefined;
    siteId?: string | undefined;
    driveId?: string | undefined;
    maxPages?: number | undefined;
}>;
export declare const users_delta: import("./types.js").ToolDef<{
    select?: string[] | undefined;
    tenantSlug?: string | undefined;
    maxPages?: number | undefined;
}>;
export declare const groups_delta: import("./types.js").ToolDef<{
    select?: string[] | undefined;
    tenantSlug?: string | undefined;
    maxPages?: number | undefined;
    expandMembers?: boolean | undefined;
}>;
export declare const todo_delta: import("./types.js").ToolDef<{
    listId: string;
    tenantSlug?: string | undefined;
    maxPages?: number | undefined;
}>;
export declare const delta_clear: import("./types.js").ToolDef<{
    scope: string;
    resource: "users" | "groups" | "mail" | "calendar" | "drive" | "todo";
    tenantSlug?: string | undefined;
}>;
export declare const deltaTools: (import("./types.js").ToolDef<{
    tenantSlug?: string | undefined;
    user?: string | undefined;
    folderId?: string | undefined;
    maxPages?: number | undefined;
}> | import("./types.js").ToolDef<{
    tenantSlug?: string | undefined;
    user?: string | undefined;
    startDateTime?: string | undefined;
    endDateTime?: string | undefined;
    maxPages?: number | undefined;
}> | import("./types.js").ToolDef<{
    tenantSlug?: string | undefined;
    userId?: string | undefined;
    siteId?: string | undefined;
    driveId?: string | undefined;
    maxPages?: number | undefined;
}> | import("./types.js").ToolDef<{
    select?: string[] | undefined;
    tenantSlug?: string | undefined;
    maxPages?: number | undefined;
}> | import("./types.js").ToolDef<{
    select?: string[] | undefined;
    tenantSlug?: string | undefined;
    maxPages?: number | undefined;
    expandMembers?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    listId: string;
    tenantSlug?: string | undefined;
    maxPages?: number | undefined;
}> | import("./types.js").ToolDef<{
    scope: string;
    resource: "users" | "groups" | "mail" | "calendar" | "drive" | "todo";
    tenantSlug?: string | undefined;
}>)[];
