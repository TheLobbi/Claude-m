/**
 * Microsoft Teams online meetings.
 *
 * Endpoints: /me/onlineMeetings (delegated) and /users/{userId}/onlineMeetings (app-only).
 *
 * App-only mode requires an Application Access Policy granting the Lobbi-Cowork-Graph
 * app permission to act on behalf of the target user. Without it, Graph returns
 * 403 — "No application access policy found for this app". The plugin's error
 * translator maps that to `appAccessPolicyMissing` with a recovery hint pointing
 * at scripts/grant-meeting-access-policy.ps1. Markus runs that as Global Admin once
 * per user (or tenant-wide) and waits ~30 minutes for propagation.
 *
 * Documented at:
 *   https://learn.microsoft.com/graph/api/resources/onlinemeeting
 *   https://learn.microsoft.com/graph/cloud-communication-online-meeting-application-access-policy
 *
 * Permissions:
 *   Delegated: OnlineMeetings.ReadWrite (no admin consent needed)
 *   Application: OnlineMeetings.ReadWrite.All (admin consent + access policy)
 */
import { z } from "zod";
import { listRequest, ListOptionsSchema, makeTool, shapeListResponse } from "./_helpers.js";
const userTarget = z
    .string()
    .optional()
    .describe("Target user UPN or id (e.g. user@thelobbi.io). Omit for /me (delegated). " +
    "When provided in app-only mode, requires an ApplicationAccessPolicy grant " +
    "for that user — see scripts/grant-meeting-access-policy.ps1.");
// Slim default $select for list — full meeting payload includes attendee lists
// and participant settings that frequently exceed 25 kB.
const DEFAULT_MEETING_SELECT = [
    "id",
    "subject",
    "startDateTime",
    "endDateTime",
    "joinWebUrl",
    "joinMeetingId",
    "creationDateTime",
    "isBroadcast",
    "isEntryExitAnnounced",
    "videoTeleconferenceId",
    "participants",
];
function meetingsBase(user) {
    return user ? `/users/${user}/onlineMeetings` : "/me/onlineMeetings";
}
export const onlineMeetings_list = makeTool({
    name: "onlineMeetings_list",
    description: "List a user's scheduled online meetings. Supports $filter and $orderby. " +
        "Returns nextPageToken for pagination. Default $select keeps payloads small.",
    mode: "delegated",
    inputSchema: ListOptionsSchema.extend({ user: userTarget }),
    call: async ({ user, ...opts }, client) => {
        const effective = {
            ...opts,
            select: opts.select === undefined ? DEFAULT_MEETING_SELECT : opts.select,
        };
        return shapeListResponse(await listRequest(client, meetingsBase(user), effective).get());
    },
});
export const onlineMeetings_get = makeTool({
    name: "onlineMeetings_get",
    description: "Get a single online meeting by id. The id is the onlineMeeting object id (not the joinMeetingId or videoTeleconferenceId). " +
        "If you only have a joinWebUrl, use onlineMeetings_listByJoinWebUrl instead.",
    mode: "delegated",
    inputSchema: z.object({
        meetingId: z.string().describe("onlineMeeting id (NOT joinMeetingId)."),
        user: userTarget,
    }),
    call: async ({ meetingId, user }, client) => {
        return await client.api(`${meetingsBase(user)}/${meetingId}`).get();
    },
});
export const onlineMeetings_listByJoinWebUrl = makeTool({
    name: "onlineMeetings_listByJoinWebUrl",
    description: "Look up a meeting by its joinWebUrl. Useful when you have the meeting URL from a calendar event but not the meeting id. Returns up to 1 meeting (joinWebUrls are unique per organizer).",
    mode: "delegated",
    inputSchema: z.object({
        joinWebUrl: z.string().url(),
        user: userTarget,
    }),
    call: async ({ joinWebUrl, user }, client) => {
        return await client
            .api(meetingsBase(user))
            .filter(`joinWebUrl eq '${joinWebUrl.replace(/'/g, "''")}'`)
            .header("ConsistencyLevel", "eventual")
            .get();
    },
});
export const onlineMeetings_create = makeTool({
    name: "onlineMeetings_create",
    description: "Create an online (Teams) meeting. Returns the meeting object including joinWebUrl, joinMeetingId, and the dial-in conference id (videoTeleconferenceId).",
    mode: "delegated",
    inputSchema: z.object({
        user: userTarget,
        subject: z.string(),
        startDateTime: z.string().describe("ISO 8601 start time."),
        endDateTime: z.string().describe("ISO 8601 end time."),
        attendees: z.array(z.string()).optional().describe("Attendee email addresses; will be added as required."),
        allowedPresenters: z
            .enum(["everyone", "organization", "roleIsPresenter", "organizer", "unknownFutureValue"])
            .optional(),
        allowAttendeeToEnableCamera: z.boolean().optional(),
        allowAttendeeToEnableMic: z.boolean().optional(),
        allowMeetingChat: z.enum(["enabled", "disabled", "limited", "unknownFutureValue"]).optional(),
        isEntryExitAnnounced: z.boolean().optional(),
        lobbyBypassScope: z
            .enum(["organizer", "organization", "organizationAndFederated", "everyone", "invited", "organizationExcludingGuests", "unknownFutureValue"])
            .optional(),
        recordAutomatically: z.boolean().optional(),
    }),
    call: async ({ user, subject, startDateTime, endDateTime, attendees, allowedPresenters, allowAttendeeToEnableCamera, allowAttendeeToEnableMic, allowMeetingChat, isEntryExitAnnounced, lobbyBypassScope, recordAutomatically, }, client) => {
        const payload = {
            subject,
            startDateTime,
            endDateTime,
        };
        if (attendees?.length) {
            payload.participants = {
                attendees: attendees.map((a) => ({
                    upn: a,
                    role: "attendee",
                    identity: { user: { id: null }, "@odata.type": "#microsoft.graph.identitySet" },
                })),
            };
        }
        if (allowedPresenters)
            payload.allowedPresenters = allowedPresenters;
        if (allowAttendeeToEnableCamera != null)
            payload.allowAttendeeToEnableCamera = allowAttendeeToEnableCamera;
        if (allowAttendeeToEnableMic != null)
            payload.allowAttendeeToEnableMic = allowAttendeeToEnableMic;
        if (allowMeetingChat)
            payload.allowMeetingChat = allowMeetingChat;
        if (isEntryExitAnnounced != null)
            payload.isEntryExitAnnounced = isEntryExitAnnounced;
        if (lobbyBypassScope)
            payload.lobbyBypassSettings = { scope: lobbyBypassScope };
        if (recordAutomatically != null)
            payload.recordAutomatically = recordAutomatically;
        return await client.api(meetingsBase(user)).post(payload);
    },
});
export const onlineMeetings_update = makeTool({
    name: "onlineMeetings_update",
    description: "Patch fields on an existing online meeting (subject, time, participants, etc.).",
    mode: "delegated",
    inputSchema: z.object({
        meetingId: z.string(),
        user: userTarget,
        patch: z.record(z.string(), z.unknown()).describe("Partial onlineMeeting object — only fields you want to change."),
    }),
    call: async ({ meetingId, user, patch }, client) => {
        return await client.api(`${meetingsBase(user)}/${meetingId}`).patch(patch);
    },
});
export const onlineMeetings_delete = makeTool({
    name: "onlineMeetings_delete",
    description: "Cancel/delete an online meeting. Attendees see it cancelled in their calendar.",
    mode: "delegated",
    inputSchema: z.object({
        meetingId: z.string(),
        user: userTarget,
    }),
    call: async ({ meetingId, user }, client) => {
        await client.api(`${meetingsBase(user)}/${meetingId}`).delete();
        return { ok: true };
    },
});
export const onlineMeetingsTools = [
    onlineMeetings_list,
    onlineMeetings_get,
    onlineMeetings_listByJoinWebUrl,
    onlineMeetings_create,
    onlineMeetings_update,
    onlineMeetings_delete,
];
//# sourceMappingURL=onlineMeetings.js.map