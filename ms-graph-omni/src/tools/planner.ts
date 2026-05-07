/**
 * Microsoft Planner — group-based project planning.
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, makeTool } from "./_helpers.js";

export const planner_listPlansForGroup = makeTool({
  name: "planner_listPlansForGroup",
  description: "List Planner plans owned by an M365 group.",
  mode: "delegated",
  inputSchema: z.object({ groupId: z.string() }),
  call: async ({ groupId }, client) => client.api(`/groups/${groupId}/planner/plans`).get(),
});

export const planner_listMyPlans = makeTool({
  name: "planner_listMyPlans",
  description: "List all Planner plans the current user can access.",
  mode: "delegated",
  inputSchema: z.object({}),
  call: async (_input, client) => client.api(`/me/planner/plans`).get(),
});

export const planner_getPlan = makeTool({
  name: "planner_getPlan",
  description: "Get a Planner plan by id including details.",
  mode: "delegated",
  inputSchema: z.object({ planId: z.string() }),
  call: async ({ planId }, client) => client.api(`/planner/plans/${planId}`).get(),
});

export const planner_createPlan = makeTool({
  name: "planner_createPlan",
  description: "Create a new Planner plan owned by an M365 group.",
  mode: "delegated",
  inputSchema: z.object({
    groupId: z.string(),
    title: z.string(),
  }),
  call: async ({ groupId, title }, client) =>
    client.api(`/planner/plans`).post({ owner: groupId, title }),
});

export const planner_listBuckets = makeTool({
  name: "planner_listBuckets",
  description: "List buckets (columns) within a plan.",
  mode: "delegated",
  inputSchema: z.object({ planId: z.string() }),
  call: async ({ planId }, client) => client.api(`/planner/plans/${planId}/buckets`).get(),
});

export const planner_createBucket = makeTool({
  name: "planner_createBucket",
  description: "Create a new bucket in a plan.",
  mode: "delegated",
  inputSchema: z.object({
    planId: z.string(),
    name: z.string(),
    orderHint: z.string().optional().describe("Use ' !' to put at the end (Planner convention)."),
  }),
  call: async ({ planId, name, orderHint }, client) =>
    client.api(`/planner/buckets`).post({ planId, name, orderHint: orderHint ?? " !" }),
});

export const planner_listTasks = makeTool({
  name: "planner_listTasks",
  description: "List tasks in a plan (or bucket if bucketId provided).",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({
    planId: z.string().optional(),
    bucketId: z.string().optional(),
  }),
  call: async ({ planId, bucketId, ...opts }, client) => {
    if (!planId && !bucketId) throw new Error("Provide planId or bucketId");
    const path = bucketId ? `/planner/buckets/${bucketId}/tasks` : `/planner/plans/${planId}/tasks`;
    return await applyListOptions(client.api(path), opts).get();
  },
});

export const planner_getTask = makeTool({
  name: "planner_getTask",
  description: "Get a Planner task with details (description, checklist, references).",
  mode: "delegated",
  inputSchema: z.object({ taskId: z.string(), withDetails: z.boolean().default(true) }),
  call: async ({ taskId, withDetails }, client) => {
    const task = await client.api(`/planner/tasks/${taskId}`).get();
    if (withDetails) {
      const details = await client.api(`/planner/tasks/${taskId}/details`).get();
      return { ...task, details };
    }
    return task;
  },
});

export const planner_createTask = makeTool({
  name: "planner_createTask",
  description: "Create a new Planner task in a plan/bucket. Set assigneeIds to assign to users.",
  mode: "delegated",
  inputSchema: z.object({
    planId: z.string(),
    bucketId: z.string().optional(),
    title: z.string(),
    assigneeIds: z.array(z.string()).optional(),
    dueDateTime: z.string().optional(),
    startDateTime: z.string().optional(),
    priority: z.number().int().min(0).max(10).optional(),
    percentComplete: z.number().int().min(0).max(100).optional(),
  }),
  call: async (input, client) => {
    const payload: any = { planId: input.planId, title: input.title };
    if (input.bucketId) payload.bucketId = input.bucketId;
    if (input.dueDateTime) payload.dueDateTime = input.dueDateTime;
    if (input.startDateTime) payload.startDateTime = input.startDateTime;
    if (input.priority !== undefined) payload.priority = input.priority;
    if (input.percentComplete !== undefined) payload.percentComplete = input.percentComplete;
    if (input.assigneeIds?.length) {
      payload.assignments = Object.fromEntries(
        input.assigneeIds.map((id) => [
          id,
          { "@odata.type": "#microsoft.graph.plannerAssignment", orderHint: " !" },
        ])
      );
    }
    return await client.api(`/planner/tasks`).post(payload);
  },
});

export const planner_updateTask = makeTool({
  name: "planner_updateTask",
  description: "Update a Planner task. Requires the @etag from getTask via If-Match header.",
  mode: "delegated",
  inputSchema: z.object({
    taskId: z.string(),
    etag: z.string().describe("@odata.etag from previous getTask call. If-Match enforced."),
    patch: z.record(z.string(), z.unknown()),
  }),
  call: async ({ taskId, etag, patch }, client) =>
    client.api(`/planner/tasks/${taskId}`).header("If-Match", etag).patch(patch),
});

export const planner_completeTask = makeTool({
  name: "planner_completeTask",
  description: "Convenience: mark a task 100% complete.",
  mode: "delegated",
  inputSchema: z.object({ taskId: z.string() }),
  call: async ({ taskId }, client) => {
    const current = await client.api(`/planner/tasks/${taskId}`).get();
    return await client
      .api(`/planner/tasks/${taskId}`)
      .header("If-Match", current["@odata.etag"])
      .patch({ percentComplete: 100 });
  },
});

export const planner_deleteTask = makeTool({
  name: "planner_deleteTask",
  description: "Delete a Planner task.",
  mode: "delegated",
  inputSchema: z.object({ taskId: z.string(), etag: z.string() }),
  call: async ({ taskId, etag }, client) => {
    await client.api(`/planner/tasks/${taskId}`).header("If-Match", etag).delete();
    return { ok: true };
  },
});

export const planner_getTaskDetails = makeTool({
  name: "planner_getTaskDetails",
  description: "Get a Planner task's details: long description, checklist items, references (file links), preview type. Use this to read existing details before patching.",
  mode: "delegated",
  inputSchema: z.object({ taskId: z.string() }),
  call: async ({ taskId }, client) => client.api(`/planner/tasks/${taskId}/details`).get(),
});

export const planner_updateTaskDetails = makeTool({
  name: "planner_updateTaskDetails",
  description: "Update a Planner task's details (description, checklist items, references). Requires the @odata.etag from a prior planner_getTaskDetails call. Pass `description` for long body text. Pass `checklist` as an object map: { 'tempId1': { '@odata.type': 'microsoft.graph.plannerChecklistItem', title: 'Step 1', isChecked: false } }. Pass `references` as a URL-keyed map: { 'https%3A//example.com/file.docx': { '@odata.type': 'microsoft.graph.plannerExternalReference', alias: 'Spec doc', type: 'Word', previewPriority: ' !' } } — note URL must be percent-encoded as the key. previewType controls task card preview: 'automatic' | 'noPreview' | 'checklist' | 'description' | 'reference'.",
  mode: "delegated",
  inputSchema: z.object({
    taskId: z.string(),
    etag: z.string().describe("@odata.etag from getTaskDetails. Used as If-Match header."),
    description: z.string().optional(),
    previewType: z
      .enum(["automatic", "noPreview", "checklist", "description", "reference"])
      .optional(),
    checklist: z.record(z.string(), z.unknown()).optional(),
    references: z.record(z.string(), z.unknown()).optional(),
  }),
  call: async ({ taskId, etag, description, previewType, checklist, references }, client) => {
    const payload: any = {};
    if (description !== undefined) payload.description = description;
    if (previewType !== undefined) payload.previewType = previewType;
    if (checklist !== undefined) payload.checklist = checklist;
    if (references !== undefined) payload.references = references;
    return await client.api(`/planner/tasks/${taskId}/details`).header("If-Match", etag).patch(payload);
  },
});

export const plannerTools = [
  planner_listPlansForGroup,
  planner_listMyPlans,
  planner_getPlan,
  planner_createPlan,
  planner_listBuckets,
  planner_createBucket,
  planner_listTasks,
  planner_getTask,
  planner_createTask,
  planner_updateTask,
  planner_completeTask,
  planner_deleteTask,
  planner_getTaskDetails,
  planner_updateTaskDetails,
];
