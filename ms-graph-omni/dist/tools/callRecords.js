/**
 * Microsoft Teams call records (CDR + diagnostics).
 *
 * Endpoints under /communications/callRecords. Records appear after a call/meeting
 * ends and are retained for 30 days.
 *
 * Permissions:
 *   Application: CallRecords.Read.All  (REQUIRED — delegated is NOT supported)
 *   For PSTN/direct routing log functions, also: CallRecord-PstnCalls.Read.All
 *
 * Source:
 *   https://learn.microsoft.com/graph/api/resources/callrecords-callrecord
 *   https://learn.microsoft.com/graph/api/callrecords-cloudcommunications-list-callrecords
 *   https://learn.microsoft.com/graph/callrecords-api-faq
 *
 * Note: list responses don't expand sessions/participants_v2 by default — call
 * callRecords_get to expand a single record, or use callRecords_listSessions /
 * callRecords_listParticipants for the related collections.
 */
import { z } from "zod";
import { listRequest, ListOptionsSchema, makeTool, shapeListResponse } from "./_helpers.js";
// Slim default for list — full callRecord expansions can be tens of KB per session.
const DEFAULT_CALLRECORD_SELECT = [
    "id",
    "version",
    "type",
    "modalities",
    "lastModifiedDateTime",
    "startDateTime",
    "endDateTime",
    "joinWebUrl",
    "organizer_v2",
];
export const callRecords_list = makeTool({
    name: "callRecords_list",
    description: "List call records (calls + meetings that ended in the last 30 days). " +
        "Filter by startDateTime range to scope, e.g. " +
        "filter=\"startDateTime ge 2026-05-04T00:00:00Z and startDateTime lt 2026-05-05T00:00:00Z\". " +
        "Returns nextPageToken; pass as `pageToken` to continue. " +
        "App-only — delegated permissions are not supported on this endpoint.",
    mode: "app",
    inputSchema: ListOptionsSchema,
    call: async (opts, client) => {
        const effective = {
            ...opts,
            select: opts.select === undefined ? DEFAULT_CALLRECORD_SELECT : opts.select,
        };
        return shapeListResponse(await listRequest(client, "/communications/callRecords", effective).get());
    },
});
export const callRecords_get = makeTool({
    name: "callRecords_get",
    description: "Get a single call record by id with optional expansion. Default expand fetches sessions + participants_v2; pass expand=[] to skip expansion.",
    mode: "app",
    inputSchema: z.object({
        callRecordId: z.string(),
        expand: z
            .array(z.enum(["sessions", "participants_v2", "sessions($expand=segments)"]))
            .default(["sessions", "participants_v2"]),
    }),
    call: async ({ callRecordId, expand }, client) => {
        let req = client.api(`/communications/callRecords/${callRecordId}`);
        if (expand.length)
            req = req.expand(expand.join(","));
        return await req.get();
    },
});
export const callRecords_listSessions = makeTool({
    name: "callRecords_listSessions",
    description: "List sessions within a call record. Each session is a sub-call (e.g. one user joining/leaving a meeting). Use $expand=segments for the segment-by-segment quality data.",
    mode: "app",
    inputSchema: ListOptionsSchema.extend({
        callRecordId: z.string(),
    }),
    call: async ({ callRecordId, ...opts }, client) => {
        return shapeListResponse(await listRequest(client, `/communications/callRecords/${callRecordId}/sessions`, opts).get());
    },
});
export const callRecords_listParticipants = makeTool({
    name: "callRecords_listParticipants",
    description: "List participants_v2 of a call record. Each entry includes identity (user, phone, guest), join/leave timestamps, and feedback when available.",
    mode: "app",
    inputSchema: ListOptionsSchema.extend({
        callRecordId: z.string(),
    }),
    call: async ({ callRecordId, ...opts }, client) => {
        return shapeListResponse(await listRequest(client, `/communications/callRecords/${callRecordId}/participants_v2`, opts).get());
    },
});
export const callRecords_getPstnCalls = makeTool({
    name: "callRecords_getPstnCalls",
    description: "Get PSTN (calling-plan) call detail records as a tabular projection. Useful for billing/usage reports. Date range is required and must be within 90 days. Requires CallRecord-PstnCalls.Read.All in addition to CallRecords.Read.All.",
    mode: "app",
    inputSchema: z.object({
        fromDateTime: z.string().describe("ISO 8601 (inclusive)."),
        toDateTime: z.string().describe("ISO 8601 (exclusive)."),
    }),
    call: async ({ fromDateTime, toDateTime }, client) => {
        return await client
            .api(`/communications/callRecords/getPstnCalls(fromDateTime=${fromDateTime},toDateTime=${toDateTime})`)
            .get();
    },
});
export const callRecords_getDirectRoutingCalls = makeTool({
    name: "callRecords_getDirectRoutingCalls",
    description: "Get Direct Routing call detail records as a tabular projection. Same permission notes as getPstnCalls.",
    mode: "app",
    inputSchema: z.object({
        fromDateTime: z.string().describe("ISO 8601 (inclusive)."),
        toDateTime: z.string().describe("ISO 8601 (exclusive)."),
    }),
    call: async ({ fromDateTime, toDateTime }, client) => {
        return await client
            .api(`/communications/callRecords/getDirectRoutingCalls(fromDateTime=${fromDateTime},toDateTime=${toDateTime})`)
            .get();
    },
});
export const callRecordsTools = [
    callRecords_list,
    callRecords_get,
    callRecords_listSessions,
    callRecords_listParticipants,
    callRecords_getPstnCalls,
    callRecords_getDirectRoutingCalls,
];
//# sourceMappingURL=callRecords.js.map