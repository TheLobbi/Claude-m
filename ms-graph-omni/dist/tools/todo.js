import { z } from "zod";
import { applyListOptions, ListOptionsSchema, makeTool } from "./_helpers.js";
export const todo_listLists = makeTool({
    name: "todo_listLists",
    description: "List the user's To Do task lists.",
    mode: "delegated",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => applyListOptions(client.api("/me/todo/lists"), opts).get(),
});
export const todo_createList = makeTool({
    name: "todo_createList",
    description: "Create a new To Do task list.",
    mode: "delegated",
    inputSchema: z.object({ displayName: z.string() }),
    call: async ({ displayName }, client) => client.api("/me/todo/lists").post({ displayName }),
});
export const todo_listTasks = makeTool({
    name: "todo_listTasks",
    description: "List tasks in a To Do list. Retries once without select/orderby/expand on a 400 (Graph occasionally rejects those query opts on the well-known defaultList).",
    mode: "delegated",
    inputSchema: ListOptionsSchema.extend({ listId: z.string() }),
    call: async ({ listId, ...opts }, client) => {
        const url = `/me/todo/lists/${listId}/tasks`;
        try {
            return await applyListOptions(client.api(url), opts).get();
        }
        catch (err) {
            const status = err?.statusCode ?? err?.status;
            const looksLikeQueryQuirk = status === 400 && /invalid request/i.test(err?.message ?? "");
            if (!looksLikeQueryQuirk)
                throw err;
            const slim = { top: opts.top, skip: opts.skip, filter: opts.filter, count: opts.count };
            return await applyListOptions(client.api(url), slim).get();
        }
    },
});
export const todo_createTask = makeTool({
    name: "todo_createTask",
    description: "Create a new To Do task.",
    mode: "delegated",
    inputSchema: z.object({
        listId: z.string(),
        title: z.string(),
        body: z.string().optional(),
        dueDateTime: z.string().optional(),
        importance: z.enum(["low", "normal", "high"]).optional(),
        reminderDateTime: z.string().optional(),
    }),
    call: async ({ listId, title, body, dueDateTime, importance, reminderDateTime }, client) => {
        const payload = { title };
        if (body)
            payload.body = { content: body, contentType: "text" };
        if (dueDateTime)
            payload.dueDateTime = { dateTime: dueDateTime, timeZone: "UTC" };
        if (importance)
            payload.importance = importance;
        if (reminderDateTime)
            payload.reminderDateTime = { dateTime: reminderDateTime, timeZone: "UTC" };
        return await client.api(`/me/todo/lists/${listId}/tasks`).post(payload);
    },
});
export const todo_updateTask = makeTool({
    name: "todo_updateTask",
    description: "Patch a To Do task.",
    mode: "delegated",
    inputSchema: z.object({
        listId: z.string(),
        taskId: z.string(),
        patch: z.record(z.string(), z.unknown()),
    }),
    call: async ({ listId, taskId, patch }, client) => client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).patch(patch),
});
export const todo_completeTask = makeTool({
    name: "todo_completeTask",
    description: "Mark a To Do task complete.",
    mode: "delegated",
    inputSchema: z.object({ listId: z.string(), taskId: z.string() }),
    call: async ({ listId, taskId }, client) => client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).patch({ status: "completed" }),
});
export const todo_deleteTask = makeTool({
    name: "todo_deleteTask",
    description: "Delete a To Do task.",
    mode: "delegated",
    inputSchema: z.object({ listId: z.string(), taskId: z.string() }),
    call: async ({ listId, taskId }, client) => {
        await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).delete();
        return { ok: true };
    },
});
export const todoTools = [
    todo_listLists,
    todo_createList,
    todo_listTasks,
    todo_createTask,
    todo_updateTask,
    todo_completeTask,
    todo_deleteTask,
];
//# sourceMappingURL=todo.js.map