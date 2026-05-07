import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppOnlyToken: vi.fn(),
  getTenant: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("../src/auth/app-only-client.js", () => ({
  getAppOnlyToken: mocks.getAppOnlyToken,
}));

vi.mock("../src/config.js", () => ({
  getTenant: mocks.getTenant,
}));

describe("resource auth client", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getAppOnlyToken.mockReset();
    mocks.getTenant.mockReset();
    mocks.fetch.mockReset();
    mocks.getTenant.mockReturnValue({
      slug: "client-acme",
      tenantId: "tenant-1",
      clientId: "client-1",
      vaultUrl: "https://kv.example/",
      certName: "graph-cert",
    });
    mocks.getAppOnlyToken.mockResolvedValue("token-123");
  });

  it("requests a token for the requested resource audience", async () => {
    const { getResourceToken } = await import("../src/auth/resource-client.js");

    await getResourceToken({
      tenantSlug: "client-acme",
      resource: "https://manage.office.com",
    });
    await getResourceToken({
      tenantSlug: "client-acme",
      resource: "https://api.fabric.microsoft.com",
    });

    expect(mocks.getAppOnlyToken).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ scope: "https://manage.office.com/.default" })
    );
    expect(mocks.getAppOnlyToken).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ scope: "https://api.fabric.microsoft.com/.default" })
    );
  });

  it("uses a memory-only app token cache for client tenant profiles", async () => {
    mocks.getTenant.mockReturnValue({
      slug: "client-acme",
      tenantId: "tenant-1",
      clientId: "client-1",
      vaultUrl: "https://kv.example/",
      certName: "graph-cert",
      environment: "client",
    });
    const { getResourceToken } = await import("../src/auth/resource-client.js");

    await getResourceToken({
      tenantSlug: "client-acme",
      resource: "https://manage.office.com",
    });

    expect(mocks.getAppOnlyToken).toHaveBeenCalledWith(
      expect.objectContaining({ cachePolicy: "memory" })
    );
  });

  it("sends bearer-authenticated HTTP requests relative to the service base URL", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ value: [{ id: "one" }] }),
    });
    const { createResourceClient } = await import("../src/auth/resource-client.js");
    const client = createResourceClient({
      tenantSlug: "client-acme",
      resource: "https://management.azure.com",
      baseUrl: "https://management.azure.com",
      fetchFn: mocks.fetch,
    });

    const result = await client.get("/subscriptions", { "api-version": "2022-12-01" });

    expect(result).toEqual({ value: [{ id: "one" }] });
    expect(mocks.fetch).toHaveBeenCalledWith(
      "https://management.azure.com/subscriptions?api-version=2022-12-01",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ authorization: "Bearer token-123" }),
      })
    );
  });
});
