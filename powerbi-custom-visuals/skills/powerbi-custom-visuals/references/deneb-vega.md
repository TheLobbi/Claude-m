# Deneb — Vega and Vega-Lite in Power BI

[Deneb](https://deneb.guide) (homepage redirects from `deneb-viz.github.io`) is a **community-developed, Microsoft-certified** custom visual that brings the full declarative **[Vega](https://vega.github.io/vega/)** and **[Vega-Lite](https://vega.github.io/vega-lite/)** JSON grammars into Power BI. You author a chart as a JSON specification instead of writing a TypeScript `.pbiviz` — no build step, no `pbiviz` toolchain — yet still get native Power BI interactivity (cross-filtering, cross-highlighting, tooltips, context menus) and report-theme integration.

Use Deneb when the chart you need exists in the Vega ecosystem but not in the Power BI core set (FT Visual Vocabulary types, bullet charts, radial/sunburst, sankey-style layouts, small multiples, annotated combo charts) and you want a **certified** path without maintaining a packaged visual. When you outgrow declarative specs — custom format pane, custom data reduction/paging, AppSource distribution under your own brand — graduate to the `pbiviz` SDK (the rest of this skill).

> Deneb is itself a `.pbiviz` SDK visual. This reference covers **authoring specs inside Deneb**, not rebuilding Deneb. For the SDK path see the other references in this skill.

## Install & version

- Install from **AppSource** ("Deneb"), or sideload the `.pbiviz` from the [GitHub releases](https://github.com/deneb-viz/deneb). The certified build is in AppSource and is safe for org distribution / PowerPoint + PDF export.
- Deneb embeds specific Vega / Vega-Lite runtimes; the **Settings ▸ Display** pane shows the bundled versions (recent Deneb ships Vega 5.x and Vega-Lite 5.x). Specs are validated against those versions — pin examples to features available in the embedded runtime, not the latest upstream Vega-Lite.
- Versioned docs live under `https://deneb.guide/docs/<version>/...`; always match guidance to the Deneb build in the report.

## The editor

Double-click a Deneb visual (or **Edit** from its header) to open the three-pane editor:

| Pane | Purpose |
|------|---------|
| **Specification** | The Vega or Vega-Lite JSON that defines the chart. |
| **Config** | A Vega/Vega-Lite **config** object merged into the spec — central place for theme, axis, legend, and mark defaults. Keeping styling here keeps the Specification focused on structure. |
| **Settings** (gear) | Visual-level options: provider (Vega vs Vega-Lite), render mode (Canvas/SVG), interactivity toggles, data row limit, JSON theme, number-format locale, log level. |

The editor gives live preview, JSON schema IntelliSense (autocomplete + validation), a data-row/signal/log debug area, and **Auto-apply** vs manual apply. The **Get data** / Map fields step is what binds Power BI field wells to the spec (see below).

## Binding Power BI data — the `dataset`

Drag fields into Deneb's **Values** data role. Deneb exposes those rows to the spec as a single named Vega dataset called **`dataset`**. Reference it explicitly:

**Vega-Lite:**
```json
{
  "data": { "name": "dataset" },
  "mark": "bar",
  "encoding": {
    "x": { "field": "Category", "type": "nominal" },
    "y": { "field": "Sales",    "type": "quantitative" }
  }
}
```

**Vega:**
```json
{
  "data": [
    { "name": "dataset" },
    { "name": "filtered", "source": "dataset",
      "transform": [{ "type": "filter", "expr": "datum.Sales > 0" }] }
  ]
}
```

Field names in the spec are the **column display names** from the field well (e.g. `"Sales"`, not a Power BI internal column ref). Measures arrive already aggregated by Power BI — Deneb does not re-aggregate; you can still do further `transform` (`aggregate`, `window`, `fold`, `joinaggregate`) inside the spec. Each row also carries Deneb-injected fields used for interactivity: **`__selected__`**, **`__identity__`**, and **`__key__`** (see below) — exclude these when you `fold`/iterate over arbitrary fields.

### Row limit

Deneb caps the dataset rows it passes to the spec. The default is **modest (a few thousand rows)** and is configurable in **Settings ▸ Data Limit** (you can raise the cap and optionally fetch additional windows). High row counts hurt render performance, especially in SVG mode — aggregate upstream in DAX/Power Query or inside the spec rather than streaming tens of thousands of marks.

## Provider: Vega vs Vega-Lite

- **Vega-Lite** — concise, high-level grammar (`mark` + `encoding`). Best for standard statistical charts and fast iteration. Interactivity uses **parameters** and conditional encodings. Most Deneb work starts here.
- **Vega** — lower-level, more verbose (explicit `scales`, `axes`, `marks`, `signals`, `data` transforms). Choose it for full control: bespoke layouts, custom event streams, advanced/manual cross-filtering, and things Vega-Lite can't express. You can author in Vega-Lite and **compile to Vega** to keep iterating at the lower level.

Set the provider in **Settings**. Switching provider does not auto-convert an existing spec.

## Interactivity (Power BI integration)

Deneb injects Power BI-aware **expression functions** and **signals** so a declarative spec can drive the host. These identifiers are Deneb-specific — they do not exist in upstream Vega.

### Cross-filtering (selection)

Enable **"Expose cross-filtering values for dataset rows"** in Settings (off by default). Deneb then maintains a **`__selected__`** field on every `dataset` row with one of three string values:

- `"on"` — the row is part of the current selection
- `"off"` — a selection exists and this row is excluded
- `"neutral"` — no active selection

There are two management modes:

**Simple** (default; Vega-Lite and Vega) — Deneb wires click/Ctrl-click/Shift-click on marks automatically. You only style on `__selected__`. The selectable mark must carry a resolvable datum from `dataset`.

Dim unselected bars in **Vega-Lite**:
```json
"encoding": {
  "opacity": {
    "condition": { "test": "datum.__selected__ == 'off'", "value": 0.3 },
    "value": 1
  }
}
```

Mark explicitly-selected points with a pattern fill:
```json
"fill": {
  "condition": {
    "test": "datum.__selected__ == 'on'",
    "value": { "expr": "pbiPatternSVG('diagonal-stripe-6', '#605E5C', '#ffffff')" }
  },
  "value": { "expr": "pbiColor(0)" }
}
```

There is a configurable **selection data-point limit** (default modest, e.g. ~50). Exceeding it raises a dismissible warning and blocks further selections — keep the selectable grain coarse.

**Advanced** (Vega only) — you manage the event stream yourself via a reserved signal named **`pbiCrossFilterSelection`** and the expression functions **`pbiCrossFilterApply(...)`** and **`pbiCrossFilterClear()`**. This enables brush/drag-to-filter and clicking axis labels or aggregate marks.

```json
"signals": [
  {
    "name": "pbiCrossFilterSelection",
    "value": [],
    "on": [
      {
        "events": { "source": "scope", "type": "mouseup", "markname": "data-point" },
        "update": "pbiCrossFilterApply(event)"
      },
      {
        "events": { "source": "view", "type": "mouseup",
          "filter": ["!event.item || event.item.mark.name != 'data-point'"] },
        "update": "pbiCrossFilterClear()"
      }
    ]
  }
]
```

`pbiCrossFilterApply(event, filter?, options?)`:
- **`event`** — the bound Vega event.
- **`filter`** *(optional)* — a Vega expression string selecting the rows to filter, e.g. `"datum['Product'] == _{Product}_"`. The **`_{fieldname}_`** placeholder is Deneb shorthand that resolves to the clicked datum's value for that field — handy for brushing/aggregate marks where the clicked mark isn't a single `dataset` row.
- **`options`** *(optional)* — `{ "limit": <n>, "multiSelect": <bool> }`.

`pbiCrossFilterClear()` clears the active selection (wire it to clicks on empty space).

### Cross-highlighting

When **other** visuals filter the page, Power BI sends highlight info; Deneb reflects it through `__selected__` the same way, so the dimming/pattern conditions above respond to inbound cross-highlight too. Design the encoding once and it works both directions.

### Tooltips

Two layers:

- **Automatic** — enable tooltips in Settings; any field in a mark's `encoding` (or a Vega-Lite `tooltip: true`) surfaces as a Power BI tooltip. Reorder/format with an explicit `tooltip` array of `{ "field": ..., "type": ..., "format": ... }`.
- **Report-page tooltips** — Deneb can trigger a Power BI **tooltip page** when you bind a field to Deneb's **Tooltips** data role and reference it from the spec, giving a full mini-report on hover.

Use **`pbiFormat(value, formatString, options?)`** inside a `calculate`/expression to apply a **Power BI format string** (e.g. `"#,0.00"`, `"0.0%"`, currency) instead of D3's format grammar — and to honor the model's locale.

### Context menu & drill

Right-click on a mark with a resolvable datum surfaces the standard Power BI **context menu** (drill, include/exclude, see records) automatically when interactivity is enabled — no extra spec wiring in Simple mode.

## Theming & colors

- **`pbiColor(index | name, shadePercent = 0)`** — returns a color from the **active Power BI report theme**. `pbiColor(0)` is the first theme data color; `shadePercent` lightens (positive) or darkens. Use it instead of hard-coded hex so the visual follows theme switches.
- **Config object / JSON theme** — put `scale`, `range`, `axis`, `legend`, and mark defaults in the **Config** pane (or a saved **JSON theme** in Settings) so every spec in the report inherits consistent styling. Vega-Lite `config.range.category` can be set to the theme palette.
- **`pbiPatternSVG(pattern, foreground, background)`** — returns an SVG pattern fill (e.g. `'diagonal-stripe-6'`, `'crosshatch'`) usable as a mark `fill`/`stroke` value — useful for accessibility (encode a series by texture as well as color) and for highlighting selected marks.

## Responsiveness

Make a spec fill the visual container:

```json
{
  "width": "container",
  "height": "container",
  "autosize": { "type": "fit", "contains": "padding" }
}
```

In Vega-Lite, `"width": "container"` / `"height": "container"` plus `autosize` lets the chart resize with the Power BI visual frame. Avoid fixed pixel `width`/`height` unless you intend a non-responsive chart.

## Templates

Deneb has a first-class **template** system. A template is the spec + config wrapped with a Vega `usermeta` block describing:

- **`information`** — name, description, author, Deneb/provider version.
- **`provider`** — `vegaLite` or `vega`.
- **`dataset`** — the **field placeholders** the template expects (name, type, description). On import Deneb prompts the user to map Power BI fields to these placeholders.
- **`config`** — default config for the chart.

**Export** a finished spec as a template (Settings ▸ Export) to reuse or share; **import** a `.json` template (Create flow) and map fields. Community galleries — the official Deneb gallery, `avatorl/Deneb-Vega-Templates`, `PBI-David/Deneb-Showcase`, and Kerry Kolosko's site — are large libraries of ready templates. The deneb.guide site has a built-in template picker for common chart types.

## Settings reference (gear pane)

| Setting | What it controls |
|---------|------------------|
| **Provider** | Vega vs Vega-Lite. |
| **Render mode** | **Canvas** (faster for many marks) vs **SVG** (crisper, inspectable, needed for some pattern/text effects). |
| **Cross-filtering** | Enable `__selected__`; Simple vs Advanced; selection data-point limit. |
| **Data Limit** | Row cap passed to `dataset`; option to load more. |
| **JSON theme / Config** | Shared styling merged into every spec. |
| **Locale / number format** | Locale used by D3 formats and `pbiFormat`. |
| **Log level / Debug** | Surface Vega warnings, view signal values and the live data table. |

## Certified-build constraints

Because the AppSource Deneb is **certified**, specs run under the same sandbox as any certified visual:

- **No external resources.** `data.url` / loading remote data, remote images, and external fonts are blocked. All data must come through the Power BI `dataset`; bundle any imagery as data URIs and rely on system/theme fonts.
- No arbitrary network or script access — Vega's loader is restricted.
- This is exactly why Deneb is safe for org distribution and export to PowerPoint/PDF. If you need external assets, you've left the certified path and should reconsider the SDK.

## When to graduate to the pbiviz SDK

Move from Deneb to a packaged `.pbiviz` when you need any of: a **custom Format pane** (Deneb exposes spec/config, not bespoke cards), **custom data reduction or `fetchMoreData` paging** beyond Deneb's row limit, **selection semantics** Deneb's `__selected__`/`pbiCrossFilterApply` model can't express, **AppSource distribution under your own brand**, or tight control of the **Rendering Events API** and accessibility. Everything from `update` lifecycle to certification is in the rest of this skill.

## Resources

- Deneb docs & deep dives: <https://deneb.guide> (versioned).
- Interactivity / cross-filtering: `deneb.guide/docs/<ver>/interactivity-selection` and `interactivity-selection-advanced`.
- Microsoft guidance recommending Deneb: [Power BI implementation planning — integration with other services](https://learn.microsoft.com/power-bi/guidance/powerbi-implementation-planning-integration-with-other-services).
- Vega-Lite example gallery: <https://vega.github.io/vega-lite/examples/>; Vega examples: <https://vega.github.io/vega/examples/>.
- Templates/showcases: official Deneb gallery, `avatorl/Deneb-Vega-Templates`, `PBI-David/Deneb-Showcase`, kerrykolosko.com.
</content>
</invoke>
