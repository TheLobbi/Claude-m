export declare const search_query: import("./types.js").ToolDef<{
    query: string;
    entityTypes: ("message" | "list" | "site" | "driveItem" | "event" | "listItem" | "chatMessage" | "person" | "externalItem")[];
    from?: number | undefined;
    fields?: string[] | undefined;
    size?: number | undefined;
}>;
export declare const searchTools: import("./types.js").ToolDef<{
    query: string;
    entityTypes: ("message" | "list" | "site" | "driveItem" | "event" | "listItem" | "chatMessage" | "person" | "externalItem")[];
    from?: number | undefined;
    fields?: string[] | undefined;
    size?: number | undefined;
}>[];
