import { writeFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  getCertificate: vi.fn(),
  getSecret: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: mocks.execFileSync,
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class DefaultAzureCredential {},
}));

vi.mock("@azure/keyvault-certificates", () => ({
  CertificateClient: class CertificateClient {
    getCertificate = mocks.getCertificate;
  },
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class SecretClient {
    getSecret = mocks.getSecret;
  },
}));

const pem = [
  "-----BEGIN PRIVATE KEY-----",
  "key",
  "-----END PRIVATE KEY-----",
  "-----BEGIN CERTIFICATE-----",
  "cert",
  "-----END CERTIFICATE-----",
].join("\n");

describe("getCertificate", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.execFileSync.mockReset();
    mocks.getCertificate.mockReset();
    mocks.getSecret.mockReset();
  });

  it("tries another OpenSSL executable when the first cannot load the legacy provider", async () => {
    mocks.getCertificate.mockResolvedValue({
      properties: { x509Thumbprint: new Uint8Array([0xab, 0xcd]) },
    });
    mocks.getSecret.mockResolvedValue({
      value: Buffer.from("pfx-bytes").toString("base64"),
    });
    mocks.execFileSync.mockImplementation((command: string, args: string[]) => {
      if (args[0] === "version") return Buffer.from("OpenSSL 3");
      if (args[0] !== "pkcs12") {
        throw new Error(`unexpected openssl args: ${args.join(" ")}`);
      }
      if (command === "openssl") {
        throw new Error("unable to load provider legacy");
      }
      const outArgIndex = args.indexOf("-out");
      writeFileSync(args[outArgIndex + 1], pem);
      return Buffer.from("");
    });

    const { getCertificate } = await import("../src/auth/kv-cert-provider.js");

    const certificate = await getCertificate("https://vault.example/", "graph-cert");

    expect(certificate).toEqual({
      privateKey: ["-----BEGIN PRIVATE KEY-----", "key", "-----END PRIVATE KEY-----"].join("\n"),
      thumbprint: "ABCD",
    });
    expect(mocks.execFileSync).toHaveBeenCalledWith("openssl", expect.any(Array), expect.any(Object));
    expect(mocks.execFileSync).toHaveBeenCalledWith(
      "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe",
      expect.any(Array),
      expect.any(Object)
    );
  });

  it("caches certificates by vault URL and certificate name", async () => {
    mocks.getCertificate
      .mockResolvedValueOnce({
        properties: { x509Thumbprint: new Uint8Array([0x01]) },
      })
      .mockResolvedValueOnce({
        properties: { x509Thumbprint: new Uint8Array([0x02]) },
      });
    mocks.getSecret.mockResolvedValue({
      value: Buffer.from("pfx-bytes").toString("base64"),
    });
    mocks.execFileSync.mockImplementation((_command: string, args: string[]) => {
      const outArgIndex = args.indexOf("-out");
      writeFileSync(args[outArgIndex + 1], pem);
      return Buffer.from("");
    });

    const { getCertificate } = await import("../src/auth/kv-cert-provider.js");

    const first = await getCertificate("https://vault-a.example/", "graph-cert-a");
    const second = await getCertificate("https://vault-b.example/", "graph-cert-b");

    expect(first.thumbprint).toBe("01");
    expect(second.thumbprint).toBe("02");
  });
});
