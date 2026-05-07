export declare const groups_list: import("./types.js").ToolDef<{
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
export declare const groups_get: import("./types.js").ToolDef<{
    groupId: string;
    select?: string[] | undefined;
    expand?: string[] | undefined;
}>;
export declare const groups_create: import("./types.js").ToolDef<{
    displayName: string;
    mailNickname: string;
    description?: string | undefined;
    groupType?: "security" | "M365" | "distribution" | undefined;
    visibility?: "Private" | "Public" | "HiddenMembership" | undefined;
    ownerIds?: string[] | undefined;
    memberIds?: string[] | undefined;
}>;
export declare const groups_update: import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    groupId: string;
}>;
export declare const groups_delete: import("./types.js").ToolDef<{
    groupId: string;
}>;
export declare const groups_listMembers: import("./types.js").ToolDef<{
    groupId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    transitive?: boolean | undefined;
}>;
export declare const groups_addMember: import("./types.js").ToolDef<{
    groupId: string;
    memberId: string;
}>;
export declare const groups_removeMember: import("./types.js").ToolDef<{
    groupId: string;
    memberId: string;
}>;
export declare const groups_listOwners: import("./types.js").ToolDef<{
    groupId: string;
}>;
export declare const groups_addOwner: import("./types.js").ToolDef<{
    groupId: string;
    ownerId: string;
}>;
export declare const groupsTools: (import("./types.js").ToolDef<{
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
    groupId: string;
    select?: string[] | undefined;
    expand?: string[] | undefined;
}> | import("./types.js").ToolDef<{
    displayName: string;
    mailNickname: string;
    description?: string | undefined;
    groupType?: "security" | "M365" | "distribution" | undefined;
    visibility?: "Private" | "Public" | "HiddenMembership" | undefined;
    ownerIds?: string[] | undefined;
    memberIds?: string[] | undefined;
}> | import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    groupId: string;
}> | import("./types.js").ToolDef<{
    groupId: string;
}> | import("./types.js").ToolDef<{
    groupId: string;
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    transitive?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    groupId: string;
    memberId: string;
}> | import("./types.js").ToolDef<{
    groupId: string;
    ownerId: string;
}>)[];
