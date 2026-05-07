import type { CapabilityPack, TenantEnvironment, ToolNamespace } from "./capabilities.js";
export interface TenantConfig {
    slug: string;
    tenantId: string;
    clientId: string;
    vaultUrl: string;
    certName: string;
    /** Free-form display name for tenant_list output. */
    displayName?: string;
    /** Internal Lobbi tenant or a client tenant installation. Defaults to internal for legacy configs. */
    environment?: TenantEnvironment;
    /** Named permission/tool bundles enabled for this tenant. Client tenants default to baseline-read. */
    capabilityPacks?: CapabilityPack[];
    /** Explicit namespace escape hatch for narrow custom client installs. */
    allowedNamespaces?: ToolNamespace[];
    /** Non-secret installation evidence. Never store token, secret, or cert values here. */
    consent?: {
        appRegistrationMode?: "single-tenant" | "multitenant";
        grantedAt?: string;
        grantedBy?: string;
        evidenceRef?: string;
    };
}
export interface MsgoConfig {
    tenants: TenantConfig[];
    defaultTenant: string;
    tokenCacheDir: string;
    logLevel: string;
}
export declare function loadConfig(): MsgoConfig;
/**
 * Look up a tenant by slug. Throws if not found, with a helpful list of
 * available slugs in the error message.
 */
export declare function getTenant(slug?: string): TenantConfig;
