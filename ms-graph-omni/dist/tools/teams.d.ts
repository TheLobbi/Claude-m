export declare const teams_list: import("./types.js").ToolDef<{
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
export declare const teams_get: import("./types.js").ToolDef<{
    teamId: string;
}>;
export declare const teams_create: import("./types.js").ToolDef<{
    displayName: string;
    ownerIds: string[];
    description?: string | undefined;
    visibility?: "public" | "private" | undefined;
    teamTemplate?: string | undefined;
}>;
export declare const teams_archive: import("./types.js").ToolDef<{
    teamId: string;
    unarchive?: boolean | undefined;
}>;
export declare const teams_listChannels: import("./types.js").ToolDef<{
    teamId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}>;
export declare const teams_createChannel: import("./types.js").ToolDef<{
    displayName: string;
    teamId: string;
    description?: string | undefined;
    membershipType?: "standard" | "private" | "shared" | undefined;
}>;
export declare const teams_listChannelMessages: import("./types.js").ToolDef<{
    teamId: string;
    channelId: string;
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
export declare const teams_sendChannelMessage: import("./types.js").ToolDef<{
    body: string;
    teamId: string;
    channelId: string;
    subject?: string | undefined;
    importance?: "normal" | "high" | "urgent" | undefined;
    bodyType?: "text" | "html" | undefined;
    mentions?: {
        id: number;
        mentionText: string;
        userId: string;
        userDisplayName?: string | undefined;
    }[] | undefined;
}>;
export declare const teams_replyToChannelMessage: import("./types.js").ToolDef<{
    messageId: string;
    body: string;
    teamId: string;
    channelId: string;
    bodyType?: "text" | "html" | undefined;
}>;
export declare const teams_listChats: import("./types.js").ToolDef<{
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
export declare const teams_sendChatMessage: import("./types.js").ToolDef<{
    body: string;
    chatId: string;
    bodyType?: "text" | "html" | undefined;
}>;
export declare const teams_createChat: import("./types.js").ToolDef<{
    chatType: "oneOnOne" | "group";
    userIds: string[];
    topic?: string | undefined;
}>;
export declare const teamsTools: (import("./types.js").ToolDef<{
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
    teamId: string;
}> | import("./types.js").ToolDef<{
    displayName: string;
    ownerIds: string[];
    description?: string | undefined;
    visibility?: "public" | "private" | undefined;
    teamTemplate?: string | undefined;
}> | import("./types.js").ToolDef<{
    teamId: string;
    unarchive?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    teamId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
}> | import("./types.js").ToolDef<{
    displayName: string;
    teamId: string;
    description?: string | undefined;
    membershipType?: "standard" | "private" | "shared" | undefined;
}> | import("./types.js").ToolDef<{
    teamId: string;
    channelId: string;
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
    body: string;
    teamId: string;
    channelId: string;
    subject?: string | undefined;
    importance?: "normal" | "high" | "urgent" | undefined;
    bodyType?: "text" | "html" | undefined;
    mentions?: {
        id: number;
        mentionText: string;
        userId: string;
        userDisplayName?: string | undefined;
    }[] | undefined;
}> | import("./types.js").ToolDef<{
    messageId: string;
    body: string;
    teamId: string;
    channelId: string;
    bodyType?: "text" | "html" | undefined;
}> | import("./types.js").ToolDef<{
    body: string;
    chatId: string;
    bodyType?: "text" | "html" | undefined;
}> | import("./types.js").ToolDef<{
    chatType: "oneOnOne" | "group";
    userIds: string[];
    topic?: string | undefined;
}>)[];
