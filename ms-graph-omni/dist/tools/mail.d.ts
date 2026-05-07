export declare const mail_listMessages: import("./types.js").ToolDef<{
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
    folderId?: string | undefined;
}>;
export declare const mail_searchMessages: import("./types.js").ToolDef<{
    query: string;
    select?: string[] | undefined;
    top?: number | undefined;
    user?: string | undefined;
}>;
export declare const mail_getMessage: import("./types.js").ToolDef<{
    messageId: string;
    expand?: string[] | undefined;
    user?: string | undefined;
}>;
export declare const mail_sendMail: import("./types.js").ToolDef<{
    subject: string;
    to: string[];
    body: string;
    user?: string | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    bodyType?: "text" | "html" | undefined;
    saveToSentItems?: boolean | undefined;
    attachments?: {
        contentBase64: string;
        name: string;
        contentType?: string | undefined;
    }[] | undefined;
    replyTo?: string[] | undefined;
}>;
export declare const mail_createDraft: import("./types.js").ToolDef<{
    subject: string;
    body: string;
    user?: string | undefined;
    to?: string[] | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    bodyType?: "text" | "html" | undefined;
}>;
export declare const mail_replyMessage: import("./types.js").ToolDef<{
    messageId: string;
    comment: string;
    user?: string | undefined;
    replyAll?: boolean | undefined;
}>;
export declare const mail_forwardMessage: import("./types.js").ToolDef<{
    messageId: string;
    to: string[];
    user?: string | undefined;
    comment?: string | undefined;
}>;
export declare const mail_moveMessage: import("./types.js").ToolDef<{
    messageId: string;
    destinationId: string;
    user?: string | undefined;
}>;
export declare const mail_deleteMessage: import("./types.js").ToolDef<{
    messageId: string;
    user?: string | undefined;
}>;
export declare const mail_listFolders: import("./types.js").ToolDef<{
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
    includeHidden?: boolean | undefined;
}>;
export declare const mailTools: (import("./types.js").ToolDef<{
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
    folderId?: string | undefined;
}> | import("./types.js").ToolDef<{
    query: string;
    select?: string[] | undefined;
    top?: number | undefined;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    messageId: string;
    expand?: string[] | undefined;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    subject: string;
    to: string[];
    body: string;
    user?: string | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    bodyType?: "text" | "html" | undefined;
    saveToSentItems?: boolean | undefined;
    attachments?: {
        contentBase64: string;
        name: string;
        contentType?: string | undefined;
    }[] | undefined;
    replyTo?: string[] | undefined;
}> | import("./types.js").ToolDef<{
    subject: string;
    body: string;
    user?: string | undefined;
    to?: string[] | undefined;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
    bodyType?: "text" | "html" | undefined;
}> | import("./types.js").ToolDef<{
    messageId: string;
    comment: string;
    user?: string | undefined;
    replyAll?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    messageId: string;
    to: string[];
    user?: string | undefined;
    comment?: string | undefined;
}> | import("./types.js").ToolDef<{
    messageId: string;
    destinationId: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    messageId: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
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
    includeHidden?: boolean | undefined;
}>)[];
