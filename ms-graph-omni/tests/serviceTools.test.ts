import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createResourceClient: vi.fn(),
  client: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../src/auth/resource-client.js", () => ({
  createResourceClient: mocks.createResourceClient,
}));

function installClientTenantEnv(capabilityPacks: string[]): void {
  process.env.MSGO_DEFAULT_TENANT = "client-acme";
  process.env.MSGO_TENANTS_JSON = JSON.stringify([
    {
      slug: "client-acme",
      tenantId: "11111111-1111-1111-1111-111111111111",
      clientId: "22222222-2222-2222-2222-222222222222",
      vaultUrl: "https://client-kv.vault.azure.net/",
      certName: "client-cert",
      environment: "client",
      capabilityPacks,
      consent: {
        appRegistrationMode: "single-tenant",
        grantedAt: "2026-05-06T00:00:00Z",
        evidenceRef: "client-acme/admin-consent-record",
      },
    },
  ]);
}

describe("service-plane tool bundles", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createResourceClient.mockReset();
    mocks.client.get.mockReset();
    mocks.client.post.mockReset();
    mocks.createResourceClient.mockReturnValue(mocks.client);
    mocks.client.get.mockResolvedValue({ value: [] });
    mocks.client.post.mockResolvedValue({ value: [] });
  });

  afterEach(() => {
    delete process.env.MSGO_DEFAULT_TENANT;
    delete process.env.MSGO_TENANTS_JSON;
  });

  it("registers the missing Microsoft service plane tools", async () => {
    const { tools } = await import("../src/tools/index.js");
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual(
      expect.arrayContaining([
        "exchange_listAcceptedDomains",
        "exchange_listTransportRules",
        "omi_startSubscription",
        "omi_listContent",
        "omi_getContent",
        "powerPlatform_listEnvironments",
        "powerApps_listApps",
        "powerAutomate_listFlows",
        "dataverse_listTables",
        "intune_listManagedDevices",
        "security_listIncidents",
        "defender_runAdvancedHunting",
        "powerbi_listWorkspaces",
        "fabric_listWorkspaces",
        "azure_listSubscriptions",
      ])
    );
  });

  it("routes OMI calls through manage.office.com with tenant context", async () => {
    installClientTenantEnv(["baseline-read", "audit-compliance"]);
    const { tools } = await import("../src/tools/index.js");
    const omiListContent = tools.find((tool) => tool.name === "omi_listContent");

    await omiListContent?.handler({
      tenantSlug: "client-acme",
      contentType: "Audit.General",
      startTime: "2026-05-06T00:00:00Z",
      endTime: "2026-05-06T01:00:00Z",
    });

    expect(mocks.createResourceClient).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantSlug: "client-acme",
        resource: "https://manage.office.com",
        baseUrl: "https://manage.office.com",
      })
    );
    expect(mocks.client.get).toHaveBeenCalledWith(
      "/api/v1.0/11111111-1111-1111-1111-111111111111/activity/feed/subscriptions/content",
      expect.objectContaining({
        contentType: "Audit.General",
        startTime: "2026-05-06T00:00:00Z",
        endTime: "2026-05-06T01:00:00Z",
      })
    );
  });

  it("blocks service tools before auth when the client tenant lacks the capability pack", async () => {
    installClientTenantEnv(["baseline-read"]);
    const { tools } = await import("../src/tools/index.js");
    const powerbiList = tools.find((tool) => tool.name === "powerbi_listWorkspaces");

    await expect(powerbiList?.handler({ tenantSlug: "client-acme" })).rejects.toThrow(
      /powerbi_listWorkspaces.*analytics.*not enabled/
    );
    expect(mocks.createResourceClient).not.toHaveBeenCalled();
  });
});
