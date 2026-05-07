import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

function runInstallDryRun(opts: { capabilityPacks?: string } = {}): unknown {
  const output = execFileSync(
    "pwsh",
    [
      "-NoProfile",
      "-File",
      "scripts/install-client-tenant.ps1",
      "-Slug",
      "client-acme",
      "-TenantId",
      "11111111-1111-1111-1111-111111111111",
      "-ClientId",
      "22222222-2222-2222-2222-222222222222",
      "-VaultUrl",
      "https://client-kv.vault.azure.net/",
      "-CertName",
      "msgo-client-acme",
      "-CapabilityPacks",
      opts.capabilityPacks ?? "baseline-read,collaboration",
      "-ConsentEvidenceRef",
      "client-acme/admin-consent-record",
      "-GrantedBy",
      "admin@example.com",
    ],
    { cwd: process.cwd(), encoding: "utf-8" }
  );
  return JSON.parse(output);
}

function createFakeAz(opts: { tenantId?: string } = {}): { binDir: string; logPath: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "msgo-fake-az-"));
  const binDir = join(dir, "bin");
  const logPath = join(dir, "az-calls.jsonl");
  const scriptPath = join(dir, "fake-az.js");
  const cmdPath = join(binDir, "az.cmd");
  const tenantId = opts.tenantId ?? "11111111-1111-1111-1111-111111111111";
  execFileSync("pwsh", ["-NoProfile", "-Command", `New-Item -ItemType Directory -Force -Path '${binDir}' | Out-Null`]);
  writeFileSync(
    scriptPath,
    `
const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(logPath)}, JSON.stringify(args) + "\\n");
const has = (...needles) => needles.every((needle) => args.includes(needle));
const json = (value) => process.stdout.write(JSON.stringify(value));
if (has("account", "show")) json({ tenantId: ${JSON.stringify(tenantId)}, id: "sub-1", user: { name: "admin@example.com" } });
else if (has("ad", "sp", "show") && args.includes("00000003-0000-0000-c000-000000000000")) json({
  id: "graph-sp-object-id",
  appId: "00000003-0000-0000-c000-000000000000",
  oauth2PermissionScopes: [
    { value: "openid", id: "scope-openid" },
    { value: "profile", id: "scope-profile" },
    { value: "email", id: "scope-email" },
    { value: "offline_access", id: "scope-offline" },
    { value: "User.Read", id: "scope-user-read" },
    { value: "Mail.ReadWrite", id: "scope-mail-rw" },
    { value: "Mail.Send", id: "scope-mail-send" },
    { value: "Calendars.ReadWrite", id: "scope-cal-rw" },
    { value: "Contacts.ReadWrite", id: "scope-contacts-rw" },
    { value: "Files.ReadWrite.All", id: "scope-files-rw" },
    { value: "Sites.ReadWrite.All", id: "scope-sites-rw" },
    { value: "Chat.ReadWrite", id: "scope-chat-rw" },
    { value: "ChannelMessage.Send", id: "scope-channel-send" },
    { value: "Tasks.ReadWrite", id: "scope-tasks-rw" },
    { value: "Notes.ReadWrite.All", id: "scope-notes-rw" }
  ],
  appRoles: [
    { value: "Organization.Read.All", id: "role-org-read" },
    { value: "User.Read.All", id: "role-user-read" },
    { value: "Group.Read.All", id: "role-group-read" },
    { value: "Directory.Read.All", id: "role-directory-read" },
    { value: "Mail.ReadWrite", id: "role-mail-rw" },
    { value: "Mail.Send", id: "role-mail-send" },
    { value: "Calendars.ReadWrite", id: "role-cal-rw" },
    { value: "Contacts.ReadWrite", id: "role-contacts-rw" },
    { value: "Files.ReadWrite.All", id: "role-files-rw" },
    { value: "Sites.ReadWrite.All", id: "role-sites-rw" },
    { value: "Chat.ReadWrite.All", id: "role-chat-rw" },
    { value: "ChannelMessage.Read.All", id: "role-channel-read" },
    { value: "Team.ReadBasic.All", id: "role-team-read" },
    { value: "Tasks.ReadWrite.All", id: "role-tasks-rw" },
    { value: "Notes.ReadWrite.All", id: "role-notes-rw" },
    { value: "AuditLog.Read.All", id: "role-audit-read" },
    { value: "Reports.Read.All", id: "role-reports-read" }
  ]
});
else if (has("ad", "app", "create")) json({ appId: "created-client-id", id: "created-app-object-id" });
else if (has("ad", "app", "show")) json({ appId: "existing-client-id", id: "existing-app-object-id" });
else if (has("ad", "app", "update")) json({});
else if (has("ad", "sp", "list")) {
  const joined = args.join(" ");
  json(joined.includes("existing-client-id") ? [{ id: "existing-sp-object-id" }] : []);
}
else if (has("ad", "sp", "create")) json({ id: "created-sp-object-id" });
else if (has("keyvault", "certificate", "show")) json({ id: "cert-id", attributes: { enabled: true } });
else if (has("keyvault", "certificate", "get-default-policy")) json({});
else if (has("keyvault", "certificate", "create")) json({});
else if (has("keyvault", "certificate", "download")) {
  const file = args[args.indexOf("--file") + 1];
  fs.writeFileSync(file, "-----BEGIN CERTIFICATE-----\\nZmFrZQ==\\n-----END CERTIFICATE-----\\n");
  json({});
}
else if (has("keyvault", "show")) json({ id: "/subscriptions/sub-1/resourceGroups/rg/providers/Microsoft.KeyVault/vaults/client-kv" });
else if (has("rest")) json({});
else if (has("role", "assignment", "list")) json([]);
else if (has("role", "assignment", "create")) json({});
else if (has("ad", "app", "permission", "admin-consent")) json({});
else json({});
`,
    "utf-8"
  );
  writeFileSync(cmdPath, `@echo off\r\nnode "${scriptPath}" %*\r\n`, "utf-8");
  return { binDir, logPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function runApply(args: string[], fakeAz: { binDir: string }): ReturnType<typeof spawnSync> {
  return spawnSync("pwsh", ["-NoProfile", "-File", "scripts/install-client-tenant.ps1", ...args], {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: "pipe",
    env: { ...process.env, PATH: `${fakeAz.binDir};${process.env.PATH}` },
  });
}

function readAzCalls(logPath: string): string[][] {
  return readFileSync(logPath, "utf-8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

describe("client tenant installer scripts", () => {
  it("produces deterministic non-secret dry-run output", () => {
    const result = runInstallDryRun() as {
      mode: string;
      tenantProfile: {
        slug: string;
        environment: string;
        capabilityPacks: string[];
        clientId: string;
        certName: string;
        consent: { evidenceRef: string };
      };
      requiredResources: string[];
      sensitiveValuesWritten: boolean;
    };

    expect(result.mode).toBe("dry-run");
    expect(result.tenantProfile).toMatchObject({
      slug: "client-acme",
      environment: "client",
      capabilityPacks: ["baseline-read", "collaboration"],
      clientId: "22222222-2222-2222-2222-222222222222",
      certName: "msgo-client-acme",
      consent: { evidenceRef: "client-acme/admin-consent-record" },
    });
    expect(result.requiredResources).toContain("https://graph.microsoft.com");
    expect(result.sensitiveValuesWritten).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/clientSecret|accessToken|refreshToken|privateKey|certValue/i);
  });

  it("refuses internal-full for client tenant installs", () => {
    const result = spawnSync(
      "pwsh",
      [
        "-NoProfile",
        "-File",
        "scripts/install-client-tenant.ps1",
        "-Slug",
        "client-acme",
        "-TenantId",
        "11111111-1111-1111-1111-111111111111",
        "-ClientId",
        "22222222-2222-2222-2222-222222222222",
        "-VaultUrl",
        "https://client-kv.vault.azure.net/",
        "-CertName",
        "msgo-client-acme",
        "-CapabilityPacks",
        "baseline-read,internal-full",
        "-ConsentEvidenceRef",
        "client-acme/admin-consent-record",
      ],
      { cwd: process.cwd(), encoding: "utf-8", stdio: "pipe" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/internal-full.*client tenant/i);
  });

  it("validates a client tenant profile without live service calls", () => {
    const dir = mkdtempSync(join(tmpdir(), "msgo-profile-"));
    const profilePath = join(dir, "tenant-profile.json");
    try {
      writeFileSync(
        profilePath,
        JSON.stringify({
          slug: "client-acme",
          tenantId: "11111111-1111-1111-1111-111111111111",
          clientId: "22222222-2222-2222-2222-222222222222",
          vaultUrl: "https://client-kv.vault.azure.net/",
          certName: "msgo-client-acme",
          environment: "client",
          capabilityPacks: ["baseline-read", "audit-compliance"],
          consent: {
            appRegistrationMode: "single-tenant",
            grantedAt: "2026-05-06T00:00:00Z",
            grantedBy: "admin@example.com",
            evidenceRef: "client-acme/admin-consent-record",
          },
        })
      );

      const output = execFileSync(
        "pwsh",
        [
          "-NoProfile",
          "-File",
          "scripts/validate-client-tenant.ps1",
          "-TenantProfilePath",
          profilePath,
          "-DryRun",
        ],
        { cwd: process.cwd(), encoding: "utf-8" }
      );
      const result = JSON.parse(output) as {
        ok: boolean;
        slug: string;
        checkedPacks: string[];
        requiredResources: string[];
        liveChecksSkipped: boolean;
      };

      expect(result).toMatchObject({
        ok: true,
        slug: "client-acme",
        checkedPacks: ["baseline-read", "audit-compliance"],
        liveChecksSkipped: true,
      });
      expect(result.requiredResources).toContain("https://manage.office.com");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("validates a client tenant profile with live Azure CLI checks", () => {
    const fakeAz = createFakeAz();
    const dir = mkdtempSync(join(tmpdir(), "msgo-profile-"));
    const profilePath = join(dir, "tenant-profile.json");
    try {
      writeFileSync(
        profilePath,
        JSON.stringify({
          slug: "client-acme",
          tenantId: "11111111-1111-1111-1111-111111111111",
          clientId: "existing-client-id",
          vaultUrl: "https://client-kv.vault.azure.net/",
          certName: "msgo-client-acme",
          environment: "client",
          capabilityPacks: ["baseline-read", "audit-compliance"],
          consent: {
            appRegistrationMode: "single-tenant",
            grantedAt: "2026-05-06T00:00:00Z",
            grantedBy: "admin@example.com",
            evidenceRef: "client-acme/admin-consent-record",
          },
        })
      );

      const output = execFileSync(
        "pwsh",
        [
          "-NoProfile",
          "-File",
          "scripts/validate-client-tenant.ps1",
          "-TenantProfilePath",
          profilePath,
        ],
        {
          cwd: process.cwd(),
          encoding: "utf-8",
          env: { ...process.env, PATH: `${fakeAz.binDir};${process.env.PATH}` },
        }
      );
      const result = JSON.parse(output) as {
        ok: boolean;
        liveChecksSkipped: boolean;
        checks: Array<{ name: string; status: string }>;
      };

      expect(result.ok).toBe(true);
      expect(result.liveChecksSkipped).toBe(false);
      expect(result.checks).toEqual(
        expect.arrayContaining([
          { name: "az-tenant-context", status: "pass" },
          { name: "app-registration", status: "pass" },
          { name: "service-principal", status: "pass" },
          { name: "key-vault-certificate", status: "pass" },
          { name: "graph-permission-resolution", status: "pass" },
        ])
      );
      const calls = readAzCalls(fakeAz.logPath).map((call) => call.join(" "));
      expect(calls).toEqual(expect.arrayContaining([
        expect.stringMatching(/^account show /),
        expect.stringMatching(/^ad app show /),
        expect.stringMatching(/^ad sp list /),
        expect.stringMatching(/^keyvault certificate show /),
        expect.stringMatching(/^ad sp show /),
      ]));
    } finally {
      rmSync(dir, { recursive: true, force: true });
      fakeAz.cleanup();
    }
  });

  it("requires an explicit output path for live apply", () => {
    const fakeAz = createFakeAz();
    try {
      const result = runApply(
        [
          "-Apply",
          "-Slug",
          "client-acme",
          "-TenantId",
          "11111111-1111-1111-1111-111111111111",
          "-VaultUrl",
          "https://client-kv.vault.azure.net/",
          "-CertName",
          "msgo-client-acme",
          "-CapabilityPacks",
          "baseline-read",
          "-ConsentEvidenceRef",
          "client-acme/admin-consent-record",
        ],
        fakeAz
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/TenantProfileOutputPath.*required/i);
    } finally {
      fakeAz.cleanup();
    }
  });

  it("refuses live apply when the active az tenant differs from the target tenant", () => {
    const fakeAz = createFakeAz({ tenantId: "99999999-9999-9999-9999-999999999999" });
    const dir = mkdtempSync(join(tmpdir(), "msgo-apply-"));
    try {
      const result = runApply(
        [
          "-Apply",
          "-Slug",
          "client-acme",
          "-TenantId",
          "11111111-1111-1111-1111-111111111111",
          "-VaultUrl",
          "https://client-kv.vault.azure.net/",
          "-CertName",
          "msgo-client-acme",
          "-CapabilityPacks",
          "baseline-read",
          "-ConsentEvidenceRef",
          "client-acme/admin-consent-record",
          "-TenantProfileOutputPath",
          join(dir, "profile.json"),
        ],
        fakeAz
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/active az tenant.*does not match/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      fakeAz.cleanup();
    }
  });

  it("creates a client app, certificate, RBAC assignments, and non-secret profile during live apply", () => {
    const fakeAz = createFakeAz();
    const dir = mkdtempSync(join(tmpdir(), "msgo-apply-"));
    const profilePath = join(dir, "profile.json");
    try {
      const result = runApply(
        [
          "-Apply",
          "-GrantAdminConsent",
          "-Slug",
          "client-acme",
          "-TenantId",
          "11111111-1111-1111-1111-111111111111",
          "-VaultUrl",
          "https://client-kv.vault.azure.net/",
          "-CertName",
          "msgo-client-acme",
          "-CapabilityPacks",
          "baseline-read,collaboration",
          "-ConsentEvidenceRef",
          "client-acme/admin-consent-record",
          "-GrantedBy",
          "admin@example.com",
          "-TenantProfileOutputPath",
          profilePath,
        ],
        fakeAz
      );

      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout) as { mode: string; tenantProfile: { clientId: string }; adminConsent: string };
      expect(output).toMatchObject({ mode: "apply", adminConsent: "granted" });
      expect(output.tenantProfile.clientId).toBe("created-client-id");
      const profileRaw = readFileSync(profilePath, "utf-8");
      const profile = JSON.parse(profileRaw) as { clientId: string; environment: string; consent: { evidenceRef: string } };
      expect(profile).toMatchObject({
        clientId: "created-client-id",
        environment: "client",
        consent: { evidenceRef: "client-acme/admin-consent-record" },
      });
      expect(profileRaw).not.toMatch(/clientSecret|accessToken|refreshToken|privateKey|certValue|BEGIN CERTIFICATE|BEGIN PRIVATE KEY/i);
      const calls = readAzCalls(fakeAz.logPath).map((call) => call.join(" "));
      expect(calls).toEqual(expect.arrayContaining([
        expect.stringMatching(/^ad app create /),
        expect.stringMatching(/^ad sp create /),
        expect.stringMatching(/^keyvault certificate show /),
        expect.stringMatching(/^keyvault certificate download /),
        expect.stringMatching(/^rest --method PATCH /),
        expect.stringMatching(/^role assignment create /),
        expect.stringMatching(/^ad app permission admin-consent /),
      ]));
    } finally {
      rmSync(dir, { recursive: true, force: true });
      fakeAz.cleanup();
    }
  });

  it("updates an existing client app and emits manual consent command when admin consent is not granted", () => {
    const fakeAz = createFakeAz();
    const dir = mkdtempSync(join(tmpdir(), "msgo-apply-"));
    const profilePath = join(dir, "profile.json");
    try {
      const result = runApply(
        [
          "-Apply",
          "-Slug",
          "client-acme",
          "-TenantId",
          "11111111-1111-1111-1111-111111111111",
          "-ClientId",
          "existing-client-id",
          "-VaultUrl",
          "https://client-kv.vault.azure.net/",
          "-CertName",
          "msgo-client-acme",
          "-CapabilityPacks",
          "baseline-read",
          "-ConsentEvidenceRef",
          "client-acme/admin-consent-record",
          "-TenantProfileOutputPath",
          profilePath,
        ],
        fakeAz
      );

      expect(result.status).toBe(0);
      const output = JSON.parse(result.stdout) as { adminConsent: string; manualConsentCommand: string; tenantProfile: { clientId: string } };
      expect(output.tenantProfile.clientId).toBe("existing-client-id");
      expect(output.adminConsent).toBe("manual-required");
      expect(output.manualConsentCommand).toBe("az ad app permission admin-consent --id existing-client-id");
      const calls = readAzCalls(fakeAz.logPath).map((call) => call.join(" "));
      expect(calls).toEqual(expect.arrayContaining([expect.stringMatching(/^ad app update /)]));
      expect(calls.some((call) => call.startsWith("ad app create "))).toBe(false);
      expect(calls.some((call) => call.startsWith("ad app permission admin-consent "))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      fakeAz.cleanup();
    }
  });
});
