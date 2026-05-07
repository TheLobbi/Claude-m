export declare const azure_listSubscriptions: import("./types.js").ToolDef<{}>;
export declare const azure_listResourceGroups: import("./types.js").ToolDef<{
    subscriptionId: string;
}>;
export declare const azure_listResources: import("./types.js").ToolDef<{
    subscriptionId: string;
    resourceGroupName?: string | undefined;
}>;
export declare const azureTools: (import("./types.js").ToolDef<{}> | import("./types.js").ToolDef<{
    subscriptionId: string;
}> | import("./types.js").ToolDef<{
    subscriptionId: string;
    resourceGroupName?: string | undefined;
}>)[];
