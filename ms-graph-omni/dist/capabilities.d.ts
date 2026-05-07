import type { TenantConfig } from "./config.js";
export type TenantEnvironment = "internal" | "client";
export type CapabilityPack = "internal-full" | "baseline-read" | "collaboration" | "meetings" | "power-platform" | "exchange-admin" | "audit-compliance" | "security-read" | "endpoint-read" | "analytics-read" | "change-tracking" | "azure-ops";
export declare const ALL_CAPABILITY_PACKS: CapabilityPack[];
export declare const CLIENT_INSTALLABLE_CAPABILITY_PACKS: CapabilityPack[];
export type ToolNamespace = "tenant" | "identity" | "collaboration" | "meetings" | "power-platform" | "exchange" | "audit" | "security" | "endpoint" | "analytics" | "change-tracking" | "azure-ops" | "raw-graph";
export interface CapabilityPackManifest {
    name: CapabilityPack;
    description: string;
    clientInstallable: boolean;
    namespaces: ToolNamespace[];
    resources: string[];
    graphApplicationPermissions: string[];
    graphDelegatedPermissions: string[];
    servicePermissions?: string[];
    tools: string[];
    prerequisites: string[];
}
export declare function getCapabilityPackManifest(pack: CapabilityPack): CapabilityPackManifest;
export declare function requiredResourcesForPacks(packs: CapabilityPack[]): string[];
export declare function prerequisitesForPacks(packs: CapabilityPack[]): string[];
export declare function capabilityPacksForEnvironment(environment: TenantEnvironment | undefined): CapabilityPack[];
export declare function effectiveCapabilityPacks(tenant: TenantConfig): CapabilityPack[];
export declare function enabledNamespaces(tenant: TenantConfig): ToolNamespace[];
export declare function validateTenantCapabilityProfile(tenant: TenantConfig): void;
export declare function namespaceForToolName(toolName: string): ToolNamespace;
export declare function assertTenantAllowsNamespace(tenant: TenantConfig, toolName: string, namespace?: ToolNamespace): void;
