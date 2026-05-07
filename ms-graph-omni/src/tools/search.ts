/**
 * Microsoft Search — unified search across Outlook, OneDrive, SharePoint, Teams, etc.
 */
import { z } from "zod";
import { makeTool } from "./_helpers.js";

export const search_query = makeTool({
  name: "search_query",
  description:
    "Run a unified Microsoft Search query across one or more entity types: 'driveItem' (files), 'message' (mail), 'event' (calendar), 'site', 'list', 'listItem', 'chatMessage', 'person', 'externalItem'. " +
    "IMPORTANT: Graph enforces a compatibility matrix on \`entityTypes\` — only certain combinations are valid in a single request " +
    "(see https://learn.microsoft.com/en-us/graph/search-concept-overview). " +
    "Common valid groupings: ['driveItem','listItem','list','site'] (SharePoint/OneDrive content), ['message'] (mail), ['event'] (calendar), ['chatMessage'] (Teams), ['person'] (people), ['externalItem'] (connectors). " +
    "Mail (message), calendar (event), Teams (chatMessage), and people (person) must each be queried in their own request — they cannot be combined with other entity types.",
  mode: "delegated",
  inputSchema: z.object({
    query: z.string().describe("KQL query string."),
    entityTypes: z
      .array(
        z.enum([
          "driveItem",
          "message",
          "event",
          "site",
          "list",
          "listItem",
          "chatMessage",
          "person",
          "externalItem",
        ])
      )
      .min(1)
      .describe(
        "Required. Pick a Graph-valid combination (see description). No default is provided — the prior default ['driveItem','message','event'] violates the compatibility matrix and would fail every call."
      ),
    from: z.number().int().default(0).describe("Result offset for pagination."),
    size: z.number().int().min(1).max(500).default(25).describe("Results per page."),
    fields: z.array(z.string()).optional().describe("Specific fields to return."),
  }),
  call: async ({ query, entityTypes, from, size, fields }, client) => {
    const requests: any[] = [
      {
        entityTypes,
        query: { queryString: query },
        from,
        size,
        ...(fields ? { fields } : {}),
      },
    ];
    return await client.api("/search/query").post({ requests });
  },
});

export const searchTools = [search_query];
