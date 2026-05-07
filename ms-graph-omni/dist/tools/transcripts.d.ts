export declare const transcripts_list: import("./types.js").ToolDef<{
    meetingId: string;
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
export declare const transcripts_get: import("./types.js").ToolDef<{
    meetingId: string;
    transcriptId: string;
    user?: string | undefined;
}>;
export declare const transcripts_getContent: import("./types.js").ToolDef<{
    meetingId: string;
    transcriptId: string;
    user?: string | undefined;
    format?: "text/vtt" | "text/plain" | undefined;
}>;
/**
 * Tenant-wide app-only: list every transcript a user organized.
 *
 * Useful for the morning-report / weekly-roundup pattern where the agent doesn't
 * yet have a specific meetingId — pull all of yesterday's transcripts and feed
 * them into a summarizer.
 */
export declare const transcripts_listByOrganizer: import("./types.js").ToolDef<{
    user: string;
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
export declare const recordings_list: import("./types.js").ToolDef<{
    meetingId: string;
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
export declare const recordings_get: import("./types.js").ToolDef<{
    meetingId: string;
    recordingId: string;
    user?: string | undefined;
}>;
export declare const recordings_getDownloadUrl: import("./types.js").ToolDef<{
    meetingId: string;
    recordingId: string;
    user?: string | undefined;
}>;
export declare const recordings_listByOrganizer: import("./types.js").ToolDef<{
    user: string;
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
export declare const transcriptsTools: (import("./types.js").ToolDef<{
    meetingId: string;
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
    transcriptId: string;
    user?: string | undefined;
}> | import("./types.js").ToolDef<{
    meetingId: string;
    transcriptId: string;
    user?: string | undefined;
    format?: "text/vtt" | "text/plain" | undefined;
}> | import("./types.js").ToolDef<{
    user: string;
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
    meetingId: string;
    recordingId: string;
    user?: string | undefined;
}>)[];
