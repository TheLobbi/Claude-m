# Ways to build a custom visual — choosing an approach

The `pbiviz` SDK is the most powerful way to build a Power BI visual, but it is not always the fastest or the right one. Power BI supports a spectrum of approaches — pick the lightest one that meets the requirement, and reserve the full SDK for genuinely bespoke interactivity.

## Decision guide

| Need | Best approach |
|------|---------------|
| Fully bespoke rendering, interactivity, format pane, AppSource distribution | **pbiviz SDK** (TypeScript + D3/React) |
| Declarative chart not in the core set, fast iteration, certified | **Deneb** (Vega / Vega-Lite) |
| Small inline graphics (sparklines, icons, KPI chips, progress bars) inside a table/matrix/card | **SVG via a DAX measure** |
| Rich HTML/CSS/SVG content without writing a visual | **HTML Content** visual |
| Custom chart by drag-and-drop, no code | **Charticulator** |
| Reuse the same SVG/measure logic across models | **DAX UDFs + daxlib.svg** packages |

Rule of thumb: try **SVG-via-DAX → Deneb → SDK** in that order of increasing effort. Only build a `.pbiviz` when you need lifecycle control, custom data reduction/paging, advanced format-pane UX, or marketplace distribution.

## 1. pbiviz SDK (this plugin's focus)

Full TypeScript visuals built with `powerbi-visuals-tools`. Render with **D3**, **Canvas/WebGL**, or **React**:

- **React tutorial** — Microsoft ships a React + TypeScript circle-card walkthrough; `ReactDOM` mounts into `options.element` and re-renders from `update`. See <https://learn.microsoft.com/power-bi/developer/visuals/create-react-visual>. Manage the React root in the constructor and feed it new props on each `update`.
- **pbiviz MCP server** — recent `powerbi-visuals-tools` ships an MCP server so an AI agent can drive scaffolding, build, and packaging through the Model Context Protocol (`microsoft/powerbi-visuals-tools` on GitHub).
- Everything else about the SDK path is in `visual-api.md`, `capabilities.md`, `formatting-model.md`, `interactivity.md`, and `packaging-certification.md`.

## 2. Deneb — Vega and Vega-Lite

[Deneb](https://deneb.guide) is a **certified** custom visual that brings the full declarative **Vega** and **Vega-Lite** grammars into Power BI, including animation, with native Power BI interactivity (cross-filtering, cross-highlighting, tooltips, context menus, report themes).

- Bind the Power BI dataset to a Vega/Vega-Lite spec via the named dataset **`dataset`**; iterate in-visual without a build step or the `pbiviz` toolchain.
- **Vega-Lite** for concise standard charts; **Vega** for explicit scales/signals/marks and manual interactivity.
- Power BI integration uses Deneb's own identifiers: the **`__selected__`** cross-filter field, the **`pbiCrossFilterApply`/`pbiCrossFilterClear`** expressions, and **`pbiColor`/`pbiFormat`/`pbiPatternSVG`** helpers. Certified build allows **no external resources** (no `data.url`, remote images, or external fonts).
- Best when the chart type exists in the Vega ecosystem but not in core Power BI (e.g. FT Visual Vocabulary chart types, bullet/radial/sunburst) and you want it certified.
- **Deep dive:** `deneb-vega.md` in this skill (editor, dataset binding, interactivity, themes, templates, limits) and copy-paste specs in `examples/deneb-specs.md`. Run `/pbiviz-deneb` to author a spec.
- Resources: Deneb docs and community gallery (<https://deneb.guide>), `avatorl/Deneb-Vega-Templates`, `PBI-David/Deneb-Showcase`, kerrykolosko.com.

## 3. SVG / HTML rendered from a DAX measure (no custom visual)

Power BI renders SVG as an image when a **measure returns** a string like `data:image/svg+xml;utf8,<svg ...>...</svg>` **and** the field's **Data category** is set to **Image URL**. Works in core visuals: **Table, Matrix, New Card, Button Slicer, and Image**.

```dax
Sparkbar =
VAR Pct = DIVIDE ( [Sales], [Target] )
VAR W = INT ( 100 * Pct )
RETURN
    "data:image/svg+xml;utf8,"
        & "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='14'>"
        & "<rect width='100' height='14' fill='#EEE'/>"
        & "<rect width='" & W & "' height='14' fill='#118DFF'/>"
        & "</svg>"
```

- Prefer `data:image/svg+xml;utf8,` over base64 for dynamic, DAX-concatenated SVG.
- **Responsive SVG** — embed an HTML `<style>` block inside `<foreignObject>` and use CSS variables + `@media` for responsiveness in table/matrix/button-slicer cells.
- **Clickable** — put an `<a href>` inside the SVG, or expose a separate Web-URL measure via conditional formatting.
- **Reuse** — install SVG helper UDFs from **daxlib.svg** (`https://daxlib.org/package/daxlib.svg/`) via TMDL instead of hand-writing markup.
- Caveats: pure-DAX SVG has no event model beyond hyperlinks, no real layout engine, and large/complex SVG hurts table render performance. When you outgrow it, move to Deneb or the SDK.
- References: SQLBI "Creating custom visuals in Power BI with DAX", Chandoo's SVG-DAX tutorial, DataVeld "Use SVG images in Power BI", `avatorl/PowerBI-SVG`.

## 4. HTML Content visual

The **HTML Content** AppSource visual renders an HTML/CSS/SVG string produced by a measure — richer than Image-URL SVG, no SDK build.

- **Regular** edition: supports iframes and external fonts.
- **Lite (Certified)** edition: certified for org distribution and supports PowerPoint/PDF export, with stricter sanitization.
- Supports clickable SVG via `href` with the *Allow Opening URLs* setting. Docs: `https://html-content.com`.

## 5. Charticulator (no-code)

[Charticulator](https://charticulator.com) (Microsoft Research) is a no-code, drag-and-drop designer for bespoke chart layouts; it exports a `.pbiviz` and is available as an AppSource visual. Use it when you want a custom layout without writing TypeScript.

## When to graduate to the SDK

Move to a full `.pbiviz` when you need any of: a custom format pane, selection/cross-filter beyond a single column, custom data-reduction or `fetchMoreData` paging, the Rendering Events API for export fidelity, keyboard accessibility, local storage, licensing, or AppSource certification under your own brand. The rest of this skill covers that path end to end.
