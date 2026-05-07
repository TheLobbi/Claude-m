import { z } from "zod";
import { assertTenantAllowsNamespace, namespaceForToolName } from "../capabilities.js";
import { getTenant, type TenantConfig } from "../config.js";
import { createResourceClient, type ResourceClient } from "../auth/resource-client.js";
import type { ToolAnnotationsHints, ToolDef } from "./types.js";
import { defaultAnnotationsForName } from "./_helpers.js";

type ValueOrFactory<TInput, TValue> = TValue | ((input: TInput, tenant: TenantConfig) => TValue);

function resolveValue<TInput, TValue>(
  value: ValueOrFactory<TInput, TValue>,
  input: TInput,
  tenant: TenantConfig
): TValue {
  return typeof value === "function"
    ? (value as (input: TInput, tenant: TenantConfig) => TValue)(input, tenant)
    : value;
}

export function makeResourceTool<TSchema extends z.ZodTypeAny>(opts: {
  name: string;
  description: string;
  inputSchema: TSchema;
  resource: ValueOrFactory<z.output<TSchema>, string>;
  baseUrl: ValueOrFactory<z.output<TSchema>, string>;
  namespace?: ToolDef["namespace"];
  annotations?: ToolAnnotationsHints;
  call: (input: z.output<TSchema>, client: ResourceClient, tenant: TenantConfig) => Promise<unknown>;
}): ToolDef<z.input<TSchema>> {
  const namespace = opts.namespace ?? namespaceForToolName(opts.name);
  return {
    name: opts.name,
    description: opts.description,
    inputSchema: opts.inputSchema,
    mode: "app",
    namespace,
    annotations: opts.annotations ?? defaultAnnotationsForName(opts.name),
    handler: async (rawInput: z.input<TSchema>) => {
      const parsed = opts.inputSchema.parse(rawInput) as z.output<TSchema>;
      const tenantSlug =
        rawInput && typeof rawInput === "object" && "tenantSlug" in (rawInput as Record<string, unknown>)
          ? ((rawInput as Record<string, unknown>).tenantSlug as string | undefined)
          : undefined;
      const tenant = getTenant(tenantSlug);
      assertTenantAllowsNamespace(tenant, opts.name, namespace);
      const resource = resolveValue(opts.resource, parsed, tenant);
      const baseUrl = resolveValue(opts.baseUrl, parsed, tenant);
      const client = createResourceClient({ tenantSlug, resource, baseUrl });
      return await opts.call(parsed, client, tenant);
    },
  };
}
