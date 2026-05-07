export declare const omi_startSubscription: import("./types.js").ToolDef<{
    contentType: "Audit.AzureActiveDirectory" | "Audit.Exchange" | "Audit.SharePoint" | "Audit.General" | "DLP.All";
}>;
export declare const omi_listSubscriptions: import("./types.js").ToolDef<{}>;
export declare const omi_listContent: import("./types.js").ToolDef<{
    contentType: "Audit.AzureActiveDirectory" | "Audit.Exchange" | "Audit.SharePoint" | "Audit.General" | "DLP.All";
    startTime: string;
    endTime: string;
}>;
export declare const omi_getContent: import("./types.js").ToolDef<{
    contentUri: string;
}>;
export declare const omiTools: (import("./types.js").ToolDef<{
    contentType: "Audit.AzureActiveDirectory" | "Audit.Exchange" | "Audit.SharePoint" | "Audit.General" | "DLP.All";
}> | import("./types.js").ToolDef<{}> | import("./types.js").ToolDef<{
    contentType: "Audit.AzureActiveDirectory" | "Audit.Exchange" | "Audit.SharePoint" | "Audit.General" | "DLP.All";
    startTime: string;
    endTime: string;
}> | import("./types.js").ToolDef<{
    contentUri: string;
}>)[];
