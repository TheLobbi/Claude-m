export declare const excel_listWorksheets: import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
}>;
export declare const excel_getRange: import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    worksheetName: string;
    range: string;
    valuesOnly?: boolean | undefined;
}>;
export declare const excel_updateRange: import("./types.js").ToolDef<{
    values: (string | number | boolean | null)[][];
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    worksheetName: string;
    range: string;
}>;
export declare const excel_listTables: import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    worksheetName?: string | undefined;
}>;
export declare const excel_addRowsToTable: import("./types.js").ToolDef<{
    values: (string | number | boolean | null)[][];
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    tableNameOrId: string;
}>;
export declare const excel_createSession: import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    persistChanges?: boolean | undefined;
}>;
export declare const excelTools: (import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
}> | import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    worksheetName: string;
    range: string;
    valuesOnly?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    values: (string | number | boolean | null)[][];
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    worksheetName: string;
    range: string;
}> | import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    worksheetName?: string | undefined;
}> | import("./types.js").ToolDef<{
    values: (string | number | boolean | null)[][];
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    tableNameOrId: string;
}> | import("./types.js").ToolDef<{
    target: {
        type: "me";
        itemId: string;
    } | {
        type: "user";
        userId: string;
        itemId: string;
    } | {
        type: "site";
        siteId: string;
        itemId: string;
        driveId?: string | undefined;
    };
    persistChanges?: boolean | undefined;
}>)[];
