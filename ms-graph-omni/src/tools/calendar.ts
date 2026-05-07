/**
 * Outlook calendar tools.
 */
import { z } from "zod";
import { applyListOptions, ListOptionsSchema, listRequest, makeTool, shapeListResponse } from "./_helpers.js";

const userTarget = z
  .string()
  .optional()
  .describe("Target user UPN or id. Omit for /me (delegated).");

// Slim default $select keeps responses under the MCP token cap. Callers can
// override by passing \`select: [...]\` (or \`select: []\` to disable).
const DEFAULT_EVENT_SELECT = [
  "id",
  "subject",
  "start",
  "end",
  "organizer",
  "attendees",
  "location",
  "bodyPreview",
  "isOnlineMeeting",
  "onlineMeeting",
  "webLink",
  "categories",
  "showAs",
  "isAllDay",
  "isCancelled",
];

export const calendar_listEvents = makeTool({
  name: "calendar_listEvents",
  description: "List events on a user's calendar. Defaults to top=25 and a slim \$select projection (id, subject, start, end, organizer, attendees, location, bodyPreview, webLink, ...) to stay under the MCP token cap. Pass \`select: []\` to disable the projection or \`top: N\` to override.",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({
    user: userTarget,
    calendarId: z.string().optional().describe("Calendar id; default is the primary calendar."),
  }),
  call: async ({ user, calendarId, ...opts }, client) => {
    const base = user ? `/users/${user}` : "/me";
    const path = calendarId ? `${base}/calendars/${calendarId}/events` : `${base}/events`;
    const effective = {
      top: opts.top ?? 25,
      ...opts,
      select: opts.select === undefined ? DEFAULT_EVENT_SELECT : opts.select,
    };
    const response = await listRequest(client, path, effective).get();
    return shapeListResponse(response);
  },
});

export const calendar_getEvent = makeTool({
  name: "calendar_getEvent",
  description: "Get a single event by id including organizer, attendees, location, body.",
  mode: "delegated",
  inputSchema: z.object({
    eventId: z.string(),
    user: userTarget,
  }),
  call: async ({ eventId, user }, client) => {
    const base = user ? `/users/${user}` : "/me";
    return await client.api(`${base}/events/${eventId}`).get();
  },
});

export const calendar_createEvent = makeTool({
  name: "calendar_createEvent",
  description: "Create a new event (meeting/appointment). Times are ISO 8601; specify timezone explicitly. Set isOnlineMeeting=true to add a Teams link.",
  mode: "delegated",
  inputSchema: z.object({
    user: userTarget,
    subject: z.string(),
    start: z.string().describe("ISO 8601 start time."),
    end: z.string().describe("ISO 8601 end time."),
    timeZone: z.string().default("UTC"),
    body: z.string().optional(),
    bodyType: z.enum(["text", "html"]).default("html"),
    location: z.string().optional(),
    attendees: z.array(z.string()).optional().describe("Email addresses."),
    isOnlineMeeting: z.boolean().default(false).describe("If true, adds a Teams meeting link."),
    showAs: z.enum(["free", "tentative", "busy", "oof", "workingElsewhere", "unknown"]).optional(),
    importance: z.enum(["low", "normal", "high"]).optional(),
    reminderMinutesBeforeStart: z.number().int().optional(),
    categories: z.array(z.string()).optional(),
  }),
  call: async ({ user, subject, start, end, timeZone, body, bodyType, location, attendees, isOnlineMeeting, showAs, importance, reminderMinutesBeforeStart, categories }, client) => {
    const base = user ? `/users/${user}` : "/me";
    const payload: any = {
      subject,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
    };
    if (body) payload.body = { contentType: bodyType, content: body };
    if (location) payload.location = { displayName: location };
    if (attendees?.length) {
      payload.attendees = attendees.map((a) => ({
        emailAddress: { address: a },
        type: "required",
      }));
    }
    if (isOnlineMeeting) {
      payload.isOnlineMeeting = true;
      payload.onlineMeetingProvider = "teamsForBusiness";
    }
    if (showAs) payload.showAs = showAs;
    if (importance) payload.importance = importance;
    if (reminderMinutesBeforeStart !== undefined) payload.reminderMinutesBeforeStart = reminderMinutesBeforeStart;
    if (categories?.length) payload.categories = categories;
    return await client.api(`${base}/events`).post(payload);
  },
});

export const calendar_updateEvent = makeTool({
  name: "calendar_updateEvent",
  description: "Patch an existing event. Only fields you provide are updated.",
  mode: "delegated",
  inputSchema: z.object({
    eventId: z.string(),
    user: userTarget,
    subject: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    timeZone: z.string().optional(),
    body: z.string().optional(),
    bodyType: z.enum(["text", "html"]).optional(),
    location: z.string().optional(),
  }),
  call: async ({ eventId, user, subject, start, end, timeZone, body, bodyType, location }, client) => {
    const base = user ? `/users/${user}` : "/me";
    const payload: any = {};
    if (subject) payload.subject = subject;
    if (start) payload.start = { dateTime: start, timeZone: timeZone ?? "UTC" };
    if (end) payload.end = { dateTime: end, timeZone: timeZone ?? "UTC" };
    if (body) payload.body = { contentType: bodyType ?? "html", content: body };
    if (location) payload.location = { displayName: location };
    return await client.api(`${base}/events/${eventId}`).patch(payload);
  },
});

export const calendar_deleteEvent = makeTool({
  name: "calendar_deleteEvent",
  description: "Delete an event. The organizer's deletion cancels the meeting for attendees.",
  mode: "delegated",
  inputSchema: z.object({
    eventId: z.string(),
    user: userTarget,
  }),
  call: async ({ eventId, user }, client) => {
    const base = user ? `/users/${user}` : "/me";
    await client.api(`${base}/events/${eventId}`).delete();
    return { ok: true };
  },
});

export const calendar_findMeetingTimes = makeTool({
  name: "calendar_findMeetingTimes",
  description: "Find available meeting slots across multiple attendees. Returns suggested times ranked by attendee availability.",
  mode: "delegated",
  inputSchema: z.object({
    user: userTarget,
    attendees: z.array(z.string()).describe("Email addresses of required attendees."),
    durationMinutes: z.number().int().default(30),
    earliest: z.string().optional().describe("ISO datetime; defaults to now."),
    latest: z.string().optional().describe("ISO datetime; defaults to 7 days from now."),
    timeZone: z.string().default("UTC"),
    maxCandidates: z.number().int().default(20),
  }),
  call: async ({ user, attendees, durationMinutes, earliest, latest, timeZone, maxCandidates }, client) => {
    const base = user ? `/users/${user}` : "/me";
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 86400000);
    const payload = {
      attendees: attendees.map((a) => ({ emailAddress: { address: a }, type: "required" })),
      meetingDuration: `PT${durationMinutes}M`,
      timeConstraint: {
        timeslots: [
          {
            start: { dateTime: earliest ?? now.toISOString(), timeZone },
            end: { dateTime: latest ?? in7d.toISOString(), timeZone },
          },
        ],
      },
      maxCandidates,
      isOrganizerOptional: false,
      returnSuggestionReasons: true,
    };
    return await client.api(`${base}/findMeetingTimes`).post(payload);
  },
});

export const calendar_getSchedule = makeTool({
  name: "calendar_getSchedule",
  description: "Get free/busy availability for a list of users for a specified time range.",
  mode: "delegated",
  inputSchema: z.object({
    user: userTarget,
    schedules: z.array(z.string()).describe("Email addresses to query."),
    start: z.string().describe("ISO datetime."),
    end: z.string().describe("ISO datetime."),
    timeZone: z.string().default("UTC"),
    availabilityViewInterval: z.number().int().default(30),
  }),
  call: async ({ user, schedules, start, end, timeZone, availabilityViewInterval }, client) => {
    const base = user ? `/users/${user}` : "/me";
    return await client.api(`${base}/calendar/getSchedule`).post({
      schedules,
      startTime: { dateTime: start, timeZone },
      endTime: { dateTime: end, timeZone },
      availabilityViewInterval,
    });
  },
});

export const calendarTools = [
  calendar_listEvents,
  calendar_getEvent,
  calendar_createEvent,
  calendar_updateEvent,
  calendar_deleteEvent,
  calendar_findMeetingTimes,
  calendar_getSchedule,
];
