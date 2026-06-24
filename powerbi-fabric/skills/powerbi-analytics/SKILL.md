---
name: Power BI & Fabric Analytics
description: >
  Deep expertise in Power BI development including DAX measures, Power Query M transformations,
  semantic model design, PBIP project scaffolding, REST API workspace management, and
  Microsoft Fabric integration with Lakehouse and Direct Lake.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - dax
  - DAX measure
  - power query
  - M code
  - power bi
  - pbip
  - pbix
  - semantic model
  - fabric
  - lakehouse
  - pbi workspace
  - dataset refresh
  - power query M
  - calculated column
  - measure
  - power bi rest api
  - fabric rest api
  - workspace management
  - dataset refresh
  - embed token
  - report export
  - direct lake
  - deployment pipeline
  - performance
  - veritpaq
  - direct lake fallback
  - dataflow gen2
  - dax udf
  - dax user-defined function
  - user defined function
  - calculation group
  - calculation item
  - selectedmeasure
  - tmdl
  - tabular model definition language
  - model as code
  - tom
  - tabular object model
  - xmla
  - xmla endpoint
  - powerbi powershell
  - microsoftpowerbimgmt
  - powerbi-client
  - embed token
  - daxlib
---

# Power BI & Fabric Analytics

Microsoft Power BI spans Desktop (authoring DAX measures, Power Query M transforms, and report design into .pbix/.pbip files), the Power BI Service (cloud publishing, workspaces, REST API management at `api.powerbi.com/v1.0/myorg/`), Power BI Embedded (embed tokens for custom apps), and Microsoft Fabric (OneLake Lakehouse storage, PySpark notebooks, data pipelines, Dataflow Gen2, and Direct Lake semantic models that read Delta tables without import refresh).

## DAX

- Use CALCULATE to modify filter context; prefer direct column filters over FILTER on large tables.
- Apply VAR/RETURN to eliminate repeated sub-expressions and improve readability.
- Use DIVIDE() instead of `/` for safe division; use KEEPFILTERS to preserve slicer context when needed.
- Implement time intelligence (TOTALYTD, SAMEPERIODLASTYEAR, DATEADD) against a contiguous marked date table.
- Prefer measures over calculated columns; use calculated columns only for slicers, sorts, or relationships.
- Consult `references/dax-patterns.md` for function signatures, KPI patterns, and best-practice rules.

## Power Query M

- Structure every query as `let/in` with named steps; set explicit column types as the final step.
- Maximize query folding by placing SelectRows, SelectColumns, and Sort before custom transforms.
- Use `Web.Contents` with `RelativePath`/`Query` for proper credential handling; use `List.Generate` for REST pagination.
- Apply `try/otherwise` for operations that may fail on individual rows.
- Consult `references/power-query-m.md` for source connectors, transform functions, folding rules, and parameters.

## Semantic Model

- Design star schemas with single-direction many-to-one relationships from dimensions to facts.
- Use bi-directional relationships sparingly; activate inactive relationships via USERELATIONSHIP().
- Implement dynamic RLS with USERPRINCIPALNAME() and test with "View as Role" before publishing.
- Choose the correct storage mode: Import for speed, DirectQuery for real-time, Direct Lake for Fabric.
- Organize measures into display folders and define drill-down hierarchies on dimension tables.

## DAX user-defined functions (UDFs)

- Package repeated DAX logic into reusable, typed functions (`FUNCTION Name = ( p : NUMERIC ) => ...`) callable from measures, calculated columns, visual calcs, and other UDFs.
- Author in DAX query view (`DEFINE FUNCTION`) or TMDL view (`function`); they serialize to `functions.tmdl` and require compatibility level 1702+ (GA from the June 2026 release).
- Add optional type hints (`type subtype mode`) and `///` descriptions; reuse community packages from daxlib.
- Consult `references/dax-udfs.md`.

## Calculation groups

- Collapse near-identical measure variants (time intelligence, currency, format) into calculation items that rewrite `SELECTEDMEASURE()`; require compatibility level 1500+ and **Discourage implicit measures** on.
- Use the calculation group column on slicers/axes; set `precedence` to compose multiple groups; add dynamic format strings per item.
- Guard arithmetic with `ISNUMERIC(SELECTEDMEASURE())` and remember measures become the variant type once any calculation group exists.
- Consult `references/calculation-groups.md`.

## Model as code (TMDL)

- TMDL is the text, Git-friendly representation of the model (one file per table/role/culture, plus root files for relationships, functions, expressions, model); it maps 1:1 to TOM and backs PBIP and Fabric Git integration.
- Edit measures, calculation items, columns, and UDFs directly in TMDL for bulk, reviewable changes; serialize/deserialize programmatically with `TmdlSerializer`.
- Consult `references/tmdl.md`.

## Fabric

- Follow the medallion pattern: Bronze (raw ingest) -> Silver (cleaned) -> Gold (star schema) -> Direct Lake semantic model.
- Use Lakehouse shortcuts to reference external ADLS/S3/GCS storage without copying data.
- Use Dataflow Gen2 to land Power Query transforms directly into Lakehouse Delta tables.
- Monitor Direct Lake fallback to DirectQuery when data exceeds memory or unsupported features are used.
- Consult `references/fabric-integration.md` for Lakehouse, notebook, pipeline, and Direct Lake details.

## REST API

- Authenticate with Azure AD tokens scoped to `https://analysis.windows.net/powerbi/api/.default` (PBI) or `https://api.fabric.microsoft.com/.default` (Fabric).
- Handle async operations (refresh, export) by polling the status endpoint until completion.
- Implement exponential backoff for 429 (throttled) responses; re-acquire tokens on 401.
- Use the admin APIs (`/admin/`) for tenant-wide operations; use deployment pipeline APIs for ALM promotion.
- Consult `references/pbi-rest-api.md` for all endpoint paths, request bodies, and error codes.

## Embedded

- Choose "App Owns Data" (service principal) for customer-facing embeds or "User Owns Data" (delegated) for internal portals.
- Generate embed tokens with RLS identities when the dataset enforces row-level security.
- Use the multi-resource `/GenerateToken` endpoint to embed multiple reports/datasets in one token.
- Register the service principal in Azure AD and enable it in the Power BI Admin Portal tenant settings.

## Programmatic model automation (TOM / XMLA / PowerShell / client JS)

- Use the **Tabular Object Model (TOM)** over the **XMLA endpoint** to read/write model metadata (tables, measures, columns, RLS), create/clone models, and trigger refreshes from .NET — requires a dedicated capacity with XMLA Read or Read Write.
- TOM and the REST API share the same Entra tokens (resource `https://analysis.windows.net/powerbi/api`); TOM owns model structure, REST owns service operations (publish, credentials, refresh schedule). TOM can start a refresh but can't set data source credentials — set those via REST first.
- Script admin/CI with the **`MicrosoftPowerBIMgmt`** PowerShell module (`Invoke-PowerBIRestMethod` is the REST escape hatch); embed and control reports at runtime with the **`powerbi-client`** JS/TS API.
- Consult `references/programmatic-apis.md`.

## Output Formats

- Prefix every DAX measure with a header comment block: Measure Name, Description, Dependencies.
- Generate Power Query M with explicit `Table.TransformColumnTypes` as the final step.
- Scaffold PBIP projects with correct folder structure (.pbip, .Dataset/definition/, .Report/definition/) and TMDL files.
- Consult `references/pbip-format.md` for TMDL syntax, model.bim schema, and Git workflow conventions.

## OneLake Desktop Sync — Local Data Profiling

If OneLake desktop sync is installed, Power BI report developers can profile lakehouse source tables locally before building visuals.

**Profile source data locally**:
```python
import polars as pl

path = r"C:\Users\<user>\OneLake - <tenant>\<workspace>\<lakehouse>.Lakehouse\Tables\fact_sales"
df = pl.read_delta(path)
print(f"Rows: {len(df)}")
print(df.describe())          # Summary statistics for measure columns
print(df.n_unique("region"))  # Cardinality check for slicer columns
```

**Use case**: Understand data volumes, cardinality, and distributions before designing DAX measures and Power BI visuals. Local profiling avoids consuming Fabric CU capacity for exploratory queries.

Triggers: `onelake powerbi local`, `local data profiling powerbi`

## Reference Files

| Reference | Path | Content |
|-----------|------|---------|
| DAX Patterns | `references/dax-patterns.md` | Core functions, time intelligence, KPI patterns, best practices |
| DAX UDFs | `references/dax-udfs.md` | User-defined functions — syntax, type hints, DQV/TMDL authoring, daxlib |
| Calculation Groups | `references/calculation-groups.md` | Calculation items, SELECTEDMEASURE, precedence, dynamic format strings |
| TMDL | `references/tmdl.md` | Model-as-code: folder structure, grammar, TmdlSerializer, tooling |
| Programmatic APIs | `references/programmatic-apis.md` | TOM/XMLA (.NET), PowerShell (MicrosoftPowerBIMgmt), client JS embedding |
| Power Query M | `references/power-query-m.md` | M language syntax, source connections, transforms, folding |
| PBI REST API | `references/pbi-rest-api.md` | Workspace, dataset, report, import, admin, embed, and deployment pipeline endpoints |
| PBIP Format | `references/pbip-format.md` | Project structure, TMDL, model.bim, Git workflow |
| Fabric Integration | `references/fabric-integration.md` | Lakehouse, notebooks, Direct Lake, Dataflow Gen2, pipelines |
| Performance Optimization | `references/performance-optimization.md` | VertiPaq, SE/FE, aggregations, composite models, Direct Lake framing |
| Troubleshooting | `references/troubleshooting.md` | DAX errors, refresh failures, Direct Lake issues, M errors, REST API errors |

## Example Files

| Example | Path | Content |
|---------|------|---------|
| DAX Measures | `examples/dax-measures.md` | YTD, YoY, rolling average, percent of total, ABC, Top N, variance |
| Power Query Transforms | `examples/power-query-transformations.md` | Dataverse, SQL, REST API pagination, SharePoint, date dimension |
| Workspace Management | `examples/workspace-management.md` | TypeScript REST API operations |
| PBIP Scaffolding | `examples/pbip-scaffolding.md` | Complete PBIP project generation examples |
| Dataflow Gen2 | `examples/dataflow-gen2.md` | SQL source with folding, REST pagination, incremental refresh M code |
