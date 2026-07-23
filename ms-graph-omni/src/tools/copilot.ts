/**
 * Microsoft 365 Copilot APIs — AI-grounded retrieval over the same hybrid
 * semantic index that powers Microsoft 365 Copilot.
 *
 * Unlike the raw Graph collaboration tools (CRUD/keyword ops), this surface
 * returns permission-trimmed, sensitivity-label-aware TEXT EXTRACTS from
 * SharePoint / OneDrive / Copilot connectors for RAG grounding — no data
 * egress, no separate vector index.
 *
 * Endpoint : POST /copilot/retrieval   (GA on Graph v1.0 — the client's default version)
 * Auth     : DELEGATED only. App-only tokens are rejected (403) by this API, so
 *            every tool here is mode:"delegated". Required delegated scopes are
 *            covered by the `collaboration` pack (Files.ReadWrite.All +
 *            Sites.ReadWrite.All ⊇ Files.Read.All + Sites.Read.All); connector
 *            retrieval additionally needs ExternalItem.Read.All.
 * License  : Each calling user needs a Microsoft 365 Copilot add-on license.
 * Limits   : queryString ≤ 1500 chars; maximumNumberOfResults 1–25; 200 req/user/hour.
 *
 * Docs: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/api/ai-services/retrieval/copilotroot-retrieval
 */
import { z } from "zod";
import { makeTool } from "./_helpers.js";

export const copilot_retrieve = makeTool({
  name: "copilot_retrieve",
  // "copilot" prefix isn't in namespaceForToolName() (would fall to raw-graph),
  // so pin it explicitly to the client-installable collaboration namespace.
  namespace: "collaboration",
  mode: "delegated",
  description:
    "Retrieve permission-trimmed, sensitivity-label-aware text extracts from tenant SharePoint, " +
    "OneDrive, or Copilot connectors using the Microsoft 365 Copilot semantic index (RAG grounding). " +
    "Query ONE data source per call. Results are UNORDERED — send all returned extracts to your LLM " +
    "rather than re-ranking or truncating. Requires a Microsoft 365 Copilot license and delegated auth. " +
    "Note: invalid KQL in filterExpression does NOT error — it silently runs unscoped.",
  inputSchema: z.object({
    queryString: z
      .string()
      .min(1)
      .max(1500)
      .describe("Natural-language query, ideally a single sentence with context-rich keywords. Max 1500 chars."),
    dataSource: z
      .enum(["sharePoint", "oneDriveBusiness", "externalItem"])
      .describe("Exactly one source per call (no interleaving). 'externalItem' = Copilot connectors."),
    filterExpression: z
      .string()
      .optional()
      .describe(
        "Optional KQL scoping. SharePoint/OneDrive queryable props: Author, FileExtension, Filename, " +
          "FileType, InformationProtectionLabelId, LastModifiedTime, ModifiedBy, Path, SiteID, Title. " +
          'Supports AND/OR/NOT and inequalities. Example: Path:"https://contoso.sharepoint.com/sites/HR/".'
      ),
    resourceMetadata: z
      .array(z.string())
      .optional()
      .describe('Metadata fields to return per hit, e.g. ["title","author"]. Only retrievable props are honored.'),
    maximumNumberOfResults: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe("1–25. Omit unless capping LLM tokens — results are unordered, so capping can drop relevant extracts."),
    connectionIds: z
      .array(z.string())
      .optional()
      .describe("Only for dataSource='externalItem': restrict to specific Copilot connector connection IDs."),
  }),
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  call: async (input, client) => {
    const body: Record<string, unknown> = {
      queryString: input.queryString,
      dataSource: input.dataSource,
    };
    if (input.filterExpression) body.filterExpression = input.filterExpression;
    if (input.resourceMetadata?.length) body.resourceMetadata = input.resourceMetadata;
    // Microsoft's reference examples serialize this as a STRING ("10").
    if (input.maximumNumberOfResults != null) body.maximumNumberOfResults = String(input.maximumNumberOfResults);
    if (input.dataSource === "externalItem" && input.connectionIds?.length) {
      body.dataSourceConfiguration = {
        externalItem: { connections: input.connectionIds.map((id) => ({ connectionId: id })) },
      };
    }
    // /copilot/retrieval is GA on v1.0 (the Graph client's default version).
    return await client.api("/copilot/retrieval").post(body);
  },
});

/**
 * Meeting AI Insights — AI-generated meeting notes, action items, and mention events
 * from transcribed Teams meetings. Part of the Copilot API namespace: delegated auth,
 * Copilot-licensed user only. Insights appear after the meeting ends (up to ~4h delay).
 * GET /copilot/users/{userId}/onlineMeetings/{onlineMeetingId}/aiInsights[/{aiInsightId}]
 * Docs: https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/meeting-transcripts/meeting-insights
 */
export const copilot_meeting_insights = makeTool({
  name: "copilot_meeting_insights",
  namespace: "meetings",
  mode: "delegated",
  description:
    "Fetch AI-generated Teams meeting insights (meetingNotes, actionItems, viewpoint.mentionEvents) for a " +
    "Copilot-licensed user. Omit aiInsightId to LIST all insight objects for the meeting; provide it to GET " +
    "the full detailed insight. Requires transcription/recording to have been on. Insights are available only " +
    "after the meeting ends and may take up to ~4 hours.",
  inputSchema: z.object({
    userId: z.string().describe("Organizer/user id (AAD object id) who owns the online meeting."),
    onlineMeetingId: z
      .string()
      .describe("onlineMeeting id. If you only have the join URL, resolve it via the onlineMeetings API first."),
    aiInsightId: z
      .string()
      .optional()
      .describe("Optional. When provided, returns the full insight object; when omitted, lists all insights."),
  }),
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  call: async ({ userId, onlineMeetingId, aiInsightId }, client) => {
    const base = `/copilot/users/${userId}/onlineMeetings/${onlineMeetingId}/aiInsights`;
    return await client.api(aiInsightId ? `${base}/${aiInsightId}` : base).get();
  },
});

/**
 * Microsoft 365 Copilot usage reports — tenant-level adoption metrics. App-only (admin),
 * Reports.Read.All. Functions return a stream (CSV by default). period is one of D7/D30/D90/D180.
 * Docs: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/api/admin-settings/reports/resources/copilotreportroot
 */
export const copilot_usage_report = makeTool({
  name: "copilot_usage_report",
  namespace: "analytics",
  mode: "app",
  description:
    "Get tenant Microsoft 365 Copilot usage reports (admin). 'userCountSummary' = aggregated active/enabled " +
    "users; 'userCountTrend' = daily trend; 'usageUserDetail' = most recent per-user activity. Returns the " +
    "report stream (CSV). Requires Reports.Read.All. period is D7/D30/D90/D180; usageUserDetail also accepts a date.",
  inputSchema: z.object({
    report: z
      .enum(["userCountSummary", "userCountTrend", "usageUserDetail"])
      .describe("Which Copilot usage report to run."),
    period: z
      .enum(["D7", "D30", "D90", "D180"])
      .default("D7")
      .describe("Aggregation window. Ignored when 'date' is supplied for usageUserDetail."),
    date: z
      .string()
      .optional()
      .describe("usageUserDetail only: a single day YYYY-MM-DD (within the last 30 days). Overrides period."),
  }),
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  call: async ({ report, period, date }, client) => {
    const fn = {
      userCountSummary: "getMicrosoft365CopilotUserCountSummary",
      userCountTrend: "getMicrosoft365CopilotUserCountTrend",
      usageUserDetail: "getMicrosoft365CopilotUsageUserDetail",
    }[report];
    const arg = report === "usageUserDetail" && date ? `date=${date}` : `period='${period}'`;
    return await client.api(`/reports/${fn}(${arg})`).get();
  },
});

export const copilotTools = [copilot_retrieve, copilot_meeting_insights, copilot_usage_report];
