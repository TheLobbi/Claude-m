/**
 * Multi-tenant introspection.
 *
 * Phase C #6 introduced multi-tenant support: the plugin can serve multiple
 * Microsoft 365 tenants from a single MCP process, keyed by `tenantSlug`.
 * Every tool's input implicitly accepts an optional `tenantSlug` field; when
 * absent, the configured `defaultTenant` is used.
 *
 * `tenant_list` lets the LLM discover which slugs are configured so it can
 * route subsequent calls correctly. Returns slugs + tenantIds + display names —
 * never returns secrets (vaultUrl/certName are deliberately omitted).
 */
import { z } from "zod";
import { loadConfig } from "../config.js";
import { effectiveCapabilityPacks, enabledNamespaces, prerequisitesForPacks, requiredResourcesForPacks, } from "../capabilities.js";
export const tenant_list = {
    name: "tenant_list",
    description: "List the Microsoft 365 tenants this MCP server is configured to access. " +
        "Returns the slug (use it as `tenantSlug` on subsequent calls), the tenantId GUID, " +
        "and the display name. Marks which slug is the default. " +
        "When you want to act against a specific tenant, pass `tenantSlug: '<slug>'` on " +
        "any tool call. Otherwise the default tenant is used automatically.",
    inputSchema: z.object({}).strict(),
    mode: "app",
    namespace: "tenant",
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async () => {
        const cfg = loadConfig();
        return {
            defaultTenant: cfg.defaultTenant,
            tenants: cfg.tenants.map((t) => {
                const capabilityPacks = effectiveCapabilityPacks(t);
                return {
                    slug: t.slug,
                    tenantId: t.tenantId,
                    clientId: t.clientId,
                    displayName: t.displayName,
                    environment: t.environment ?? "internal",
                    capabilityPacks,
                    enabledNamespaces: enabledNamespaces(t),
                    requiredResources: requiredResourcesForPacks(capabilityPacks),
                    prerequisites: prerequisitesForPacks(capabilityPacks),
                    consent: t.consent,
                    isDefault: t.slug === cfg.defaultTenant,
                };
            }),
        };
    },
};
export const tenantsTools = [tenant_list];
//# sourceMappingURL=tenants.js.map