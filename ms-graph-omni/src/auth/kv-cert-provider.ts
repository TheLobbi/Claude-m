/**
 * Pulls the certificate (private key + thumbprint) from Azure Key Vault.
 *
 * Uses DefaultAzureCredential, which tries (in order):
 *   1. Environment vars (AZURE_CLIENT_ID + AZURE_CLIENT_SECRET ... — none set, skipped)
 *   2. Managed Identity (when running in Azure — skipped on dev box)
 *   3. Azure CLI (`az login`)        <-- this is what works for Markus + Brad
 *   4. Azure PowerShell
 *   5. Visual Studio / VS Code
 *
 * The cert is stored in KV as a "certificate" with the matching secret holding the PFX
 * (PKCS#12) blob, base64 encoded. KV uses SHA-256 MAC which several pure-JS PKCS#12
 * parsers don't fully support, so we shell out to `openssl pkcs12` for PFX→PEM
 * conversion. OpenSSL is shipped with Git for Windows (default path detected) or anywhere
 * on PATH.
 */
import { DefaultAzureCredential } from "@azure/identity";
import { CertificateClient } from "@azure/keyvault-certificates";
import { SecretClient } from "@azure/keyvault-secrets";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "../logger.js";

export interface ResolvedCertificate {
  privateKey: string; // PEM
  thumbprint: string; // hex uppercase
}

interface CachedCertificate {
  resolved: ResolvedCertificate;
  cachedAt: number;
}

const certificateCache = new Map<string, CachedCertificate>();
const CACHE_MS = 60 * 60 * 1000; // 1h

const GIT_MINGW_OPENSSL = "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe";
const GIT_MINGW_OPENSSL_MODULES = "C:\\Program Files\\Git\\mingw64\\lib\\ossl-modules";

const OPENSSL_CANDIDATES = [
  "openssl",
  GIT_MINGW_OPENSSL,
  "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
  "/usr/bin/openssl",
  "/usr/local/bin/openssl",
];

function opensslEnv(candidate: string): NodeJS.ProcessEnv | undefined {
  if (candidate === GIT_MINGW_OPENSSL && existsSync(GIT_MINGW_OPENSSL_MODULES)) {
    return { ...process.env, OPENSSL_MODULES: GIT_MINGW_OPENSSL_MODULES };
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function certificateCacheKey(vaultUrl: string, certName: string): string {
  return `${vaultUrl}|${certName}`;
}

function pfxToPem(pfxBytes: Buffer): { privateKey: string; certPem: string } {
  const dir = mkdtempSync(join(tmpdir(), "msgo-"));
  const pfxPath = join(dir, "cert.pfx");
  const pemPath = join(dir, "cert.pem");
  const failures: string[] = [];
  try {
    writeFileSync(pfxPath, pfxBytes);
    for (const openssl of OPENSSL_CANDIDATES) {
      try {
        const env = opensslEnv(openssl);
        // -nodes: don't encrypt private key; -password pass:: empty password
        execFileSync(
          openssl,
          [
            "pkcs12",
            "-in",
            pfxPath,
            "-nodes",
            "-out",
            pemPath,
            "-password",
            "pass:",
            "-legacy", // KV may use legacy ciphers
          ],
          { stdio: "pipe", env }
        );
        const pem = readFileSync(pemPath, "utf-8");
        // PEM file contains both: -----BEGIN PRIVATE KEY----- ... and -----BEGIN CERTIFICATE----- ...
        const keyMatch = pem.match(/-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----/);
        const certMatch = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
        if (!keyMatch || !certMatch) throw new Error("openssl PEM output missing key or cert");
        return { privateKey: keyMatch[0], certPem: certMatch[0] };
      } catch (error) {
        failures.push(`${openssl}: ${errorMessage(error)}`);
      }
    }
    throw new Error(
      `openssl pkcs12 conversion failed for all candidates. ${failures.join(" | ")}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function getCertificate(
  vaultUrl: string,
  certName: string
): Promise<ResolvedCertificate> {
  const cacheKey = certificateCacheKey(vaultUrl, certName);
  const cached = certificateCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_MS) {
    return cached.resolved;
  }

  logger.info({ vaultUrl, certName }, "fetching certificate from Key Vault");
  const credential = new DefaultAzureCredential();

  const certClient = new CertificateClient(vaultUrl, credential);
  const cert = await certClient.getCertificate(certName);
  if (!cert.properties.x509Thumbprint) {
    throw new Error("Certificate has no x509Thumbprint");
  }
  const thumbprint = Buffer.from(cert.properties.x509Thumbprint)
    .toString("hex")
    .toUpperCase();

  const secretClient = new SecretClient(vaultUrl, credential);
  const secret = await secretClient.getSecret(certName);
  if (!secret.value) {
    throw new Error("Certificate secret has no value (cert may not be exportable)");
  }

  const pfxBytes = Buffer.from(secret.value, "base64");
  const { privateKey } = pfxToPem(pfxBytes);

  const resolved: ResolvedCertificate = { privateKey, thumbprint };
  certificateCache.set(cacheKey, { resolved, cachedAt: Date.now() });
  logger.info({ thumbprint }, "certificate ready");
  return resolved;
}
