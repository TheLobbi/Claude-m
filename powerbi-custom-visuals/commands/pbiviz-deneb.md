---
name: pbiviz-deneb
description: Author or iterate a Deneb (Vega / Vega-Lite) specification for Power BI — bind the dataset, add cross-filtering, tooltips, theme colors, and responsive sizing, without building a .pbiviz.
argument-hint: "<chart description> [--provider vega|vega-lite] [--crossfilter] [--template]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Author a Deneb (Vega / Vega-Lite) spec

Produce a Deneb-ready JSON specification for the requested chart. Deneb is the **certified** declarative path — no `pbiviz` build, no TypeScript. Use it when the chart isn't in the Power BI core set but exists in the Vega ecosystem, and the user wants interactivity + theming without packaging a visual.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/deneb-vega.md`. Copy-paste specs: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/deneb-specs.md`.

## Step 0: Confirm Deneb is the right tool

If the user needs a custom Format pane, custom data reduction/paging beyond Deneb's row limit, or AppSource distribution under their own brand, point them at the `pbiviz` SDK (`/pbiviz-scaffold`) instead. Otherwise proceed.

## Step 1: Establish intent

- **Chart type** and the **fields** it needs (which become the `dataset` columns / template placeholders).
- **Provider** — `--provider`; default **Vega-Lite** unless the chart needs explicit scales/signals/brushing or manual cross-filter, then **Vega**.
- Whether **cross-filtering** (`--crossfilter`), **tooltips**, **report-theme colors**, or a reusable **`--template`** wrapper are wanted.

## Step 2: Build the spec

1. Reference the Power BI data as `{ "data": { "name": "dataset" } }` (Vega-Lite) or a `dataset` data source (Vega). Use the **column display names** as field names.
2. Make it responsive: `"width": "container"`, `"height": "container"`, `"autosize": { "type": "fit", "contains": "padding" }`.
3. Use **`pbiColor(index, shade?)`** for theme-aware colors, **`pbiFormat(value, fmt, opts?)`** / `formatType: "pbiFormat"` for Power BI format strings, and **`pbiPatternSVG(pattern, fg, bg)`** for texture fills (SVG render mode).
4. If cross-filtering: style on the **`__selected__`** field (`'on'`/`'off'`/`'neutral'`) for Simple mode (both providers); for brush/aggregate selection use Vega Advanced mode with the `pbiCrossFilterSelection` signal and `pbiCrossFilterApply(event, filter?, options?)` / `pbiCrossFilterClear()`.
5. Keep shared styling (axes, legend, palette, fonts) in the **Config** object, not the Specification.

## Step 3: Wire interactivity correctly

- Tell the user to enable **Settings ▸ "Expose cross-filtering values for dataset rows"** when the spec reads `__selected__`.
- Note the **selection data-point limit** and **data row limit** — recommend aggregating upstream in DAX/Power Query when grain is fine.
- For pattern fills, set render mode to **SVG**.

## Step 4: Optional — make it a template

With `--template`, wrap the spec in a `usermeta` block (`information`, `provider`, `dataset` placeholders) so it can be exported/imported and field-mapped. Spec field names must match `usermeta.dataset[].name`.

## Guidelines

- **Certified-build constraints:** no external `data.url`, remote images, or external fonts — everything must come through the `dataset`. Flag any spec that would need them.
- Prefer Vega-Lite for standard statistical charts; reach for Vega only when its lower-level control is required.
- Hand back the Specification and Config as separate JSON blocks, and state which Deneb Settings to toggle.
</content>
