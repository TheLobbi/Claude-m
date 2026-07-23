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

export const copilotTools = [copilot_retrieve];
