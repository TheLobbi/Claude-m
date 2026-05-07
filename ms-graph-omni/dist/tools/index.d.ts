/**
 * Tool registry. Each tool surface exports an array; we flatten them all here.
 *
 * Adding a new surface:
 *   1. Create src/tools/<area>.ts exporting one or more `makeTool(...)` defs + an array
 *      `<area>Tools` containing them.
 *   2. Import the array here and spread it into `tools`.
 */
import type { ToolDef } from "./types.js";
export declare const tools: ToolDef<any>[];
