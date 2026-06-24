# TMDL — Tabular Model Definition Language

TMDL is the text, source-control-friendly representation of a tabular model (semantic model) at **compatibility level 1200+**. It is the format Power BI Projects (PBIP) and Fabric Git integration use for semantic models, and it maps 1:1 to the Tabular Object Model (TOM) — every TMDL object exposes the same properties as its TOM class.

## Why TMDL

- **Human-readable** — YAML-like grammar with indentation for parent/child structure; minimal delimiters.
- **Source-control friendly** — one file per object (each table, role, culture, perspective) plus root files, so diffs are small and reviewable.
- **Great for embedded expressions** — DAX and M expressions are read verbatim.
- **Full TOM fidelity** — anything you can do in TOM you can represent in TMDL.

## Folder structure

```
definition/                    (PBIP) or the model folder (Fabric Git)
├── tables/
│   ├── Sales.tmdl             # columns, measures, partitions, hierarchies live in the table file
│   ├── Product.tmdl
│   └── Date.tmdl
├── roles/         <one file per role>
├── cultures/      <one file per culture>
├── perspectives/  <one file per perspective>
├── relationships.tmdl         # all relationships
├── functions.tmdl             # all DAX UDFs
├── expressions.tmdl           # all shared M expressions / parameters
├── dataSources.tmdl
├── model.tmdl
└── database.tmdl
```

All inner table metadata (columns, hierarchies, partitions, measures) lives inside the parent table's `.tmdl` file.

## Language essentials

Declare an object as `<tomType> <name>`; nest children by indentation (default one **tab** per level, three levels max: declaration ▸ properties ▸ multi-line expression).

```tmdl
table Sales
    lineageTag: e9374b9a-faee-4f9e-b2e7-d9aafb9d6a91

    measure 'Sales Amount' = SUMX ( Sales, Sales[Quantity] * Sales[Net Price] )
        formatString: $ #,##0

    measure 'Sales Amount YTD' =
            VAR result = TOTALYTD ( [Sales Amount], 'Date'[Date] )
            RETURN result
        formatString: $ #,##0

    column 'Net Price'
        dataType: int64
        isHidden
        sourceColumn: "Net Price"
        summarizeBy: none

    partition Sales-Part1 = m
        mode: import
        source =
            let
                Source = Sql.Database ( Server, Database )
            in
                Source

relationship cdb6e6a9-...-484a1bc7e123
    fromColumn: Sales.'Product Key'
    toColumn: Product.'Product Key'
```

Key rules:

- **Names** with `.`, `=`, `:`, `'`, or whitespace must be single-quoted; escape an embedded `'` by doubling it.
- **Properties** use `:` (e.g. `dataType: int64`); **default properties / expressions** use `=` (e.g. measure/partition body).
- **Boolean shortcut** — `isHidden` alone means `true`.
- **Descriptions** — triple-slash `///` above the object (first-class, used by Model Explorer).
- **Multi-line expressions** indent one level deeper than the property; wrap in triple backticks ```` ``` ```` only when you must preserve exact indentation/blank lines.
- **`ref` keyword** — used in parent files (e.g. `model.tmdl`) to pin deterministic collection ordering and avoid noisy diffs.
- **Partial declaration** — like C# partial classes, an object can be split across files (e.g. all measures in a `measures.tmdl`), but the same property can't be declared twice.

## Programmatic serialization (TMDL API)

`TmdlSerializer` (namespace `Microsoft.AnalysisServices.Tabular`, from the AMO/TOM NuGet) round-trips between a TOM `Database` and TMDL:

```csharp
using Microsoft.AnalysisServices.Tabular;

// Model (XMLA/PBIP) -> TMDL folder
Server server = new Server();
server.Connect("powerbi://api.powerbi.com/v1.0/myorg/MyWorkspace");
Database db = server.Databases.GetByName("Sales");
TmdlSerializer.SerializeDatabaseToFolder(db, @"C:\repo\Sales\definition");

// TMDL folder -> TOM Database (then deploy via XMLA)
Database fromTmdl = TmdlSerializer.DeserializeDatabaseFromFolder(@"C:\repo\Sales\definition");

// Object <-> string
string tmdl = TmdlSerializer.SerializeObject(measure);
```

For streaming/partial load, use `MetadataSerializationContext`. See `programmatic-apis.md` for the TOM/XMLA connection details this builds on.

## Tooling

- **Power BI Desktop TMDL view** — author tables, measures, calculation groups, and UDFs as TMDL and **Apply** to the model.
- **Tabular Editor** (2/3) — full TMDL editing, Best Practice Analyzer, and Fabric Git compatibility.
- **Fabric Git integration** — semantic models are stored as TMDL (reports as PBIR JSON); the model folder also carries `.platform` and `definition.pbism`. This is the on-disk contract for the GitOps flows in the `fabric-gitops-cicd` plugin.

## Practical guidance

- Treat TMDL as the model's source of truth in Git; review measure/column changes like code.
- Use `ref` ordering in parent files to keep diffs minimal across `SaveChanges`/serialize round-trips.
- Edit DAX measures, calculation items (`calculation-groups.md`), and UDFs (`dax-udfs.md`) directly in TMDL for bulk, reviewable changes.
