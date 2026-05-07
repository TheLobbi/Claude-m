import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCertificate: vi.fn(),
  acquireTokenByClientCredential: vi.fn(),
  ConfidentialClientApplication: vi.fn(),
}));

vi.mock("../src/auth/kv-cert-provider.js", () => ({
  getCertificate: mocks.getCertificate,
}));

vi.mock("@azure/msal-node", () => ({
  LogLevel: { Error: 0, Warning: 1 },
  ConfidentialClientApplication: mocks.ConfidentialClientApplication,
}));

describe("app-only token cache policy", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getCertificate.mockReset();
    mocks.acquireTokenByClientCredential.mockReset();
    mocks.ConfidentialClientApplication.mockReset();
    mocks.getCertificate.mockResolvedValue({
      privateKey: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----",
      thumbprint: "ABCD",
    });
    mocks.acquireTokenByClientCredential.mockResolvedValue({ accessToken: "token" });
    mocks.ConfidentialClientApplication.mockImplementation(() => ({
      acquireTokenByClientCredential: mocks.acquireTokenByClientCredential,
    }));
  });

  it("does not configure persistent token cache when cachePolicy is memory", async () => {
    const { getAppOnlyToken } = await import("../src/auth/app-only-client.js");

    await getAppOnlyToken({
      tenantId: "tenant-1",
      clientId: "client-1",
      vaultUrl: "https://kv.example/",
      certName: "graph-cert",
      cachePolicy: "memory",
    });

    expect(mocks.ConfidentialClientApplication).toHaveBeenCalledWith(
      expect.not.objectContaining({ cache: expect.anything() })
    );
  });

  it("uses persistent token cache by default for internal legacy callers", async () => {
    vi.doMock("@azure/msal-node-extensions", () => ({
      FilePersistenceWithDataProtection: {
        create: vi.fn().mockResolvedValue({}),
      },
      DataProtectionScope: { CurrentUser: "CurrentUser" },
      PersistenceCachePlugin: vi.fn().mockImplementation(() => ({ kind: "cache-plugin" })),
    }));
    const { getAppOnlyToken } = await import("../src/auth/app-only-client.js");

    await getAppOnlyToken({
      tenantId: "tenant-2",
      clientId: "client-2",
      vaultUrl: "https://kv.example/",
      certName: "graph-cert",
    });

    expect(mocks.ConfidentialClientApplication).toHaveBeenCalledWith(
      expect.objectContaining({ cache: { cachePlugin: { kind: "cache-plugin" } } })
    );
  });

  it("falls back to memory-only cache when encrypted persistent cache is unavailable", async () => {
    vi.doMock("@azure/msal-node-extensions", () => ({
      FilePersistenceWithDataProtection: {
        create: vi.fn().mockRejectedValue(new Error("keytar unavailable")),
      },
      DataProtectionScope: { CurrentUser: "CurrentUser" },
      PersistenceCachePlugin: vi.fn(),
    }));
    const { getAppOnlyToken } = await import("../src/auth/app-only-client.js");

    await getAppOnlyToken({
      tenantId: "tenant-3",
      clientId: "client-3",
      vaultUrl: "https://kv.example/",
      certName: "graph-cert",
    });

    expect(mocks.ConfidentialClientApplication).toHaveBeenCalledWith(
      expect.not.objectContaining({ cache: expect.anything() })
    );
  });
});
