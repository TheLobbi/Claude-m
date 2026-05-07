export declare const calendar_listEvents: import("./types.js").ToolDef<{
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
    calendarId?: string | undefined;
}>;
export declare const calendar_getEvent: import("./types.js").ToolDef<{
    eventId: string;
    user?: string | undefined;
}>;
export declare const calendar_createEvent: import("./types.js").ToolDef<{
    subject: string;
    start: string;
    end: string;
    user?: string | undefined;
    importance?: "low" | "normal" | "high" | undefined;
    body?: string | undefined;
    bodyType?: "text" | "html" | undefined;
    attendees?: string[] | undefined;
    location?: string | undefined;
    isOnlineMeeting?: boolean | undefined;
    categories?: string[] | undefined;
    showAs?: "unknown" | "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | undefined;
    timeZone?: string | undefined;
    reminderMinutesBeforeStart?: number | undefined;
}>;
export declare const calendar_updateEvent: import("./types.js").ToolDef<{
    eventId: string;
    user?: string | undefined;
    subject?: string | undefined;
    body?: string | undefined;
    bodyType?: "text" | "html" | undefined;
    start?: string | undefined;
    end?: string | undefined;
    location?: string | undefined;
    timeZone?: string | undefined;
}>;
export declare const calendar_deleteEvent: import("./types.js").ToolDef<{
    eventId: string;
    user?: string | undefined;
}>;
export declare const calendar_findMeetingTimes: import("./types.js").ToolDef<{
    attendees: string[];
    user?: string | undefined;
    timeZone?: string | undefined;
    durationMinutes?: number | undefined;
    earliest?: string | undefined;
    latest?: string | undefined;
    maxCandidates?: number | undefined;
}>;
export declare const calendar_getSchedule: import("./types.js").ToolDef<{
    start: string;
    end: string;
    schedules: string[];
    user?: string | undefined;
    timeZone?: string | undefined;
    availabilityViewInterval?: number | undefined;
}>;
export declare const calendarTools: (import("./types.js").ToolDef<{
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
    calendarId?: string | undefined;
}> | import("./types.js").ToolDef<{
    eventId: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    subject: string;
    start: string;
    end: string;
    user?: string | undefined;
    importance?: "low" | "normal" | "high" | undefined;
    body?: string | undefined;
    bodyType?: "text" | "html" | undefined;
    attendees?: string[] | undefined;
    location?: string | undefined;
    isOnlineMeeting?: boolean | undefined;
    categories?: string[] | undefined;
    showAs?: "unknown" | "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | undefined;
    timeZone?: string | undefined;
    reminderMinutesBeforeStart?: number | undefined;
}> | import("./types.js").ToolDef<{
    eventId: string;
    user?: string | undefined;
    subject?: string | undefined;
    body?: string | undefined;
    bodyType?: "text" | "html" | undefined;
    start?: string | undefined;
    end?: string | undefined;
    location?: string | undefined;
    timeZone?: string | undefined;
}> | import("./types.js").ToolDef<{
    attendees: string[];
    user?: string | undefined;
    timeZone?: string | undefined;
    durationMinutes?: number | undefined;
    earliest?: string | undefined;
    latest?: string | undefined;
    maxCandidates?: number | undefined;
}> | import("./types.js").ToolDef<{
    start: string;
    end: string;
    schedules: string[];
    user?: string | undefined;
    timeZone?: string | undefined;
    availabilityViewInterval?: number | undefined;
}>)[];
