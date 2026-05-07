import { z } from "zod";
import type { ToolDef } from "../types.js";
declare const InputSchema: z.ZodObject<{
    /** Optional list of $select fields. */
    select: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    select?: string[] | undefined;
}, {
    select?: string[] | undefined;
}>;
export declare const meGetProfile: ToolDef<z.infer<typeof InputSchema>>;
export {};
