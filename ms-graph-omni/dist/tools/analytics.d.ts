export declare const powerbi_listWorkspaces: import("./types.js").ToolDef<{}>;
export declare const powerbi_listReports: import("./types.js").ToolDef<{
    workspaceId: string;
}>;
export declare const powerbi_listDatasets: import("./types.js").ToolDef<{
    workspaceId: string;
}>;
export declare const fabric_listWorkspaces: import("./types.js").ToolDef<{}>;
export declare const fabric_listItems: import("./types.js").ToolDef<{
    workspaceId: string;
}>;
export declare const analyticsTools: (import("./types.js").ToolDef<{}> | import("./types.js").ToolDef<{
    workspaceId: string;
}>)[];
