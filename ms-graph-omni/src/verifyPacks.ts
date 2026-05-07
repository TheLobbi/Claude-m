import {
  CLIENT_INSTALLABLE_CAPABILITY_PACKS,
  getCapabilityPackManifest,
  requiredResourcesForPacks,
  type CapabilityPack,
} from "./capabilities.js";

export interface PackVerificationCheck {
  name: string;
  status: "planned";
  details: string;
}

export interface PackVerificationPlan {
  packs: CapabilityPack[];
  requiredResources: string[];
  checks: PackVerificationCheck[];
}

export function buildPackVerificationPlan(packs: CapabilityPack[]): PackVerificationPlan {
  const manifests = packs.map((pack) => getCapabilityPackManifest(pack));
  const checks: PackVerificationCheck[] = [];
  for (const manifest of manifests) {
    checks.push({
      name: `${manifest.name}:manifest`,
      status: "planned",
      details: `Loaded manifest for namespaces: ${manifest.namespaces.join(", ")}`,
    });
    checks.push({
      name: `${manifest.name}:tenant-prerequisites`,
      status: "planned",
      details: manifest.prerequisites.join("; "),
    });
  }
  return {
    packs,
    requiredResources: requiredResourcesForPacks(packs),
    checks,
  };
}

export function parsePackArgs(args: string[]): CapabilityPack[] {
  const packs: CapabilityPack[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--pack" && args[i + 1]) {
      if (args[i + 1] === "all") {
        packs.push(...CLIENT_INSTALLABLE_CAPABILITY_PACKS);
      } else {
        packs.push(args[i + 1] as CapabilityPack);
      }
      i++;
    }
  }
  return [...new Set(packs)];
}
