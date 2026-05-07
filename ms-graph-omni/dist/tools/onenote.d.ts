export declare const onenote_listNotebooks: import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
}>;
export declare const onenote_listSections: import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
    notebookId?: string | undefined;
}>;
export declare const onenote_listPages: import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
    sectionId?: string | undefined;
}>;
export declare const onenote_getPageContent: import("./types.js").ToolDef<{
    pageId: string;
    user?: string | undefined;
}>;
export declare const onenote_createPage: import("./types.js").ToolDef<{
    html: string;
    sectionId: string;
    user?: string | undefined;
}>;
export declare const onenoteTools: (import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
    notebookId?: string | undefined;
}> | import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
    sectionId?: string | undefined;
}> | import("./types.js").ToolDef<{
    pageId: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    html: string;
    sectionId: string;
    user?: string | undefined;
}>)[];
