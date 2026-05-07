export declare const todo_listLists: import("./types.js").ToolDef<{
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
export declare const todo_createList: import("./types.js").ToolDef<{
    displayName: string;
}>;
export declare const todo_listTasks: import("./types.js").ToolDef<{
    listId: string;
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
export declare const todo_createTask: import("./types.js").ToolDef<{
    listId: string;
    title: string;
    importance?: "low" | "normal" | "high" | undefined;
    body?: string | undefined;
    dueDateTime?: string | undefined;
    reminderDateTime?: string | undefined;
}>;
export declare const todo_updateTask: import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    listId: string;
    taskId: string;
}>;
export declare const todo_completeTask: import("./types.js").ToolDef<{
    listId: string;
    taskId: string;
}>;
export declare const todo_deleteTask: import("./types.js").ToolDef<{
    listId: string;
    taskId: string;
}>;
export declare const todoTools: (import("./types.js").ToolDef<{
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
    displayName: string;
}> | import("./types.js").ToolDef<{
    listId: string;
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
    listId: string;
    title: string;
    importance?: "low" | "normal" | "high" | undefined;
    body?: string | undefined;
    dueDateTime?: string | undefined;
    reminderDateTime?: string | undefined;
}> | import("./types.js").ToolDef<{
    patch: Record<string, unknown>;
    listId: string;
    taskId: string;
}> | import("./types.js").ToolDef<{
    listId: string;
    taskId: string;
}>)[];
