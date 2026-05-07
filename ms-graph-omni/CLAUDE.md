# ms-graph-omni — plugin memory

Full Microsoft Graph + Entra + Office file ops MCP for Claude Code / Cowork. Cert-based app-only auth via Azure Key Vault + delegated with persistent MSAL token cache. No device-code re-entry.

## Identity

Configure per-machine via env vars or `config/runtime.json` (gitignored — use `runtime.json.example` as template):

- `MSGO_TENANT_ID` — Azure AD tenant ID (GUID)
- `MSGO_CLIENT_ID` — Entra app registration client ID
- `MSGO_KEY_VAULT_URL` — `https://<your-vault>.vault.azure.net/`
- `MSGO_CERT_NAME` — name of the cert in Key Vault

## Auth flows

- **App-only** (tenant-wide automation): `DefaultAzureCredential` → Key Vault cert → `ConfidentialClientApplication.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] })`
- **Delegated** (acts as you): `PublicClientApplication` with `msal-node-extensions` PersistenceCachePlugin (Windows DPAPI at `$env:USERPROFILE\.msgo-cache\msal.json`). First run: interactive browser. After: silent refresh forever.

## Extending the plugin

1. Add a new tool file under `src/tools/<area>/<operation>.ts`
2. Export a `toolDef` object (`name`, `description`, `inputSchema`, `handler`)
3. Register it in `src/tools/index.ts`
4. Run `pnpm build && pnpm verify`

New API surface (Power BI, Fabric, Power Apps) = new `src/tools/<surface>/` dir + new token scope in auth factory.

## Sharing the plugin

The plugin and the cert live in different places. The plugin is in this repo. The cert lives in your Key Vault. Anyone you grant `Key Vault Certificate User` RBAC on the vault to can pull the cert via their own `az login` — the plugin works identically on their machine after that.

## Rules

- All tool inputs validated with Zod — no `any` in handler signatures
- All Graph calls go through `getGraphClient({ mode: 'app' | 'delegated', scopes? })` factory
- Errors logged via `pino` at `info` level by default, `debug` for full request/response
- No secrets in source — everything comes from Key Vault or env
- TDD for new tools: test file first under `tests/`, then impl
