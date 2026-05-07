import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  assertTenantAllowsNamespace,
  capabilityPacksForEnvironment,
  getCapabilityPackManifest,
  requiredResourcesForPacks,
  namespaceForToolName,
  validateTenantCapabilityProfile,
} from "../src/capabilities.js";
import type { TenantConfig } from "../src/config.js";

describe("tenant capability packs", () => {
  const clientTenant: TenantConfig = {
    slug: "client-acme",
    tenantId: "11111111-1111-1111-1111-111111111111",
    clientId: "22222222-2222-2222-2222-222222222222",
    vaultUrl: "https://client-kv.vault.azure.net/",
    certName: "client-cert",
    environment: "client",
    capabilityPacks: ["baseline-read", "collaboration"],
  };

  it("keeps client tenants narrow by default", () => {
    expect(capabilityPacksForEnvironment("client")).toEqual(["baseline-read"]);
  });

  it("keeps internal tenants full-capability by default for backward compatibility", () => {
    expect(capabilityPacksForEnvironment("internal")).toContain("internal-full");
  });

  it("maps existing tool names to capability namespaces", () => {
    expect(namespaceForToolName("users_list")).toBe("identity");
    expect(namespaceForToolName("teams_listChats")).toBe("collaboration");
    expect(namespaceForToolName("transcripts_listByOrganizer")).toBe("meetings");
    expect(namespaceForToolName("callRecords_list")).toBe("meetings");
    expect(namespaceForToolName("delta_drive")).toBe("change-tracking");
  });

  it("allows a namespace enabled by a tenant capability pack", () => {
    expect(() =>
      assertTenantAllowsNamespace(clientTenant, "teams_listChats", "collaboration")
    ).not.toThrow();
  });

  it("blocks a namespace missing from a client tenant capability pack", () => {
    expect(() =>
      assertTenantAllowsNamespace(clientTenant, "callRecords_list", "meetings")
    ).toThrow(/tenantSlug='client-acme'.*callRecords_list.*meetings.*not enabled/);
  });

  it("loads auditable pack manifests from config", () => {
    const audit = getCapabilityPackManifest("audit-compliance");
    expect(audit.namespaces).toContain("audit");
    expect(audit.resources).toContain("https://manage.office.com");
    expect(audit.graphApplicationPermissions).toContain("AuditLog.Read.All");
  });

  it("collects non-Graph token audiences for selected packs", () => {
    expect(requiredResourcesForPacks(["audit-compliance", "analytics-read", "azure-ops"])).toEqual(
      expect.arrayContaining([
        "https://manage.office.com",
        "https://analysis.windows.net/powerbi/api",
        "https://api.fabric.microsoft.com",
        "https://management.azure.com",
      ])
    );
  });

  it("rejects internal-full on client tenant profiles", () => {
    expect(() =>
      validateTenantCapabilityProfile({
        ...clientTenant,
        capabilityPacks: ["baseline-read", "internal-full"],
      })
    ).toThrow(/internal-full.*client-acme.*client tenant/);
  });

  it("requires consent evidence for client tenant profiles beyond baseline-read", () => {
    expect(() => validateTenantCapabilityProfile(clientTenant)).toThrow(
      /client-acme.*consent.*evidenceRef/
    );
  });
});

describe("tool handler tenant capability enforcement", () => {
  afterEach(() => {
    delete process.env.MSGO_TENANTS_JSON;
    delete process.env.MSGO_DEFAULT_TENANT;
    vi.resetModules();
  });

  it("blocks a tool before Graph auth when the client tenant lacks the namespace", async () => {
    process.env.MSGO_DEFAULT_TENANT = "client-acme";
    process.env.MSGO_TENANTS_JSON = JSON.stringify([
      {
        slug: "client-acme",
        tenantId: "11111111-1111-1111-1111-111111111111",
        clientId: "22222222-2222-2222-2222-222222222222",
        vaultUrl: "https://client-kv.vault.azure.net/",
        certName: "client-cert",
        environment: "client",
        capabilityPacks: ["baseline-read"],
      },
    ]);

    const { makeTool } = await import("../src/tools/_helpers.js");
    const tool = makeTool({
      name: "callRecords_list",
      description: "test tool",
      mode: "app",
      inputSchema: z.object({ tenantSlug: z.string().optional() }),
      call: async () => {
        throw new Error("Graph should not be called");
      },
    });

    await expect(tool.handler({ tenantSlug: "client-acme" })).rejects.toThrow(
      /tenantSlug='client-acme'.*callRecords_list.*meetings.*not enabled/
    );
  });
});

describe("tenant capability introspection", () => {
  afterEach(() => {
    delete process.env.MSGO_TENANTS_JSON;
    delete process.env.MSGO_DEFAULT_TENANT;
    vi.resetModules();
  });

  it("tenant_list returns required resources and prerequisites for enabled packs", async () => {
    process.env.MSGO_DEFAULT_TENANT = "client-acme";
    process.env.MSGO_TENANTS_JSON = JSON.stringify([
      {
        slug: "client-acme",
        tenantId: "11111111-1111-1111-1111-111111111111",
        clientId: "22222222-2222-2222-2222-222222222222",
        vaultUrl: "https://client-kv.vault.azure.net/",
        certName: "client-cert",
        environment: "client",
        capabilityPacks: ["baseline-read", "audit-compliance"],
        consent: {
          appRegistrationMode: "single-tenant",
          grantedAt: "2026-05-06T00:00:00Z",
          evidenceRef: "client-acme/admin-consent-record",
        },
      },
    ]);

    const { tenant_list } = await import("../src/tools/tenants.js");
    const result = (await tenant_list.handler({})) as { tenants: Array<Record<string, unknown>> };

    expect(result.tenants[0].requiredResources).toEqual(
      expect.arrayContaining(["https://graph.microsoft.com", "https://manage.office.com"])
    );
    expect(result.tenants[0].prerequisites).toEqual(
      expect.arrayContaining(["Office 365 Management Activity API permissions"])
    );
  });
});
