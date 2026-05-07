import { z } from "zod";
import { type TenantConfig } from "../config.js";
import { type ResourceClient } from "../auth/resource-client.js";
import type { ToolAnnotationsHints, ToolDef } from "./types.js";
type ValueOrFactory<TInput, TValue> = TValue | ((input: TInput, tenant: TenantConfig) => TValue);
export declare function makeResourceTool<TSchema extends z.ZodTypeAny>(opts: {
    name: string;
    description: string;
    inputSchema: TSchema;
    resource: ValueOrFactory<z.output<TSchema>, string>;
    baseUrl: ValueOrFactory<z.output<TSchema>, string>;
    namespace?: ToolDef["namespace"];
    annotations?: ToolAnnotationsHints;
    call: (input: z.output<TSchema>, client: ResourceClient, tenant: TenantConfig) => Promise<unknown>;
}): ToolDef<z.input<TSchema>>;
export {};
