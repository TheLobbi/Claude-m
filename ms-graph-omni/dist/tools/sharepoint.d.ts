export declare const sites_search: import("./types.js").ToolDef<{
    query: string;
    top?: number | undefined;
}>;
export declare const sites_get: import("./types.js").ToolDef<{
    site: string;
}>;
export declare const sites_getRoot: import("./types.js").ToolDef<{}>;
export declare const sites_listLists: import("./types.js").ToolDef<{
    siteId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}>;
export declare const sites_listListItems: import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}>;
export declare const sites_createListItem: import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    fields: Record<string, unknown>;
}>;
export declare const sites_updateListItem: import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    fields: Record<string, unknown>;
    itemId: string;
}>;
export declare const sites_deleteListItem: import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    itemId: string;
}>;
export declare const sharepointTools: (import("./types.js").ToolDef<{
    query: string;
    top?: number | undefined;
}> | import("./types.js").ToolDef<{
    site: string;
}> | import("./types.js").ToolDef<{}> | import("./types.js").ToolDef<{
    siteId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}> | import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}> | import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    fields: Record<string, unknown>;
}> | import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    fields: Record<string, unknown>;
    itemId: string;
}> | import("./types.js").ToolDef<{
    siteId: string;
    listId: string;
    itemId: string;
}>)[];
