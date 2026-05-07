export declare const callRecords_list: import("./types.js").ToolDef<{
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
export declare const callRecords_get: import("./types.js").ToolDef<{
    callRecordId: string;
    expand?: ("sessions" | "participants_v2" | "sessions($expand=segments)")[] | undefined;
}>;
export declare const callRecords_listSessions: import("./types.js").ToolDef<{
    callRecordId: string;
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
export declare const callRecords_listParticipants: import("./types.js").ToolDef<{
    callRecordId: string;
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
export declare const callRecords_getPstnCalls: import("./types.js").ToolDef<{
    fromDateTime: string;
    toDateTime: string;
}>;
export declare const callRecords_getDirectRoutingCalls: import("./types.js").ToolDef<{
    fromDateTime: string;
    toDateTime: string;
}>;
export declare const callRecordsTools: (import("./types.js").ToolDef<{
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
    callRecordId: string;
    expand?: ("sessions" | "participants_v2" | "sessions($expand=segments)")[] | undefined;
}> | import("./types.js").ToolDef<{
    callRecordId: string;
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
    fromDateTime: string;
    toDateTime: string;
}>)[];
