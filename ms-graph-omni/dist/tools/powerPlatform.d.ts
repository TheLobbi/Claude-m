export declare const powerPlatform_listEnvironments: import("./types.js").ToolDef<{}>;
export declare const powerPlatform_listDlpPolicies: import("./types.js").ToolDef<{}>;
export declare const powerApps_listApps: import("./types.js").ToolDef<{
    environmentName: string;
}>;
export declare const powerAutomate_listFlows: import("./types.js").ToolDef<{
    environmentName: string;
}>;
export declare const dataverse_listTables: import("./types.js").ToolDef<{
    environmentUrl: string;
}>;
export declare const powerPlatformTools: (import("./types.js").ToolDef<{}> | import("./types.js").ToolDef<{
    environmentName: string;
}> | import("./types.js").ToolDef<{
    environmentUrl: string;
}>)[];
