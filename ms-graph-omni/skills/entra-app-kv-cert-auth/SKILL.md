---
name: entra-app-kv-cert-auth
description: Reusable pattern for creating an Entra app registration, generating a cert, storing the PFX in Azure Key Vault, and wiring cert-based app-only + delegated auth into a Node/TypeScript MCP. Use whenever you need Claude to talk to a Microsoft API (Graph, Power BI, Fabric, Power Platform, Dynamics) without shared secrets or device-code prompts.
---

# entra-app-kv-cert-auth

The one-shot recipe for "Claude needs to call a Microsoft API, securely, for me and for teammates, without re-entering creds every time."

## When to use this skill

- Building a new MCP server that calls a Microsoft REST API
- Replacing a client-secret-based app reg with cert auth (eliminate rotating secrets)
- Adding a second teammate to an existing integration without sharing secrets
- Migrating from device-code to silent auth

## The pattern in one sentence

**App registration with certificate credential → cert stored in Key Vault → plugin pulls cert via `DefaultAzureCredential` at runtime → MSAL builds tokens → Graph SDK makes API calls.** Delegated mode layers `msal-node-extensions` persistent token cache on top so the browser login happens once.

## Why certificate, not client secret

- **No secrets in source, env files, or CI variables** — the only thing the plugin knows is the vault URL + cert name
- **Revocable without breaking anyone** — delete cert from KV, app is instantly offline; rotate cert = zero code change
- **Multi-user safe** — multiple teammates authenticate to the same KV with their own Azure creds and pull the same cert
- **Microsoft-recommended** for production app-only scenarios

## Prerequisites

- Azure CLI installed and `az login` against the target tenant
- Global Admin OR (Application Administrator + Cloud Application Administrator) on the tenant for admin consent
- Owner or Contributor on the subscription containing the Key Vault
- Key Vault exists and you have `Key Vault Certificates Officer` role on it

## Pattern steps

### Step 1 — Define required permissions

Create `config/permissions.app.json` and `config/permissions.delegated.json` listing the Graph / Power BI / etc. permission names (not GUIDs — the provision script resolves them).

### Step 2 — Create the app registration

```pwsh
$appName = "Lobbi-Cowork-Graph"   # customize
$tenantId = (az account show --query tenantId -o tsv)

# Create app
$app = az ad app create --display-name $appName `
    --sign-in-audience AzureADMyOrg `
    --required-resource-accesses "@config/permissions.resource-accesses.json" `
    -o json | ConvertFrom-Json
$appId = $app.appId
$objectId = $app.id

# Create service principal
$sp = az ad sp create --id $appId -o json | ConvertFrom-Json
$spObjectId = $sp.id
```

### Step 3 — Generate certificate in Key Vault (KV generates + stores private key — it never leaves)

```pwsh
$vaultName = "<your-vault-name>"
$certName = "<your-cert-name>"

# Default policy: RSA 2048, self-signed, 1 year validity, exportable
$policy = az keyvault certificate get-default-policy -o json
$policy | Set-Content -Path "cert-policy.json"

# Issue cert
az keyvault certificate create --vault-name $vaultName --name $certName --policy "@cert-policy.json"

# Wait for status "completed"
do {
    Start-Sleep -Seconds 2
    $status = az keyvault certificate show --vault-name $vaultName --name $certName --query "policy.issuerParameters.name" -o tsv 2>$null
} until ($status)
```

### Step 4 — Upload cert PUBLIC key to the app registration

The app only needs the public key to verify the token signature. Private key stays in KV.

```pwsh
# Export public key (.cer)
$cerPath = "$env:TEMP\$certName.cer"
az keyvault certificate download --vault-name $vaultName --name $certName --file $cerPath --encoding PEM

# Upload to app
az ad app credential reset --id $appId --cert "@$cerPath" --append
Remove-Item $cerPath
```

### Step 5 — Admin consent for the permissions

```pwsh
# App-only + delegated consent in one go
az ad app permission admin-consent --id $appId
```

### Step 6 — Grant KV data-plane access to the app AND to users who need delegated

```pwsh
# The app itself (app-only mode): Key Vault Certificate User on the cert secret
$kvId = (az keyvault show --name $vaultName --query id -o tsv)
az role assignment create `
    --role "Key Vault Certificate User" `
    --assignee-object-id $spObjectId `
    --assignee-principal-type ServicePrincipal `
    --scope $kvId

# Each human who runs the plugin (so DefaultAzureCredential works):
$userObjectId = (az ad user show --id "<user-upn>" --query id -o tsv)
az role assignment create `
    --role "Key Vault Certificate User" `
    --assignee-object-id $userObjectId `
    --assignee-principal-type User `
    --scope $kvId
```

### Step 7 — Wire auth in the plugin

```typescript
// src/auth/kv-cert-provider.ts
import { DefaultAzureCredential } from "@azure/identity";
import { CertificateClient } from "@azure/keyvault-certificates";
import { SecretClient } from "@azure/keyvault-secrets";
import * as forge from "node-forge";

export async function fetchCertificate(vaultUrl: string, certName: string) {
  const credential = new DefaultAzureCredential();
  const certClient = new CertificateClient(vaultUrl, credential);
  const secretClient = new SecretClient(vaultUrl, credential);
  const cert = await certClient.getCertificate(certName);
  const secret = await secretClient.getSecret(certName); // PFX base64
  const pfxBytes = Buffer.from(secret.value!, "base64");
  const p12Asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(pfxBytes));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, "");
  // ... extract key + cert PEM ...
  return { privateKey, thumbprint, x5c };
}
```

```typescript
// src/auth/app-only-client.ts
import { ConfidentialClientApplication } from "@azure/msal-node";
import { fetchCertificate } from "./kv-cert-provider.js";

export async function getAppOnlyToken(tenantId: string, clientId: string, scope: string) {
  const { privateKey, thumbprint, x5c } = await fetchCertificate(VAULT_URL, CERT_NAME);
  const msal = new ConfidentialClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientCertificate: { thumbprint, privateKey, x5c },
    },
  });
  const result = await msal.acquireTokenByClientCredential({ scopes: [scope] });
  return result!.accessToken;
}
```

```typescript
// src/auth/delegated-client.ts
import { PublicClientApplication } from "@azure/msal-node";
import { PersistenceCachePlugin, DataProtectionScope, FilePersistenceWithDataProtection } from "@azure/msal-node-extensions";
import * as path from "path";
import open from "open";

const cachePath = path.join(process.env.USERPROFILE!, ".msgo-cache", "msal.json");

export async function getDelegatedToken(tenantId: string, clientId: string, scopes: string[]) {
  const persistence = await FilePersistenceWithDataProtection.create(cachePath, DataProtectionScope.CurrentUser);
  const msal = new PublicClientApplication({
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}` },
    cache: { cachePlugin: new PersistenceCachePlugin(persistence) },
  });
  const accounts = await msal.getTokenCache().getAllAccounts();
  if (accounts.length > 0) {
    try {
      return (await msal.acquireTokenSilent({ account: accounts[0], scopes })).accessToken;
    } catch { /* fall through to interactive */ }
  }
  // First-run interactive flow via local redirect
  const result = await msal.acquireTokenInteractive({
    scopes,
    openBrowser: async (url) => { await open(url); },
    successTemplate: "<html><body><h2>Signed in. You can close this window.</h2></body></html>",
  });
  return result.accessToken;
}
```

## Files this skill produces

1. `config/permissions.resource-accesses.json` — Entra app permissions manifest
2. `scripts/provision-azure.ps1` — runs all the `az` commands in steps 2-6
3. `src/auth/kv-cert-provider.ts` — pulls cert from KV
4. `src/auth/app-only-client.ts` — MSAL confidential client
5. `src/auth/delegated-client.ts` — MSAL public client with persistent cache
6. `src/auth/index.ts` — `getGraphClient({ mode, scopes })` factory

## Reusing for other Microsoft APIs

Change only:

- Scope: `https://graph.microsoft.com/.default` → `https://analysis.windows.net/powerbi/api/.default` (Power BI), `https://api.fabric.microsoft.com/.default` (Fabric), `https://service.powerapps.com/.default` (Power Apps), etc.
- Add the corresponding API permissions in `permissions.resource-accesses.json`
- Re-run `az ad app permission admin-consent --id $appId`

Nothing else changes. Same cert, same KV, same plugin, same auth module.

## Troubleshooting

- **`AADSTS700027: Client assertion contains an invalid signature`** — cert on app reg doesn't match cert in KV. Re-run step 4.
- **`AADSTS65001: The user or administrator has not consented to use the application`** — re-run step 5, or check consent covered both app-only AND delegated permissions.
- **`Forbidden (403) certificate/secret not found`** — run `az role assignment list --assignee <user-or-sp> --scope <kv-id>` and confirm `Key Vault Certificate User` is present.
- **Delegated browser auth loops** — delete `%USERPROFILE%\.msgo-cache\` and try again. Token cache may be corrupted.
- **`AADSTS50011: Reply URL mismatch`** — for interactive flow add `http://localhost` as a public client redirect URI on the app: `az ad app update --id $appId --public-client-redirect-uris http://localhost`.
