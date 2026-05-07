import { z } from "zod";
import type { ToolDef } from "../types.js";
declare const InputSchema: z.ZodObject<{
    select: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    select?: string[] | undefined;
}, {
    select?: string[] | undefined;
}>;
export declare const orgGetTenant: ToolDef<z.infer<typeof InputSchema>>;
export {};
