export declare const contacts_list: import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
}>;
export declare const contacts_get: import("./types.js").ToolDef<{
    contactId: string;
    user?: string | undefined;
}>;
export declare const contacts_create: import("./types.js").ToolDef<{
    displayName?: string | undefined;
    businessPhones?: string[] | undefined;
    user?: string | undefined;
    givenName?: string | undefined;
    surname?: string | undefined;
    emailAddresses?: {
        address: string;
        name?: string | undefined;
    }[] | undefined;
    mobilePhone?: string | undefined;
    companyName?: string | undefined;
    jobTitle?: string | undefined;
}>;
export declare const contacts_update: import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    contactId: string;
    user?: string | undefined;
}>;
export declare const contacts_delete: import("./types.js").ToolDef<{
    contactId: string;
    user?: string | undefined;
}>;
export declare const contactsTools: (import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    contactId: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    displayName?: string | undefined;
    businessPhones?: string[] | undefined;
    user?: string | undefined;
    givenName?: string | undefined;
    surname?: string | undefined;
    emailAddresses?: {
        address: string;
        name?: string | undefined;
    }[] | undefined;
    mobilePhone?: string | undefined;
    companyName?: string | undefined;
    jobTitle?: string | undefined;
}> | import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    contactId: string;
    user?: string | undefined;
}>)[];
