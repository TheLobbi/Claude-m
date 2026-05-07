import type { ToolAnnotationsHints } from "../tools/types.js";
interface ObsContext {
    toolName: string;
    mode: "app" | "delegated";
    annotations?: ToolAnnotationsHints;
    /** Optional input fingerprint override (e.g. when raw input shouldn't be walked). */
    inputForAudit?: unknown;
}
export declare function withObservability<T>(ctx: ObsContext, fn: () => Promise<T>): Promise<T>;
export {};
