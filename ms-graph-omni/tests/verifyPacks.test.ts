import { describe, expect, it } from "vitest";
import { buildPackVerificationPlan, parsePackArgs } from "../src/verifyPacks.js";

describe("pack verification planning", () => {
  it("builds pack-specific checks from capability manifests", () => {
    const plan = buildPackVerificationPlan(["audit-compliance", "analytics-read"]);

    expect(plan.packs).toEqual(["audit-compliance", "analytics-read"]);
    expect(plan.requiredResources).toEqual(
      expect.arrayContaining([
        "https://manage.office.com",
        "https://analysis.windows.net/powerbi/api",
        "https://api.fabric.microsoft.com",
      ])
    );
    expect(plan.checks.map((check) => check.name)).toEqual(
      expect.arrayContaining([
        "audit-compliance:manifest",
        "analytics-read:manifest",
        "audit-compliance:tenant-prerequisites",
        "analytics-read:tenant-prerequisites",
      ])
    );
  });

  it("expands --pack all to every client-installable pack", () => {
    expect(parsePackArgs(["--pack", "all"])).toEqual(
      expect.arrayContaining([
        "baseline-read",
        "collaboration",
        "exchange-admin",
        "audit-compliance",
        "power-platform",
        "endpoint-read",
        "security-read",
        "analytics-read",
        "azure-ops",
      ])
    );
    expect(parsePackArgs(["--pack", "all"])).not.toContain("internal-full");
  });
});
