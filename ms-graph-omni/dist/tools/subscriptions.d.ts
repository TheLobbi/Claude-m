export declare const subscriptions_list: import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    tenantSlug?: string | undefined;
}>;
export declare const subscriptions_get: import("./types.js").ToolDef<{
    subscriptionId: string;
    tenantSlug?: string | undefined;
}>;
export declare const subscriptions_create: import("./types.js").ToolDef<{
    resource: string;
    notificationUrl: string;
    tenantSlug?: string | undefined;
    expirationDateTime?: string | undefined;
    resourcePreset?: "users" | "groups" | "callRecords" | "me/messages" | "me/mailFolders/inbox/messages" | "me/events" | "me/drive/root" | "me/contacts" | "me/chats/getAllMessages" | undefined;
    changeType?: "created" | "updated" | "deleted" | "created,updated" | "created,updated,deleted" | undefined;
    lifecycleNotificationUrl?: string | undefined;
    clientState?: string | undefined;
    includeResourceData?: boolean | undefined;
    encryptionCertificate?: string | undefined;
    encryptionCertificateId?: string | undefined;
}>;
export declare const subscriptions_renew: import("./types.js").ToolDef<{
    subscriptionId: string;
    tenantSlug?: string | undefined;
    expirationDateTime?: string | undefined;
}>;
export declare const subscriptions_delete: import("./types.js").ToolDef<{
    subscriptionId: string;
    tenantSlug?: string | undefined;
}>;
export declare const subscriptionsTools: (import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    tenantSlug?: string | undefined;
}> | import("./types.js").ToolDef<{
    subscriptionId: string;
    tenantSlug?: string | undefined;
}> | import("./types.js").ToolDef<{
    resource: string;
    notificationUrl: string;
    tenantSlug?: string | undefined;
    expirationDateTime?: string | undefined;
    resourcePreset?: "users" | "groups" | "callRecords" | "me/messages" | "me/mailFolders/inbox/messages" | "me/events" | "me/drive/root" | "me/contacts" | "me/chats/getAllMessages" | undefined;
    changeType?: "created" | "updated" | "deleted" | "created,updated" | "created,updated,deleted" | undefined;
    lifecycleNotificationUrl?: string | undefined;
    clientState?: string | undefined;
    includeResourceData?: boolean | undefined;
    encryptionCertificate?: string | undefined;
    encryptionCertificateId?: string | undefined;
}> | import("./types.js").ToolDef<{
    subscriptionId: string;
    tenantSlug?: string | undefined;
    expirationDateTime?: string | undefined;
}>)[];
