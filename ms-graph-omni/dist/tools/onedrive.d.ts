export declare const drive_listItems: import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}>;
export declare const drive_getItem: import("./types.js").ToolDef<{
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    itemId?: string | undefined;
}>;
export declare const drive_downloadFile: import("./types.js").ToolDef<{
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    itemId?: string | undefined;
}>;
export declare const drive_getDownloadUrl: import("./types.js").ToolDef<{
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    itemId?: string | undefined;
}>;
export declare const drive_uploadFile: import("./types.js").ToolDef<{
    contentBase64: string;
    path: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    conflictBehavior?: "replace" | "fail" | "rename" | undefined;
}>;
export declare const drive_createFolder: import("./types.js").ToolDef<{
    name: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    parentPath?: string | undefined;
}>;
export declare const drive_deleteItem: import("./types.js").ToolDef<{
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    itemId?: string | undefined;
}>;
export declare const drive_createShareLink: import("./types.js").ToolDef<{
    password?: string | undefined;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    type?: "view" | "edit" | "embed" | undefined;
    itemId?: string | undefined;
    scope?: "users" | "anonymous" | "organization" | undefined;
    expirationDateTime?: string | undefined;
}>;
export declare const drive_search: import("./types.js").ToolDef<{
    query: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    top?: number | undefined;
}>;
export declare const drive_uploadLargeFile: import("./types.js").ToolDef<{
    contentBase64: string;
    path: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    conflictBehavior?: "replace" | "fail" | "rename" | undefined;
    chunkSizeMiB?: number | undefined;
}>;
export declare const onedriveTools: (import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}> | import("./types.js").ToolDef<{
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    itemId?: string | undefined;
}> | import("./types.js").ToolDef<{
    contentBase64: string;
    path: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    conflictBehavior?: "replace" | "fail" | "rename" | undefined;
}> | import("./types.js").ToolDef<{
    name: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    parentPath?: string | undefined;
}> | import("./types.js").ToolDef<{
    password?: string | undefined;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    path?: string | undefined;
    type?: "view" | "edit" | "embed" | undefined;
    itemId?: string | undefined;
    scope?: "users" | "anonymous" | "organization" | undefined;
    expirationDateTime?: string | undefined;
}> | import("./types.js").ToolDef<{
    query: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    top?: number | undefined;
}> | import("./types.js").ToolDef<{
    contentBase64: string;
    path: string;
    target?: {
        type: "me";
    } | {
        type: "user";
        user: string;
    } | {
        type: "site";
        siteId: string;
        driveId?: string | undefined;
    } | undefined;
    conflictBehavior?: "replace" | "fail" | "rename" | undefined;
    chunkSizeMiB?: number | undefined;
}>)[];
