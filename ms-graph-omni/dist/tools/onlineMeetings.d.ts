export declare const onlineMeetings_list: import("./types.js").ToolDef<{
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
export declare const onlineMeetings_get: import("./types.js").ToolDef<{
    meetingId: string;
    user?: string | undefined;
}>;
export declare const onlineMeetings_listByJoinWebUrl: import("./types.js").ToolDef<{
    joinWebUrl: string;
    user?: string | undefined;
}>;
export declare const onlineMeetings_create: import("./types.js").ToolDef<{
    subject: string;
    startDateTime: string;
    endDateTime: string;
    user?: string | undefined;
    attendees?: string[] | undefined;
    isEntryExitAnnounced?: boolean | undefined;
    allowedPresenters?: "organizer" | "organization" | "everyone" | "roleIsPresenter" | "unknownFutureValue" | undefined;
    allowAttendeeToEnableCamera?: boolean | undefined;
    allowAttendeeToEnableMic?: boolean | undefined;
    allowMeetingChat?: "unknownFutureValue" | "enabled" | "disabled" | "limited" | undefined;
    lobbyBypassScope?: "organizer" | "organization" | "everyone" | "unknownFutureValue" | "organizationAndFederated" | "invited" | "organizationExcludingGuests" | undefined;
    recordAutomatically?: boolean | undefined;
}>;
export declare const onlineMeetings_update: import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    meetingId: string;
    user?: string | undefined;
}>;
export declare const onlineMeetings_delete: import("./types.js").ToolDef<{
    meetingId: string;
    user?: string | undefined;
}>;
export declare const onlineMeetingsTools: (import("./types.js").ToolDef<{
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
    meetingId: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    joinWebUrl: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    subject: string;
    startDateTime: string;
    endDateTime: string;
    user?: string | undefined;
    attendees?: string[] | undefined;
    isEntryExitAnnounced?: boolean | undefined;
    allowedPresenters?: "organizer" | "organization" | "everyone" | "roleIsPresenter" | "unknownFutureValue" | undefined;
    allowAttendeeToEnableCamera?: boolean | undefined;
    allowAttendeeToEnableMic?: boolean | undefined;
    allowMeetingChat?: "unknownFutureValue" | "enabled" | "disabled" | "limited" | undefined;
    lobbyBypassScope?: "organizer" | "organization" | "everyone" | "unknownFutureValue" | "organizationAndFederated" | "invited" | "organizationExcludingGuests" | undefined;
    recordAutomatically?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    meetingId: string;
    user?: string | undefined;
}>)[];
