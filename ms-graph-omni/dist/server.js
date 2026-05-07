#!/usr/bin/env node
/**
 * MCP server entry point. Wires the tool registry into MCP via the high-level
 * `McpServer` API (SDK 1.29+), which gives us:
 *
 *   - `registerTool` with first-class `annotations` (readOnlyHint, destructiveHint, idempotentHint)
 *     and `outputSchema` (typed output via `structuredContent`)
 *   - `registerResource` and `registerPrompt` for future Phase C work (subscriptions, prompts)
 *
 * Each ToolDef in src/tools/ declares its inputSchema and (optionally) annotations + outputSchema.
 * When annotations are omitted, `defaultAnnotationsForName` in _helpers infers them from the verb
 * suffix (list / get / search -> readOnly, delete / remove -> destructive, update / patch -> idempotent).
 *
 * Errors thrown from tool handlers are routed through `translateGraphError` (src/graph/errorTranslator)
 * so the LLM sees structured `{code, summary, recoveryHint, requiredScopes?, retryAfterMs?}` instead of
 * raw Graph error strings.
 *
 * Every tool call is wrapped in `withObservability` which emits a per-call latency log line, a
 * correlation ID, and (for write ops) an audit trail entry under ~/.msgo-cache/audit/YYYY-MM.ndjson.
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools/index.js";
import { defaultAnnotationsForName } from "./tools/_helpers.js";
import { logger } from "./logger.js";
import { translateGraphError } from "./graph/errorTranslator.js";
import { withObservability } from "./observability/latencyMiddleware.js";
import { listFeedSubscriptions, readRecent } from "./streaming/changeFeed.js";
const SERVER_NAME = "ms-graph-omni";
const SERVER_VERSION = "0.2.0-dev";
async function main() {
    const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, {
        capabilities: {
            tools: {},
            // Resources expose the change-feed buffered by the standalone
            // webhookReceiver process. Clients can list / read recent
            // notifications via msgo://stream/recent and msgo://stream/{subId}.
            resources: { listChanged: false, subscribe: false },
        },
    });
    // ----- MCP Resources: buffered change-feed --------------------------------
    // msgo://stream/recent  -> last 50 notifications across all subscriptions
    server.registerResource("change-feed-recent", "msgo://stream/recent", {
        title: "Recent Graph change notifications",
        description: "Last 50 change notifications received by the webhook receiver, newest first. Run `pnpm receiver` and configure the public notificationUrl to populate this feed.",
        mimeType: "application/json",
    }, async (uri) => {
        const items = readRecent(50);
        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: "application/json",
                    text: JSON.stringify({ count: items.length, items }, null, 2),
                },
            ],
        };
    });
    // msgo://stream/sub/{subscriptionId}  -> last N notifications for one sub
    server.registerResource("change-feed-by-subscription", new ResourceTemplate("msgo://stream/sub/{subscriptionId}", {
        list: async () => ({
            resources: listFeedSubscriptions().map((subId) => ({
                uri: `msgo://stream/sub/${subId}`,
                name: `change-feed:${subId}`,
                mimeType: "application/json",
            })),
        }),
    }), {
        title: "Change feed by subscription id",
        description: "Buffered change notifications for a single Graph subscription. The id matches what subscriptions_create returned.",
        mimeType: "application/json",
    }, async (uri, { subscriptionId }) => {
        const subId = Array.isArray(subscriptionId) ? subscriptionId[0] : subscriptionId;
        const items = readRecent(200, subId);
        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: "application/json",
                    text: JSON.stringify({ subscriptionId: subId, count: items.length, items }, null, 2),
                },
            ],
        };
    });
    for (const tool of tools) {
        const annotations = tool.annotations ?? defaultAnnotationsForName(tool.name);
        // The SDK's registerTool generic resolution can't see through our ToolDef
        // indirection — both `inputSchema` (a ZodObject from each tool file) and
        // the callback are valid at runtime, but the static overload picks an
        // arms-length type. Cast the call site rather than each argument.
        server.registerTool(tool.name, {
            description: tool.description,
            inputSchema: tool.inputSchema,
            ...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
            annotations,
        }, async (parsedInput) => {
            return withObservability({ toolName: tool.name, mode: tool.mode, annotations, inputForAudit: parsedInput }, async () => {
                try {
                    const result = await tool.handler(parsedInput);
                    const text = result === undefined || result === null
                        ? JSON.stringify({ ok: true }, null, 2)
                        : typeof result === "string"
                            ? result
                            : JSON.stringify(result, null, 2);
                    // If the tool declared an outputSchema, surface the parsed object as
                    // structuredContent so MCP clients can consume typed output. Validation
                    // failures are non-fatal — we still return the text body and log a warning.
                    if (tool.outputSchema && result !== undefined && result !== null && typeof result === "object") {
                        const parsed = tool.outputSchema.safeParse(result);
                        if (parsed.success) {
                            return {
                                content: [{ type: "text", text }],
                                structuredContent: parsed.data,
                            };
                        }
                        logger.warn({ tool: tool.name, issues: parsed.error.issues }, "outputSchema validation failed; returning text only");
                    }
                    return { content: [{ type: "text", text }] };
                }
                catch (e) {
                    const translated = translateGraphError(e, { tool: tool.name, mode: tool.mode });
                    logger.error({
                        tool: tool.name,
                        code: translated.code,
                        status: translated.statusCode,
                        requiredScopes: translated.requiredScopes,
                        retryAfterMs: translated.retryAfterMs,
                    }, "tool call failed");
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(translated, null, 2),
                            },
                        ],
                        isError: true,
                    };
                }
            });
        });
    }
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info({ toolCount: tools.length, version: SERVER_VERSION }, "ms-graph-omni MCP server started");
}
main().catch((err) => {
    logger.fatal({ err: err.message, stack: err.stack }, "fatal startup error");
    process.exit(1);
});
//# sourceMappingURL=server.js.map