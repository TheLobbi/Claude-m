# Programmatic APIs: TOM / XMLA, PowerShell, and the client JS API

Power BI exposes several programming surfaces. Pick by task:

| Task | API |
|------|-----|
| Read/write semantic model metadata (tables, measures, columns, RLS), refresh, clone | **TOM** over the **XMLA endpoint** (.NET) |
| Workspaces, datasets, reports, refreshes, imports, gateways, admin/governance | **Power BI REST API** (see `pbi-rest-api.md`) |
| Scripted admin / CI automation from a shell | **PowerShell** (`MicrosoftPowerBIMgmt`) |
| Embed reports/dashboards/tiles in a web app; events, filters, bookmarks | **Client JS/TS API** (`powerbi-client`) |

TOM and the REST API are complementary — TOM owns model *structure*; REST owns *service* operations (publish, credentials, refresh scheduling, sharing). Both accept the same Microsoft Entra access tokens (resource `https://analysis.windows.net/powerbi/api`), so a token acquired for one works for the other.

## TOM over the XMLA endpoint (.NET)

The Tabular Object Model is a .NET library (`Model`, `Table`, `Column`, `Measure`, …) that translates reads/writes into XMLA calls against the Analysis Services engine in the Power BI service. Requires a **dedicated capacity** (Premium/PPU/Fabric) with the **XMLA endpoint** set to **Read** (read) or **Read Write** (write, set by a capacity admin).

```bash
dotnet new console --name TomDemo
dotnet add package Microsoft.AnalysisServices.NetCore.retail.amd64
```

Connect with the workspace connection URL (Workspace ▸ Settings ▸ Premium):

```csharp
using Microsoft.AnalysisServices.Tabular;

string workspace = "powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace";

Server server = new Server();
// interactive: server.Connect($"DataSource={workspace};");
// service principal:
string conn = $"DataSource={workspace};User ID=app:{appId}@{tenantId};Password={appSecret};";
server.Connect(conn);

foreach (Database db in server.Databases)
    Console.WriteLine(db.Name);
```

Auth options: interactive sign-in, user ID/password (dev only), **service principal** (`app:{appId}@{tenantId}` + secret), or a pre-acquired Entra access token as the `Password`. For a user token, request delegated scopes `Content.Create`, `Dataset.ReadWrite.All`, `Workspace.ReadWrite.All`. A **service principal** must be added to the workspace as **Admin** or **Member** (it doesn't use delegated permissions), and the tenant setting "allow service principals to use Power BI APIs" must be on.

Read and modify a model (changes batch in memory until `SaveChanges`):

```csharp
Model model = server.Databases.GetByName("Sales").Model;

// add a measure
Table sales = model.Tables.Find("Sales");
sales.Measures.Add(new Measure {
    Name = "Sales Revenue",
    Expression = "SUM ( Sales[SalesAmount] )",
    FormatString = "$#,##0.00"
});

// sweeping update: format every DateTime column
foreach (Table t in model.Tables)
    foreach (Column c in t.Columns)
        if (c.DataType == DataType.DateTime) c.FormatString = "yyyy-MM-dd";

model.SaveChanges();

// refresh via XMLA (shows as "Via XMLA Endpoint" in refresh history)
model.RequestRefresh(RefreshType.DataOnly);
model.SaveChanges();
```

Also supports creating/cloning models (`Database`/`Model` + `Model.CopyTo`), relationships (`SingleColumnRelationship`), hierarchies, and partitions with M sources.

> TOM can **start** a refresh but cannot set **data source credentials** — set those in semantic model settings or via the REST API first, or the refresh fails.

Pair TOM with **TMDL** (`tmdl.md`): use `TmdlSerializer` to serialize a connected model to a Git folder and deserialize it back for deployment.

## PowerShell (`MicrosoftPowerBIMgmt`)

Cross-platform module for scripted admin and CI. Install and sign in:

```powershell
Install-Module -Name MicrosoftPowerBIMgmt -Scope CurrentUser
Connect-PowerBIServiceAccount          # interactive
# service principal:
$cred = Get-Credential                 # username = appId, password = secret
Connect-PowerBIServiceAccount -ServicePrincipal -Tenant $tenantId -Credential $cred
```

Common operations:

```powershell
Get-PowerBIWorkspace -Scope Organization -All
New-PowerBIWorkspace -Name "Sales - PROD"
Get-PowerBIReport -WorkspaceId $wsId
New-PowerBIReport -Path .\Sales.pbix -WorkspaceId $wsId -ConflictAction CreateOrOverwrite
# generic REST passthrough for endpoints without a dedicated cmdlet:
Invoke-PowerBIRestMethod -Url "groups/$wsId/datasets/$dsId/refreshes" -Method Post
```

Key modules: `MicrosoftPowerBIMgmt.Workspaces`, `.Reports`, `.Data` (datasets/refresh), `.Admin`, `.Profile`. `Invoke-PowerBIRestMethod` is the escape hatch for any REST endpoint lacking a cmdlet.

## Client JS/TS API (`powerbi-client`) — embedded analytics

Embed reports, dashboards, tiles, Q&A, and paginated reports in a web app and control them at runtime.

```ts
import * as pbi from "powerbi-client";

const embedConfig: pbi.IEmbedConfiguration = {
  type: "report",
  tokenType: pbi.models.TokenType.Embed,   // App-owns-data; or .Aad for User-owns-data
  accessToken,                             // from the REST GenerateToken call
  embedUrl,
  id: reportId,
  settings: { panes: { filters: { visible: false } }, navContentPaneEnabled: true },
};

const report = powerbi.embed(document.getElementById("reportContainer"), embedConfig) as pbi.Report;

report.on("loaded", () => report.getPages());
await report.setFilters([ /* models.IBasicFilter */ ]);
await report.bookmarksManager.apply("Bookmark1");
```

- **App-owns-data** (embed for your customers) uses a service principal/master user and an **embed token** from the REST `GenerateToken` API; **User-owns-data** (embed for your org) uses the signed-in user's AAD token.
- Capabilities: events (`loaded`, `rendered`, `dataSelected`), filters/slicers, bookmarks, page navigation, export, save, and mobile layouts. Test scenarios in the [Embedded Playground](https://playground.powerbi.com).
- See the existing `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-analytics/references/pbi-rest-api.md` for the REST calls (GenerateToken, datasets, refreshes) that back embedding.

## Choosing between them

- Bulk model edits, scripted measure/column changes, model generation → **TOM** (+ TMDL for source control).
- Tenant/workspace/report lifecycle, refresh scheduling, credentials, governance → **REST API** / **PowerShell**.
- In-app interactive reports → **client JS API**.
- CI/CD that deploys models and reports → combine: TOM/TMDL for the model, REST/PowerShell for publish + credentials + refresh. (See the `fabric-gitops-cicd` plugin for the Fabric-side automation.)
