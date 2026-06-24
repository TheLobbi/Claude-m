# Example: complete `capabilities.json` files

## Categorical bar chart (pairs with `visual-ts-barchart.md`)

One category, one measure, with selection, highlight, sorting, tooltips, and two Format-pane objects.

```json
{
  "privileges": [],
  "dataRoles": [
    {
      "displayName": "Category",
      "displayNameKey": "Visual_Category",
      "name": "category",
      "kind": "Grouping"
    },
    {
      "displayName": "Measure",
      "displayNameKey": "Visual_Measure",
      "name": "measure",
      "kind": "Measure",
      "requiredTypes": [ { "numeric": true }, { "integer": true } ]
    },
    {
      "displayName": "Tooltips",
      "name": "tooltips",
      "kind": "Measure"
    }
  ],
  "dataViewMappings": [
    {
      "conditions": [ { "category": { "max": 1 }, "measure": { "max": 1 } } ],
      "categorical": {
        "categories": {
          "for": { "in": "category" },
          "dataReductionAlgorithm": { "top": { "count": 1000 } }
        },
        "values": {
          "select": [ { "bind": { "to": "measure" } } ]
        }
      }
    }
  ],
  "objects": {
    "dataColors": {
      "properties": {
        "defaultColor": { "type": { "fill": { "solid": { "color": true } } } }
      }
    },
    "dataLabels": {
      "properties": {
        "show": { "type": { "bool": true } },
        "fontSize": { "type": { "formatting": { "fontSize": true } } },
        "color": { "type": { "fill": { "solid": { "color": true } } } }
      }
    }
  },
  "supportsHighlight": true,
  "sorting": { "default": {} },
  "tooltips": {
    "supportedTypes": { "default": true, "canvas": true },
    "roles": [ "tooltips" ]
  },
  "supportsLandingPage": true,
  "supportsEmptyDataView": true,
  "supportsKeyboardFocus": true
}
```

## Per-data-point colors (conditional formatting)

Replace `dataColors` above with a `fill` object whose property is rule-capable, and emit one `ColorPicker` per data point in `settings.ts` (see `formatting-settings.md`):

```json
"objects": {
  "dataPoint": {
    "properties": {
      "fill": { "type": { "fill": { "solid": { "color": true } } } }
    }
  }
}
```

## Table visual

```json
{
  "privileges": [],
  "dataRoles": [
    { "displayName": "Columns", "name": "columns", "kind": "GroupingOrMeasure" }
  ],
  "dataViewMappings": [
    {
      "table": {
        "rows": {
          "for": { "in": "columns" },
          "dataReductionAlgorithm": { "top": { "count": 2000 } }
        }
      }
    }
  ],
  "objects": {
    "grid": {
      "properties": {
        "showGridlines": { "type": { "bool": true } },
        "rowHeight": { "type": { "numeric": true } }
      }
    }
  },
  "sorting": { "default": {} }
}
```

## Matrix visual with expand/collapse + drilldown

```json
{
  "privileges": [],
  "dataRoles": [
    { "displayName": "Rows", "name": "rows", "kind": "Grouping" },
    { "displayName": "Columns", "name": "columns", "kind": "Grouping" },
    { "displayName": "Values", "name": "values", "kind": "Measure" }
  ],
  "dataViewMappings": [
    {
      "matrix": {
        "rows": {
          "for": { "in": "rows" },
          "dataReductionAlgorithm": { "window": { "count": 500 } }
        },
        "columns": { "for": { "in": "columns" } },
        "values": { "select": [ { "for": { "in": "values" } } ] }
      }
    }
  ],
  "drilldown": { "roles": [ "rows" ] },
  "expandCollapse": {
    "roles": [ "rows" ],
    "addDataViewFlags": { "defaultValue": true }
  },
  "objects": {
    "general": {
      "properties": {
        "formatString": { "type": { "formatting": { "formatString": true } } }
      }
    }
  }
}
```

## Privileges examples

```json
"privileges": [ { "name": "WebAccess", "essential": true, "parameters": [ "https://*.tile.openstreetmap.org" ] } ]
```
```json
"privileges": [ { "name": "ExportContent", "essential": false } ]
```
```json
"privileges": [ { "name": "LocalStorage", "essential": true } ]
```
> For a **certified** visual, keep `privileges` free of `WebAccess` — `"privileges": []`.

## Rules to keep it valid

- `privileges` is required (use `[]` when none).
- Every `objects` object/property name must match a card/slice `name` in `settings.ts`.
- In any single `conditions` entry, at most one role may have `min ≥ 1`.
- Declare a mapping type only if `visual.ts` reads it; the others arrive as `null`.
