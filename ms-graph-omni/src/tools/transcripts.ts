/**
 * Microsoft Teams meeting transcripts + recordings.
 *
 * Endpoints (all require an organizer-scoped onlineMeeting id):
 *   GET /me/onlineMeetings/{meetingId}/transcripts                     -- list metadata
 *   GET /me/onlineMeetings/{meetingId}/transcripts/{transcriptId}/content?$format=text/vtt
 *   GET /me/onlineMeetings/{meetingId}/recordings                      -- list metadata
 *   GET /me/onlineMeetings/{meetingId}/recordings/{recordingId}/content
 *   GET /users/{userId}/onlineMeetings/getAllTranscripts(meetingOrganizerUserId='...')   -- tenant-wide app-only
 *
 * Permissions:
 *   Delegated: OnlineMeetingTranscript.Read.All
 *   Application: OnlineMeetingTranscript.Read.All  (REQUIRES the ApplicationAccessPolicy
 *                grant from scripts/grant-meeting-access-policy.ps1)
 *
 * Transcript content is returned as a WebVTT (.vtt) string. Recording content is .mp4.
 *
 * This module retires the workaround in _system/scripts/Get-LobbiMeetingTranscript.ps1
 * once the access policy propagates (~30 min after Markus runs the script).
 *
 * Source: https://learn.microsoft.com/graph/api/onlinemeeting-list-transcripts
 *         https://learn.microsoft.com/graph/api/onlinemeeting-list-recordings
 */
import { z } from "zod";
import type { Client } from "@microsoft/microsoft-graph-client";
import { listRequest, ListOptionsSchema, makeTool, shapeListResponse } from "./_helpers.js";

const userTarget = z
  .string()
  .optional()
  .describe(
    "Target user UPN or id (the meeting organizer). Omit for /me (delegated). " +
      "App-only requires ApplicationAccessPolicy grant for that user."
  );

function meetingScope(user: string | undefined, meetingId: string): string {
  const base = user ? `/users/${user}/onlineMeetings` : "/me/onlineMeetings";
  return `${base}/${meetingId}`;
}

async function streamToBuffer(stream: AsyncIterable<Uint8Array | Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/* ------------------------------------------------------------------ Transcripts */

export const transcripts_list = makeTool({
  name: "transcripts_list",
  description:
    "List transcript metadata for a scheduled meeting. Each entry has id, createdDateTime, transcriptContentUrl. " +
    "Returns nextPageToken for pagination. Note: transcripts are only available after the meeting ends and Teams has finished post-processing.",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({
    meetingId: z.string(),
    user: userTarget,
  }),
  call: async ({ meetingId, user, ...opts }, client) => {
    return shapeListResponse(
      await listRequest(client, `${meetingScope(user, meetingId)}/transcripts`, opts).get()
    );
  },
});

export const transcripts_get = makeTool({
  name: "transcripts_get",
  description: "Get transcript metadata (id, createdDateTime, content URL). Use transcripts_getContent to fetch the actual text.",
  mode: "delegated",
  inputSchema: z.object({
    meetingId: z.string(),
    transcriptId: z.string(),
    user: userTarget,
  }),
  call: async ({ meetingId, transcriptId, user }, client) => {
    return await client.api(`${meetingScope(user, meetingId)}/transcripts/${transcriptId}`).get();
  },
});

export const transcripts_getContent = makeTool({
  name: "transcripts_getContent",
  description:
    "Fetch a transcript's content. Default format is WebVTT (`text/vtt`) — pass format='text/plain' for a stripped plain-text version (Graph parses the VTT and returns just utterances). " +
    "Returns { vtt: '...' } for vtt format or { text: '...' } for plain text.",
  mode: "delegated",
  inputSchema: z.object({
    meetingId: z.string(),
    transcriptId: z.string(),
    user: userTarget,
    format: z.enum(["text/vtt", "text/plain"]).default("text/vtt"),
  }),
  call: async ({ meetingId, transcriptId, user, format }, client) => {
    const url = `${meetingScope(user, meetingId)}/transcripts/${transcriptId}/content?$format=${encodeURIComponent(format)}`;
    const stream = (await client.api(url).getStream()) as AsyncIterable<Uint8Array | Buffer>;
    const buf = await streamToBuffer(stream);
    if (format === "text/plain") {
      return { text: buf.toString("utf-8") };
    }
    return { vtt: buf.toString("utf-8") };
  },
});

/**
 * Tenant-wide app-only: list every transcript a user organized.
 *
 * Useful for the morning-report / weekly-roundup pattern where the agent doesn't
 * yet have a specific meetingId — pull all of yesterday's transcripts and feed
 * them into a summarizer.
 */
export const transcripts_listByOrganizer = makeTool({
  name: "transcripts_listByOrganizer",
  description:
    "App-only: list every transcript for meetings organized by a specific user. Useful for batch processing (morning report, weekly roundup). Filter via $filter on createdDateTime to scope to a date range.",
  mode: "app",
  inputSchema: ListOptionsSchema.extend({
    user: z.string().describe("Organizer UPN or id (required in app-only mode)."),
  }),
  call: async ({ user, ...opts }, client) => {
    const url = `/users/${user}/onlineMeetings/getAllTranscripts`;
    return shapeListResponse(await listRequest(client, url, opts).get());
  },
});

/* ------------------------------------------------------------------ Recordings */

export const recordings_list = makeTool({
  name: "recordings_list",
  description:
    "List recording metadata for a scheduled meeting. Each entry has id, createdDateTime, recordingContentUrl. " +
    "Recordings are only available after the meeting ends.",
  mode: "delegated",
  inputSchema: ListOptionsSchema.extend({
    meetingId: z.string(),
    user: userTarget,
  }),
  call: async ({ meetingId, user, ...opts }, client) => {
    return shapeListResponse(
      await listRequest(client, `${meetingScope(user, meetingId)}/recordings`, opts).get()
    );
  },
});

export const recordings_get = makeTool({
  name: "recordings_get",
  description: "Get recording metadata. Use recordings_getDownloadUrl for the actual mp4.",
  mode: "delegated",
  inputSchema: z.object({
    meetingId: z.string(),
    recordingId: z.string(),
    user: userTarget,
  }),
  call: async ({ meetingId, recordingId, user }, client) => {
    return await client.api(`${meetingScope(user, meetingId)}/recordings/${recordingId}`).get();
  },
});

export const recordings_getDownloadUrl = makeTool({
  name: "recordings_getDownloadUrl",
  description:
    "Return the recordingContentUrl (a short-lived pre-authenticated URL to the mp4). Avoid streaming the whole file through the MCP — for large recordings, hand the URL back to the user/agent and let them download directly.",
  mode: "delegated",
  inputSchema: z.object({
    meetingId: z.string(),
    recordingId: z.string(),
    user: userTarget,
  }),
  call: async ({ meetingId, recordingId, user }, client) => {
    const meta: any = await client
      .api(`${meetingScope(user, meetingId)}/recordings/${recordingId}`)
      .get();
    if (!meta?.recordingContentUrl) {
      throw new Error(
        "Recording has no recordingContentUrl. Either the recording isn't ready yet, or your permission scope doesn't include OnlineMeetingRecording.Read.All."
      );
    }
    return {
      url: meta.recordingContentUrl,
      meetingId,
      recordingId,
      createdDateTime: meta.createdDateTime,
      sizeBytes: meta.size,
    };
  },
});

export const recordings_listByOrganizer = makeTool({
  name: "recordings_listByOrganizer",
  description:
    "App-only: list every recording for meetings organized by a specific user. Companion to transcripts_listByOrganizer.",
  mode: "app",
  inputSchema: ListOptionsSchema.extend({
    user: z.string().describe("Organizer UPN or id (required in app-only mode)."),
  }),
  call: async ({ user, ...opts }, client) => {
    const url = `/users/${user}/onlineMeetings/getAllRecordings`;
    return shapeListResponse(await listRequest(client, url, opts).get());
  },
});

export const transcriptsTools = [
  transcripts_list,
  transcripts_get,
  transcripts_getContent,
  transcripts_listByOrganizer,
  recordings_list,
  recordings_get,
  recordings_getDownloadUrl,
  recordings_listByOrganizer,
];
