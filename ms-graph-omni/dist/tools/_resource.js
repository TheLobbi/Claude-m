import { assertTenantAllowsNamespace, namespaceForToolName } from "../capabilities.js";
import { getTenant } from "../config.js";
import { createResourceClient } from "../auth/resource-client.js";
import { defaultAnnotationsForName } from "./_helpers.js";
function resolveValue(value, input, tenant) {
    return typeof value === "function"
        ? value(input, tenant)
        : value;
}
export function makeResourceTool(opts) {
    const namespace = opts.namespace ?? namespaceForToolName(opts.name);
    return {
        name: opts.name,
        description: opts.description,
        inputSchema: opts.inputSchema,
        mode: "app",
        namespace,
        annotations: opts.annotations ?? defaultAnnotationsForName(opts.name),
        handler: async (rawInput) => {
            const parsed = opts.inputSchema.parse(rawInput);
            const tenantSlug = rawInput && typeof rawInput === "object" && "tenantSlug" in rawInput
                ? rawInput.tenantSlug
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
//# sourceMappingURL=_resource.js.map