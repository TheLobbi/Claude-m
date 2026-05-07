export declare const planner_listPlansForGroup: import("./types.js").ToolDef<{
    groupId: string;
}>;
export declare const planner_listMyPlans: import("./types.js").ToolDef<{}>;
export declare const planner_getPlan: import("./types.js").ToolDef<{
    planId: string;
}>;
export declare const planner_createPlan: import("./types.js").ToolDef<{
    groupId: string;
    title: string;
}>;
export declare const planner_listBuckets: import("./types.js").ToolDef<{
    planId: string;
}>;
export declare const planner_createBucket: import("./types.js").ToolDef<{
    name: string;
    planId: string;
    orderHint?: string | undefined;
}>;
export declare const planner_listTasks: import("./types.js").ToolDef<{
    search?: string | undefined;
    filter?: string | undefined;
    select?: string[] | undefined;
    top?: number | undefined;
    skip?: number | undefined;
    expand?: string[] | undefined;
    orderby?: string | undefined;
    count?: boolean | undefined;
    pageToken?: string | undefined;
    planId?: string | undefined;
    bucketId?: string | undefined;
}>;
export declare const planner_getTask: import("./types.js").ToolDef<{
    taskId: string;
    withDetails?: boolean | undefined;
}>;
export declare const planner_createTask: import("./types.js").ToolDef<{
    planId: string;
    title: string;
    bucketId?: string | undefined;
    assigneeIds?: string[] | undefined;
    dueDateTime?: string | undefined;
    startDateTime?: string | undefined;
    priority?: number | undefined;
    percentComplete?: number | undefined;
}>;
export declare const planner_updateTask: import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    taskId: string;
    etag: string;
}>;
export declare const planner_completeTask: import("./types.js").ToolDef<{
    taskId: string;
}>;
export declare const planner_deleteTask: import("./types.js").ToolDef<{
    taskId: string;
    etag: string;
}>;
export declare const planner_getTaskDetails: import("./types.js").ToolDef<{
    taskId: string;
}>;
export declare const planner_updateTaskDetails: import("./types.js").ToolDef<{
    taskId: string;
    etag: string;
    description?: string | undefined;
    checklist?: Record<string, unknown> | undefined;
    previewType?: "description" | "automatic" | "noPreview" | "checklist" | "reference" | undefined;
    references?: Record<string, unknown> | undefined;
}>;
export declare const plannerTools: (import("./types.js").ToolDef<{
    groupId: string;
}> | import("./types.js").ToolDef<{}> | import("./types.js").ToolDef<{
    planId: string;
}> | import("./types.js").ToolDef<{
    groupId: string;
    title: string;
}> | import("./types.js").ToolDef<{
    name: string;
    planId: string;
    orderHint?: string | undefined;
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
    planId?: string | undefined;
    bucketId?: string | undefined;
}> | import("./types.js").ToolDef<{
    taskId: string;
    withDetails?: boolean | undefined;
}> | import("./types.js").ToolDef<{
    planId: string;
    title: string;
    bucketId?: string | undefined;
    assigneeIds?: string[] | undefined;
    dueDateTime?: string | undefined;
    startDateTime?: string | undefined;
    priority?: number | undefined;
    percentComplete?: number | undefined;
}> | import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    taskId: string;
    etag: string;
}> | import("./types.js").ToolDef<{
    taskId: string;
}> | import("./types.js").ToolDef<{
    taskId: string;
    etag: string;
}> | import("./types.js").ToolDef<{
    taskId: string;
    etag: string;
    description?: string | undefined;
    checklist?: Record<string, unknown> | undefined;
    previewType?: "description" | "automatic" | "noPreview" | "checklist" | "reference" | undefined;
    references?: Record<string, unknown> | undefined;
}>)[];
