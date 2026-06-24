# capabilities.json

`capabilities.json` is the contract between the visual and the host. It declares what data the visual accepts, what shows up in the Format pane, and which platform features the visual supports.

Root shape:

```json
{
  "privileges": [],
  "dataRoles": [ ... ],
  "dataViewMappings": [ ... ],
  "objects": { ... },
  "supportsHighlight": true,
  "sorting": { ... },
  "drilldown": { ... },
  "tooltips": { ... }
}
```

> From **API v4.6.0**, every root property is **optional except `privileges`, which is required**. A visual that needs no special access must still declare `"privileges": []`.

## privileges (required)

Special operations the visual needs the host to permit. The tenant admin must also enable the corresponding org setting.

```json
"privileges": [
  { "name": "WebAccess", "essential": true, "parameters": [ "https://*.example.com" ] },
  { "name": "ExportContent", "essential": false },
  { "name": "LocalStorage", "essential": true }
]
```

- **`WebAccess`** — allows HTTP/S calls to the listed URLs (subdomain wildcards allowed). **Must be empty or omitted for a certified visual** — certified visuals may not reach external services.
- **`ExportContent`** — lets the visual export data to `.txt/.csv/.json/.xlsx/.pdf/.xml/.tmplt` files.
- **`LocalStorage`** — lets the visual persist data in the browser's local storage.
- **No privileges:** `"privileges": []`.

## dataRoles

The field wells users drag data into.

```json
"dataRoles": [
  { "displayName": "Category", "name": "category", "kind": "Grouping",
    "requiredTypes": [ { "text": true }, { "numeric": true }, { "integer": true } ],
    "preferredTypes": [ { "text": true } ] },
  { "displayName": "Measure", "name": "measure", "kind": "Measure",
    "requiredTypes": [ { "numeric": true }, { "integer": true } ] }
]
```

| Field | Meaning |
|-------|---------|
| `name` | Internal id (unique); referenced from `dataViewMappings` and selection builders |
| `displayName` | Label in the field-wells pane (`displayNameKey` for a localized key) |
| `kind` | `Grouping` (discrete buckets), `Measure` (numeric), or `GroupingOrMeasure` |
| `requiredTypes` | Data types accepted; non-matching values become `null` |
| `preferredTypes` | Preferred types (drives the auto-assignment when a field is dropped) |

Valid type tokens: `bool`, `integer`, `numeric`, `text`, `geography`.

## dataViewMappings

Maps roles into a `DataView`. Most visuals declare one mapping; you may declare several and Power BI picks the first whose `conditions` are met. See `dataview-mapping.md` for the full mechanics.

```json
"dataViewMappings": [
  {
    "conditions": [ { "category": { "max": 1 }, "measure": { "max": 2 } } ],
    "categorical": {
      "categories": { "for": { "in": "category" } },
      "values": { "select": [ { "bind": { "to": "measure" } } ] }
    }
  }
]
```

### conditions

Bound how many fields each role accepts (`min`/`max`). A mapping is valid if **any** condition matches. **Only one role may have `min ≥ 1` per condition.** Omitting a role means "any number of fields".

```json
"conditions": [
  { "category": { "min": 1, "max": 1 }, "measure": { "min": 0, "max": 2 } },
  { "category": { "min": 2, "max": 2 }, "measure": { "min": 0, "max": 1 } }
]
```

## objects (Format pane properties)

Each object becomes a Format-pane card; each property becomes a slice. **Object/property names must exactly match the card/slice names in your formatting model** (`settings.ts`) or you get a runtime error.

```json
"objects": {
  "dataColors": {
    "properties": {
      "defaultColor": { "type": { "fill": { "solid": { "color": true } } } }
    }
  },
  "dataLabels": {
    "properties": {
      "show": { "type": { "bool": true } },
      "fontSize": { "type": { "formatting": { "fontSize": true } } }
    }
  }
}
```

Common property `type` values: `{ "bool": true }`, `{ "numeric": true }`, `{ "integer": true }`, `{ "text": true }`, `{ "fill": { "solid": { "color": true } } }`, `{ "fillRule": {} }` (gradient), `{ "formatting": { "fontSize": true } }`, `{ "formatting": { "fontFamily": true } }`, `{ "formatting": { "alignment": true } }`, `{ "formatting": { "labelDisplayUnits": true } }`, and `{ "enumeration": [ { "value": "a", "displayName": "A" } ] }`.

To enable **dynamic format strings**, add a `general` object with a `formatString` formatting property.

## Feature flags (optional root objects)

| Flag | Purpose |
|------|---------|
| `supportsHighlight` | Receive `values[i].highlights` when other visuals cross-filter yours |
| `sorting` | Declare sort support: `default`, `implicit` (fixed), or `custom` (you sort) |
| `drilldown` | `{ "roles": ["category"] }` — enable the drill hierarchy on a role |
| `expandCollapse` | Expand/collapse matrix row headers (API 4.1+) |
| `supportsLandingPage` | Show a landing page when no data is bound |
| `supportsEmptyDataView` | Receive `update` even with no data (pair with landing page) |
| `supportsKeyboardFocus` | Keyboard navigation/focus support |
| `tooltips` | Enable report-page/canvas tooltip support |
| `advancedEditModeSupport` | `0` none, `1` supported, `2` required |
| `supportsMultiVisualSelection` | Participate in multi-visual selection |
| `subtotals` | Receive subtotal rows in matrix/table |
| `keepAllMetadataColumns` | Receive metadata for all columns regardless of projection (API 5.1+) |

```json
"sorting": { "default": {} },
"drilldown": { "roles": ["category"] },
"tooltips": {
  "supportedTypes": { "default": true, "canvas": true },
  "roles": ["tooltips"]
}
```

## Validation tips

- Keep `objects` names in lockstep with `settings.ts` cards/slices.
- Don't set `min ≥ 1` on more than one role in a single condition.
- For certification, ensure `privileges` contains no `WebAccess`.
- Validate against the published schema: <https://github.com/microsoft/powerbi-visuals-api/blob/master/schema.capabilities.json>.
