import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TenantConfig } from "./config.js";

export type TenantEnvironment = "internal" | "client";

export type CapabilityPack =
  | "internal-full"
  | "baseline-read"
  | "collaboration"
  | "meetings"
  | "power-platform"
  | "exchange-admin"
  | "audit-compliance"
  | "security-read"
  | "endpoint-read"
  | "analytics-read"
  | "change-tracking"
  | "azure-ops";

export const ALL_CAPABILITY_PACKS: CapabilityPack[] = [
  "internal-full",
  "baseline-read",
  "collaboration",
  "meetings",
  "power-platform",
  "exchange-admin",
  "audit-compliance",
  "security-read",
  "endpoint-read",
  "analytics-read",
  "change-tracking",
  "azure-ops",
];

export const CLIENT_INSTALLABLE_CAPABILITY_PACKS: CapabilityPack[] = ALL_CAPABILITY_PACKS.filter(
  (pack) => pack !== "internal-full"
);

export type ToolNamespace =
  | "tenant"
  | "identity"
  | "collaboration"
  | "meetings"
  | "power-platform"
  | "exchange"
  | "audit"
  | "security"
  | "endpoint"
  | "analytics"
  | "change-tracking"
  | "azure-ops"
  | "raw-graph";

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAPABILITY_PACK_DIR = resolve(__dirname, "..", "config", "capability-packs");
const manifestCache = new Map<CapabilityPack, CapabilityPackManifest>();

function readCapabilityPackManifest(pack: CapabilityPack): CapabilityPackManifest {
  const path = resolve(CAPABILITY_PACK_DIR, `${pack}.json`);
  if (!existsSync(path)) {
    throw new Error(`Capability pack manifest not found: ${path}`);
  }
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as CapabilityPackManifest;
  if (parsed.name !== pack) {
    throw new Error(`Capability pack manifest ${path} has name '${parsed.name}', expected '${pack}'`);
  }
  return parsed;
}

export function getCapabilityPackManifest(pack: CapabilityPack): CapabilityPackManifest {
  const cached = manifestCache.get(pack);
  if (cached) return cached;
  const manifest = readCapabilityPackManifest(pack);
  manifestCache.set(pack, manifest);
  return manifest;
}

export function requiredResourcesForPacks(packs: CapabilityPack[]): string[] {
  return [...new Set(packs.flatMap((pack) => getCapabilityPackManifest(pack).resources))];
}

export function prerequisitesForPacks(packs: CapabilityPack[]): string[] {
  return [...new Set(packs.flatMap((pack) => getCapabilityPackManifest(pack).prerequisites))];
}

export function capabilityPacksForEnvironment(
  environment: TenantEnvironment | undefined
): CapabilityPack[] {
  return environment === "client" ? ["baseline-read"] : ["internal-full"];
}

export function effectiveCapabilityPacks(tenant: TenantConfig): CapabilityPack[] {
  return tenant.capabilityPacks?.length
    ? tenant.capabilityPacks
    : capabilityPacksForEnvironment(tenant.environment);
}

export function enabledNamespaces(tenant: TenantConfig): ToolNamespace[] {
  const fromPacks = effectiveCapabilityPacks(tenant).flatMap(
    (pack) => getCapabilityPackManifest(pack).namespaces
  );
  const explicit = tenant.allowedNamespaces ?? [];
  return [...new Set([...fromPacks, ...explicit])];
}

export function validateTenantCapabilityProfile(tenant: TenantConfig): void {
  const packs = effectiveCapabilityPacks(tenant);
  for (const pack of packs) {
    getCapabilityPackManifest(pack);
  }

  if (tenant.environment === "client" && packs.includes("internal-full")) {
    throw new Error(
      `Capability pack internal-full cannot be enabled for '${tenant.slug}' because it is a client tenant profile.`
    );
  }

  const nonBaselineClientPacks = packs.filter((pack) => pack !== "baseline-read");
  if (tenant.environment === "client" && nonBaselineClientPacks.length > 0 && !tenant.consent?.evidenceRef) {
    throw new Error(
      `Client tenant '${tenant.slug}' enables ${nonBaselineClientPacks.join(", ")}; consent.evidenceRef is required.`
    );
  }
}

export function namespaceForToolName(toolName: string): ToolNamespace {
  const prefix = toolName.includes("_") ? toolName.slice(0, toolName.indexOf("_")) : toolName;
  switch (prefix) {
    case "tenant":
    case "tenants":
    case "org":
      return "tenant";
    case "users":
    case "groups":
    case "entra":
      return "identity";
    case "teams":
    case "mail":
    case "calendar":
    case "contacts":
    case "sharepoint":
    case "drive":
    case "onedrive":
    case "planner":
    case "todo":
    case "onenote":
    case "excel":
    case "search":
    case "me":
      return "collaboration";
    case "onlineMeetings":
    case "transcripts":
    case "recordings":
    case "callRecords":
      return "meetings";
    case "delta":
    case "subscriptions":
      return "change-tracking";
    case "exchange":
      return "exchange";
    case "omi":
    case "purview":
      return "audit";
    case "security":
    case "defender":
      return "security";
    case "intune":
      return "endpoint";
    case "powerbi":
    case "fabric":
      return "analytics";
    case "dataverse":
    case "powerAutomate":
    case "powerApps":
      return "power-platform";
    case "azure":
      return "azure-ops";
    case "graph":
    default:
      return "raw-graph";
  }
}

export function assertTenantAllowsNamespace(
  tenant: TenantConfig,
  toolName: string,
  namespace: ToolNamespace = namespaceForToolName(toolName)
): void {
  const allowed = enabledNamespaces(tenant);
  if (!allowed.includes(namespace)) {
    throw new Error(
      `tenantSlug='${tenant.slug}' cannot run tool '${toolName}': namespace '${namespace}' is not enabled. ` +
        `Enabled namespaces: ${allowed.join(", ") || "none"}. ` +
        `Add an appropriate capability pack to this tenant profile before retrying.`
    );
  }
}
