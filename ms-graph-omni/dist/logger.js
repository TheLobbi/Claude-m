import pino from "pino";
import { PINO_REDACT_CONFIG } from "./observability/redactor.js";
export const logger = pino({
    level: process.env.MSGO_LOG_LEVEL ?? "info",
    // MCP servers communicate over stdout — log to stderr to avoid corrupting protocol frames.
    transport: {
        target: "pino/file",
        options: { destination: 2 }, // stderr
    },
    redact: PINO_REDACT_CONFIG,
});
//# sourceMappingURL=logger.js.map