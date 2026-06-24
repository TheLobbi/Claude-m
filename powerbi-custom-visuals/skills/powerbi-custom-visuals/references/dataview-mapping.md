# DataView mapping and parsing

Each valid `dataViewMappings` entry produces a `DataView`, delivered to `update(options)` as `options.dataViews[0]`. Power BI populates **only** the mapping types you declared (the others are `null`). The four mapping types are `single`, `categorical`, `table`, and `matrix`.

Always guard before reading — a report author may not have filled every field well:

```typescript
public update(options: VisualUpdateOptions): void {
    const dataView = options.dataViews && options.dataViews[0];
    if (!dataView) return;
    // then narrow to the mapping you declared
}
```

## single

The simplest mapping: one measure reduced to a single value (sum for numeric, distinct count otherwise). Use for KPI cards. Cannot be combined with other mappings.

```json
"dataViewMappings": [
  { "conditions": [ { "Y": { "max": 1 } } ], "single": { "role": "Y" } }
]
```

```typescript
import DataViewSingle = powerbi.DataViewSingle;

const single: DataViewSingle = dataView.single;
if (!single || single.value == null) return;
this.valueText.textContent = single.value.toString();
```

## categorical

The workhorse for charts: independent groupings (`categories`) and numeric `values`, optionally grouped into a series.

```json
"categorical": {
  "categories": { "for": { "in": "category" } },
  "values": { "select": [ { "bind": { "to": "measure" } } ] }
}
```

- **`for: { in: role }`** — include *all* fields dropped in that role.
- **`bind: { to: role }`** — include a *single* field (pair with a `max: 1` condition).

### Reading a basic categorical view

```typescript
import DataViewCategorical = powerbi.DataViewCategorical;
import PrimitiveValue = powerbi.PrimitiveValue;

const cat: DataViewCategorical = dataView.categorical;
if (!cat || !cat.categories || !cat.categories[0] || !cat.values) return;

const categoryColumn = cat.categories[0];
const categoryValues: PrimitiveValue[] = categoryColumn.values;
const measureColumn = cat.values[0];

const points = categoryValues.map((c, i) => ({
    category: c == null ? "" : c.toString(),
    value: <number>(measureColumn.values[i] ?? 0),
    // a stable selection id per category (see interactivity.md)
    selectionId: this.host.createSelectionIdBuilder().withCategory(categoryColumn, i).createSelectionId(),
    // cross-highlight portion, when supportsHighlight is on
    highlight: measureColumn.highlights ? measureColumn.highlights[i] : undefined,
}));
```

### Grouped / series categorical

Group `values` `by` a second grouping role to build a series (e.g. years across countries):

```json
"categorical": {
  "categories": { "for": { "in": "category" } },
  "values": {
    "group": {
      "by": "series",
      "select": [ { "for": { "in": "measure" } } ]
    }
  }
}
```

```typescript
import DataViewValueColumnGroup = powerbi.DataViewValueColumnGroup;

const groups: DataViewValueColumnGroup[] = dataView.categorical.values.grouped();
groups.forEach((group) => {
    // group.name is the series value; group.values[m].values[i] is the cell
    const seriesId = this.host.createSelectionIdBuilder()
        .withSeries(dataView.categorical.values, group)
        .createSelectionId();
});
```

## table

A flat list of rows. **Do not assume any row ordering** — sort yourself if order matters.

```json
"table": {
  "rows": { "select": [ { "for": { "in": "column" } }, { "for": { "in": "value" } } ] }
}
```

```typescript
import DataViewTable = powerbi.DataViewTable;
import DataViewTableRow = powerbi.DataViewTableRow;

const table: DataViewTable = dataView.table;
if (!table) return;
const headers = table.columns.map(c => c.displayName);
table.rows.forEach((row: DataViewTableRow, rowIndex) => {
    const selectionId = this.host.createSelectionIdBuilder().withTable(table, rowIndex).createSelectionId();
    // row is an array aligned with table.columns
});
```

## matrix

Hierarchical rows and columns — a tree of `DataViewMatrixNode`. Any role value can become a column header.

```json
"matrix": {
  "rows":    { "for": { "in": "Category" } },
  "columns": { "for": { "in": "Column" } },
  "values":  { "select": [ { "for": { "in": "Measure" } } ] }
}
```

```typescript
import DataViewMatrixNode = powerbi.DataViewMatrixNode;
import DataViewHierarchyLevel = powerbi.DataViewHierarchyLevel;

const matrix = dataView.matrix;
const rowLevels: DataViewHierarchyLevel[] = matrix.rows.levels;

const walk = (node: DataViewMatrixNode, parents: DataViewMatrixNode[]) => {
    const chain = [...parents, node];
    let builder = this.host.createSelectionIdBuilder();
    chain.forEach(n => { builder = builder.withMatrixNode(n, rowLevels); });
    const id = builder.createSelectionId();
    // node.value is the label; node.values holds measure cells at leaf level
    node.children?.forEach(child => walk(child, chain));
};
walk(matrix.rows.root, []);
```

### Expand / collapse row headers (API 4.1+, expand entire level 4.2+)

```json
"expandCollapse": { "roles": ["Rows"], "addDataViewFlags": { "defaultValue": true } },
"drilldown": { "roles": ["Rows"] }
```

`DataViewTreeNode.isCollapsed` reflects state; toggle with `selectionManager.toggleExpandCollapse(nodeSelectionId, entireLevel?)`. When a visual supports `drilldown` or `expandCollapse`, the `dataRole` argument to `showContextMenu` becomes **required**.

## conditions (data-role cardinality)

```json
"conditions": [ { "category": { "min": 1, "max": 1 }, "measure": { "min": 0, "max": 2 } } ]
```

A mapping is valid when any condition is satisfied. Only one role may have `min ≥ 1` per condition. Omitted roles accept any count.

## Data reduction algorithm

Controls how much data reaches the view. Default: `top` with `count: 1000`. Max `count` is **30000** (R visuals up to 150000). Apply to categories, the grouped `values`, table `rows`, or matrix `rows`/`columns`.

```json
"categorical": {
  "categories": {
    "for": { "in": "category" },
    "dataReductionAlgorithm": { "window": { "count": 300 } }
  }
}
```

| Algorithm | Behavior |
|-----------|----------|
| `top` | First *count* values (default) |
| `bottom` | Last *count* values |
| `sample` | First, last, and evenly spaced items |
| `window` | One *count*-sized window at a time (use with `fetchMoreData`) |

For datasets larger than the limit, page with `host.fetchMoreData()` and accumulate across `update` calls where `options.operationKind === VisualDataChangeOperationKind.Append` (see `visual-api.md`).
