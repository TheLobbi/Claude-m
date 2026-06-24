---
name: pbi-tom
description: Generate C#/.NET Tabular Object Model (TOM) automation over the XMLA endpoint — connect, read/modify model metadata, sweep changes, trigger refresh, or serialize to TMDL.
argument-hint: "<task, e.g. 'add a measure', 'format all DateTime columns', 'refresh model', 'export to TMDL'> [--auth interactive|sp|token]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# TOM / XMLA Automation

Generate .NET code that programs a Power BI semantic model through the Tabular Object Model over the XMLA endpoint.

## Instructions

1. Parse the task and read `skills/powerbi-analytics/references/programmatic-apis.md` (TOM connection, auth, modify, refresh) and `references/tmdl.md` (for serialize/deserialize tasks).
2. Confirm prerequisites: a dedicated capacity (Premium/PPU/Fabric) with the XMLA endpoint set to **Read** (read) or **Read Write** (write), and the workspace connection URL (`powerbi://api.powerbi.com/v1.0/myorg/<workspace>`).
3. Choose auth (`--auth`): `interactive`, `sp` (service principal `app:{appId}@{tenantId}` + secret; SP must be workspace Admin/Member), or `token` (pre-acquired Entra token as the password).
4. Generate a console-app snippet: add `Microsoft.AnalysisServices.NetCore.retail.amd64`, connect, perform the task, and `SaveChanges()`.
5. For modify tasks, batch changes then call `Model.SaveChanges()`; for refresh, `RequestRefresh` + `SaveChanges`, and warn that credentials must be set via REST/settings first.
6. For source-control tasks, use `TmdlSerializer.SerializeDatabaseToFolder` / `DeserializeDatabaseFromFolder`.

## Output Format (C#)

```csharp
using Microsoft.AnalysisServices.Tabular;

string workspace = "powerbi://api.powerbi.com/v1.0/myorg/<workspace>";
var server = new Server();
server.Connect($"DataSource={workspace};User ID=app:{appId}@{tenantId};Password={appSecret};");

Model model = server.Databases.GetByName("<model>").Model;
// ...task: add/modify/refresh/serialize...
model.SaveChanges();
```

## Common Tasks

- **Add a measure** — `table.Measures.Add(new Measure { Name, Expression, FormatString })`.
- **Sweep update** — loop tables/columns, set `FormatString`/`IsHidden`, then `SaveChanges()`.
- **Refresh** — `model.RequestRefresh(RefreshType.DataOnly); model.SaveChanges();` (set credentials first).
- **Clone** — `CreateDatabase` + `source.Model.CopyTo(target.Model)`.
- **Export to TMDL** — `TmdlSerializer.SerializeDatabaseToFolder(db, path)`.

## Guidelines

- TOM and the REST API share the same Entra tokens (resource `https://analysis.windows.net/powerbi/api`); use REST/PowerShell for publish, credentials, and refresh scheduling.
- Never hardcode secrets in committed code — read from environment/Key Vault.
- For write operations, confirm a capacity admin has set XMLA to **Read Write**.
