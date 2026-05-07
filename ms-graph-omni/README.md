# ms-graph-omni

Full Microsoft Graph + Entra admin + Office file ops MCP for Claude Code / Cowork. Cert-based app-only auth via Azure Key Vault + delegated auth with persistent token cache — **no device code re-entry** after first login.

## Quick start

```pwsh
# 1. First-time provisioning (creates Entra app + cert + KV upload + admin consent)
cd C:\Dev\claude-hub\plugins\ms-graph-omni
pnpm install
pnpm provision    # drives az cli

# 2. Build
pnpm build

# 3. Install into Claude Code / Cowork
claude plugin install C:/Dev/claude-hub/plugins/ms-graph-omni
```

## What it covers (v0.1)

| Surface | Tools | Auth modes |
|---|---|---|
| Outlook (mail / calendar / contacts) | send, draft, search, reply, forward, move, flag; list/create/update/delete events; availability; contacts CRUD | delegated + app-only |
| Teams + Chat | list teams/channels/chats; send messages; manage membership | delegated + app-only |
| SharePoint + OneDrive + Files | sites list/search; drives; files CRUD; sharing links; permissions | both |
| Planner + ToDo + OneNote | plans/buckets/tasks/checklists/recurrence/rules; To Do lists; notebooks/sections/pages | delegated primarily |
| Entra admin | users, groups, app regs, CA policies, auth methods, licenses | app-only |
| Office file ops | Excel workbook (worksheets, ranges, tables, charts), Word, PowerPoint, Loop | both |
| Search + Sites | Microsoft Search across all content types | both |
| Exchange admin | accepted domains, mail-flow rules, shared mailbox inventory | app-only |
| OMI / Purview audit | Office Management Activity subscriptions, content listing, content fetch | app-only |
| Power Platform | environments, DLP policies, Power Apps, Power Automate flows, Dataverse table metadata | app-only |
| Intune | managed devices, mobile apps, compliance policies, configuration profiles | app-only |
| Defender / Security | Graph Security incidents, alerts, secure scores, Defender hunting | app-only |
| Power BI / Fabric | workspaces, reports, semantic models/datasets, Fabric items | app-only |
| Azure Ops | subscriptions, resource groups, resources | app-only |

## Architecture

```
src/
  server.ts              # MCP stdio server entry
  auth/
    index.ts             # getGraphClient({mode,scopes}) factory
    kv-cert-provider.ts  # Pulls PFX from KV via DefaultAzureCredential
    app-only-client.ts   # MSAL ConfidentialClientApplication
    delegated-client.ts  # MSAL PublicClientApplication w/ DPAPI cache
  graph/
    client-factory.ts    # @microsoft/microsoft-graph-client wrapper
  tools/
    index.ts             # tool registry
    me/                  # delegated-only tools (acts as you)
    org/                 # app-only tools (tenant scope)
    mail/                # Outlook mail
    calendar/
    teams/
    sharepoint/
    onedrive/
    planner/
    todo/
    onenote/
    entra/
    excel/
    word/
    powerpoint/
    loop/
    search/
```

## Sharing the plugin

A new operator clones this repo, runs `az login` against the right tenant, then requests `Key Vault Certificate User` RBAC on the vault from a tenant Global Admin. After that, the plugin works identically on the new machine — the cert never leaves the vault, the operator authenticates as themselves and the cert is fetched on demand.

## Client tenant installability

`ms-graph-omni` is Lobbi-internal first, but it is not hard-wired to the Lobbi tenant. Configure one tenant profile per client with `MSGO_TENANTS_JSON`; each profile carries its own Entra app, certificate source, environment, and enabled capability packs.

```json
[
  {
    "slug": "primary",
    "tenantId": "<tenant-guid>",
    "clientId": "<app-guid>",
    "vaultUrl": "https://<your-vault>.vault.azure.net/",
    "certName": "<cert-name>",
    "environment": "internal",
    "capabilityPacks": ["internal-full"]
  },
  {
    "slug": "client-acme",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "clientId": "11111111-1111-1111-1111-111111111111",
    "vaultUrl": "https://client-approved-kv.vault.azure.net/",
    "certName": "msgo-client-acme",
    "environment": "client",
    "capabilityPacks": ["baseline-read", "collaboration"],
    "consent": {
      "appRegistrationMode": "single-tenant",
      "grantedAt": "2026-05-06T00:00:00Z",
      "evidenceRef": "client-acme/admin-consent-record"
    }
  }
]
```

Client tenants default to `baseline-read` when no `capabilityPacks` are provided. Tools are blocked before Graph auth if their namespace is not enabled for the selected tenant. Add capability packs deliberately; do not copy `internal-full` into a client profile.

Capability manifests live in `config/capability-packs/`. Use the dry-run installer and validator before installing in a client tenant:

```pwsh
pwsh -File scripts/install-client-tenant.ps1 -Slug client-acme -TenantId <tenant-id> -ClientId <app-id> -VaultUrl https://client-kv.vault.azure.net/ -CertName msgo-client-acme -CapabilityPacks baseline-read,collaboration -ConsentEvidenceRef client-acme/admin-consent-record
pwsh -File scripts/validate-client-tenant.ps1 -TenantProfilePath .\client-acme-profile.json -DryRun
```

See `docs/client-installation.md` for the runbook.

Pack prerequisites can be inspected with:

```pwsh
pnpm verify -- --pack all --skip-delegated
```

## Extending

See `CLAUDE.md` > "Extending the plugin".

For new API surfaces (Power BI, Fabric, Power Apps) add:
- `src/auth/` scope (e.g. `https://api.powerbi.com/.default`)
- `src/tools/<surface>/` directory
- Permissions to app registration via `scripts/add-permissions.ps1`

## License

MIT
