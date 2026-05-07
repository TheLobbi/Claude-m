# Client Tenant Installation

`ms-graph-omni` is one broker suite with per-tenant capability packs. The Lobbi tenant can use `internal-full`; client tenants must use explicit packs such as `baseline-read`, `collaboration`, `audit-compliance`, `power-platform`, `endpoint-read`, `security-read`, `analytics-read`, `exchange-admin`, and `azure-ops`.

## Dry-Run First

Run the installer in dry-run mode before any client tenant change window:

```pwsh
pwsh -File scripts/install-client-tenant.ps1 `
  -Slug client-acme `
  -TenantId 00000000-0000-0000-0000-000000000000 `
  -ClientId 11111111-1111-1111-1111-111111111111 `
  -VaultUrl https://client-approved-kv.vault.azure.net/ `
  -CertName msgo-client-acme `
  -CapabilityPacks baseline-read,collaboration,audit-compliance `
  -ConsentEvidenceRef client-acme/admin-consent-record `
  -GrantedBy admin@example.com
```

The output is JSON and intentionally contains no secrets, tokens, private keys, or certificate values. Use it to review the tenant profile, Microsoft Graph permission requirements, token audiences, and service-specific prerequisites before touching the tenant.

Client tenant profiles use a memory-only app-only token cache. Internal profiles can continue using the existing persistent app-only cache, but client installs must not write app-only access tokens to the local profile cache.

## Apply Without Admin Consent

Live apply mode is explicit and tenant-guarded. The active Azure CLI tenant must already match `-TenantId`, and `-TenantProfileOutputPath` is required so operators choose the approved non-secret artifact channel.

```pwsh
az login --tenant 00000000-0000-0000-0000-000000000000

pwsh -File scripts/install-client-tenant.ps1 `
  -Apply `
  -Slug client-acme `
  -TenantId 00000000-0000-0000-0000-000000000000 `
  -VaultUrl https://client-approved-kv.vault.azure.net/ `
  -CertName msgo-client-acme `
  -CapabilityPacks baseline-read,collaboration,audit-compliance `
  -ConsentEvidenceRef client-acme/admin-consent-record `
  -GrantedBy admin@example.com `
  -TenantProfileOutputPath .\runtime\tenants\client-acme.json
```

When `-ClientId` is omitted, the installer creates a single-tenant app registration. When `-ClientId` is provided, it updates that app registration instead. In both cases it applies Microsoft Graph permission requirements from the capability manifests, ensures the service principal exists, creates the Key Vault certificate if missing, uploads only the public certificate to the app registration, grants the app service principal Key Vault Certificate User and Key Vault Secrets User, and writes a non-secret tenant profile.

Without `-GrantAdminConsent`, the script prints the exact manual consent command:

```pwsh
az ad app permission admin-consent --id <client-app-id>
```

## Apply With Admin Consent

Use `-GrantAdminConsent` only when the change window includes an authorized tenant admin and the consent evidence reference is already captured.

```pwsh
pwsh -File scripts/install-client-tenant.ps1 `
  -Apply `
  -GrantAdminConsent `
  -Slug client-acme `
  -TenantId 00000000-0000-0000-0000-000000000000 `
  -VaultUrl https://client-approved-kv.vault.azure.net/ `
  -CertName msgo-client-acme `
  -CapabilityPacks baseline-read,collaboration,audit-compliance `
  -ConsentEvidenceRef client-acme/admin-consent-record `
  -GrantedBy admin@example.com `
  -TenantProfileOutputPath .\runtime\tenants\client-acme.json
```

Service-specific prerequisites that are not Microsoft Graph app roles remain prerequisites unless a capability manifest later provides exact automatable resource IDs. That includes Exchange role assignments, Power Platform service-principal registration, Power BI/Fabric admin settings, and Azure RBAC beyond the Key Vault grants above.

## Validate a Profile

After producing or editing a profile, validate it locally:

```pwsh
pwsh -File scripts/validate-client-tenant.ps1 `
  -TenantProfilePath .\client-acme-profile.json `
  -DryRun
```

The validator checks required profile fields, rejects `internal-full`, requires `consent.evidenceRef` for packs beyond `baseline-read`, and reports resources/prerequisites from `config/capability-packs/*.json`.

For live checks, omit `-DryRun` after logging into the client tenant:

```pwsh
az login --tenant 00000000-0000-0000-0000-000000000000

pwsh -File scripts/validate-client-tenant.ps1 `
  -TenantProfilePath .\runtime\tenants\client-acme.json
```

Live validation checks the active Azure CLI tenant, app registration, service principal, Key Vault certificate, and Microsoft Graph permission names resolvable from the Graph service principal.

## Rollback Notes

The tenant profile contains only non-secret metadata and can be removed from the runtime channel without deleting tenant resources. To roll back tenant-side apply work, remove or disable the client app registration, remove the app service principal's Key Vault role assignments, and delete the Key Vault certificate only after confirming no approved runtime still depends on it. Record the rollback in the same consent/change evidence trail used for installation.

## Consent Evidence

Every client install must retain non-secret evidence:

- `consent.appRegistrationMode`: `single-tenant` by default.
- `consent.grantedAt`: UTC timestamp.
- `consent.grantedBy`: admin identity or approved change owner.
- `consent.evidenceRef`: link or durable reference to the client's consent/change record.

Do not store client secrets, access tokens, refresh tokens, private keys, exported PFX values, or raw customer credentials in the profile or repo.

## Capability Packs

Capability packs map tool namespaces to token audiences, permissions, tools, and tenant prerequisites. The manifests in `config/capability-packs/` are the source of truth for installer output, tenant validation, runtime namespace gates, and verifier pack checks.
