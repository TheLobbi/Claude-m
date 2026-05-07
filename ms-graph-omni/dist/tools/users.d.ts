export declare const users_list: import("./types.js").ToolDef<{
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
export declare const users_get: import("./types.js").ToolDef<{
    user: string;
    select?: string[] | undefined;
    expand?: string[] | undefined;
}>;
export declare const users_create: import("./types.js").ToolDef<{
    password: string;
    displayName: string;
    mailNickname: string;
    userPrincipalName: string;
    givenName?: string | undefined;
    surname?: string | undefined;
    jobTitle?: string | undefined;
    accountEnabled?: boolean | undefined;
    forceChangePasswordNextSignIn?: boolean | undefined;
    department?: string | undefined;
    usageLocation?: string | undefined;
}>;
export declare const users_update: import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    user: string;
}>;
export declare const users_delete: import("./types.js").ToolDef<{
    user: string;
}>;
export declare const users_listManager: import("./types.js").ToolDef<{
    user: string;
}>;
export declare const users_listMemberOf: import("./types.js").ToolDef<{
    user: string;
    transitive?: boolean | undefined;
}>;
export declare const users_assignLicense: import("./types.js").ToolDef<{
    user: string;
    addSkus?: string[] | undefined;
    removeSkus?: string[] | undefined;
    disabledServicePlans?: string[] | undefined;
}>;
export declare const users_listLicenses: import("./types.js").ToolDef<{
    user: string;
}>;
export declare const users_resetPassword: import("./types.js").ToolDef<{
    user: string;
    newPassword: string;
    forceChangeNextSignIn?: boolean | undefined;
}>;
export declare const usersTools: (import("./types.js").ToolDef<{
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
    user: string;
    select?: string[] | undefined;
    expand?: string[] | undefined;
}> | import("./types.js").ToolDef<{
    password: string;
    displayName: string;
    mailNickname: string;
    userPrincipalName: string;
    givenName?: string | undefined;
    surname?: string | undefined;
    jobTitle?: string | undefined;
    accountEnabled?: boolean | undefined;
    forceChangePasswordNextSignIn?: boolean | undefined;
    department?: string | undefined;
    usageLocation?: string | undefined;
}> | import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    user: string;
}> | import("./types.js").ToolDef<{
    user: string;
}> | import("./types.js").ToolDef<{
    user: string;
    transitive?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    user: string;
    addSkus?: string[] | undefined;
    removeSkus?: string[] | undefined;
    disabledServicePlans?: string[] | undefined;
}> | import("./types.js").ToolDef<{
    user: string;
    newPassword: string;
    forceChangeNextSignIn?: boolean | undefined;
}>)[];
