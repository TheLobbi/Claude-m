---
name: Power BI Custom Visuals Development
description: >
  This skill should be used when the user asks about developing, building, debugging,
  packaging, or certifying a custom Power BI visual with the pbiviz toolchain
  (powerbi-visuals-tools). Covers environment setup, the visual project structure,
  capabilities.json (data roles, dataView mappings, objects, features, privileges),
  the IVisual API lifecycle (constructor, update, getFormattingModel, destroy),
  reading the dataView (categorical, table, matrix, single), the modern format pane
  and formatting model utils, selection and cross-filtering, tooltips, context menus,
  drill-down, bookmarks, landing pages, rendering events, local storage, launchUrl,
  D3 rendering, unit testing, ESLint, packaging to a .pbiviz file, and submitting to
  AppSource / Partner Center for certification. Example user requests: "create a
  custom Power BI visual", "build a bar chart visual with pbiviz", "add a format pane
  card to my visual", "make my visual cross-filter other visuals", "why is my visual
  data view empty", "get my Power BI visual certified".
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - custom power bi visual
  - custom powerbi visual
  - power bi custom visual
  - powerbi custom visual
  - power bi visual development
  - develop power bi visual
  - build power bi visual
  - pbiviz
  - powerbi-visuals-tools
  - pbiviz new
  - pbiviz package
  - pbiviz start
  - ivisual
  - visual.ts
  - capabilities.json
  - pbiviz.json
  - dataview mapping
  - dataview mappings
  - dataviewmappings
  - data roles
  - dataroles
  - categorical data view
  - matrix data view
  - table data view
  - getformattingmodel
  - enumerateobjectinstances
  - format pane
  - formatting model
  - formatting settings
  - formattingmodel utils
  - powerbi-visuals-utils-formattingmodel
  - formatting card
  - formatting slice
  - selection manager
  - selection api
  - createselectionidbuilder
  - cross filtering visual
  - cross highlight
  - supportshighlight
  - visual tooltips
  - tooltip service
  - context menu visual
  - drill down visual
  - expand collapse rows
  - landing page visual
  - launchurl
  - rendering events api
  - color palette
  - fetch more data
  - data reduction algorithm
  - conditional formatting visual
  - dataviewwildcard
  - visual privileges
  - webaccess privilege
  - local storage visual
  - powerbi-visuals-api
  - powerbi-visuals-utils
  - certified power bi visual
  - power bi visual certification
  - appsource visual
  - partner center visual
  - eslint-plugin-powerbi-visuals
  - developer visual
  - power bi developer mode
  - r visual
  - d3 power bi visual
  - sample bar chart visual
  - circle card visual
  - pbiviz file
  - react power bi visual
  - deneb
  - vega visual
  - vega-lite
  - svg dax measure
  - svg in power bi
  - html content visual
  - charticulator
  - daxlib svg
  - low-code custom visual
---

# Power BI Custom Visuals Development

Custom Power BI visuals are web components — written in TypeScript, rendered with D3/SVG/Canvas/HTML, and packaged as a single `.pbiviz` file — that run sandboxed inside an `iframe` in Power BI Desktop and the Power BI service. You build them with the **pbiviz** command-line tool (the `powerbi-visuals-tools` npm package) against the typed **`powerbi-visuals-api`**. This skill covers the full lifecycle: scaffold → develop → debug → package → certify.

> This is a knowledge plugin. It generates and reviews source files (`visual.ts`, `capabilities.json`, `settings.ts`, `pbiviz.json`) and drives the local `pbiviz` CLI — it does not require any MCP server or cloud credentials.

## Prerequisites

- **Node.js** (current LTS) and **npm**. Install the toolchain globally: `npm i -g powerbi-visuals-tools@latest` (provides the `pbiviz` command).
- A **Power BI Pro** or **Premium Per User (PPU)** account to test in the service, plus an IDE (VS Code recommended).
- **Developer mode** enabled — in Power BI Desktop (*File ▸ Options ▸ Report settings ▸ Develop a visual*, per session) or in the service (*Developer settings ▸ Power BI Developer mode*). See `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/environment-setup.md`.
- For certification: a **Partner Center** account and a public/reviewable **GitHub** repository.

## Choosing how to build

The `pbiviz` SDK is the most powerful path, but not always the right one. Pick the lightest approach that meets the need: **SVG rendered from a DAX measure** (inline sparklines/KPIs in tables, no visual to build), **Deneb** (declarative Vega/Vega-Lite, certified), the **HTML Content** visual, **Charticulator** (no-code), or the full **pbiviz SDK** (TypeScript + D3/React) when you need lifecycle control, a custom format pane, advanced interactivity, or AppSource distribution. The full decision guide and low-code patterns are in `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/building-approaches.md`. The rest of this skill covers the SDK path in depth.

## The visual lifecycle at a glance

| Stage | Command / artifact | Reference |
|-------|--------------------|-----------|
| Set up environment | `npm i -g powerbi-visuals-tools@latest`, enable dev mode | `references/environment-setup.md` |
| Scaffold a project | `pbiviz new <name>` | `references/project-structure.md` |
| Declare data + format contract | `capabilities.json` | `references/capabilities.md` |
| Shape the incoming data | `dataViewMappings` + parse `options.dataViews[0]` | `references/dataview-mapping.md` |
| Render & handle lifecycle | `IVisual` class in `src/visual.ts` | `references/visual-api.md` |
| Build the Format pane | `getFormattingModel` + formatting model utils | `references/formatting-model.md` |
| Add interactivity | selection, tooltips, context menu, drill, bookmarks | `references/interactivity.md` |
| Live debug | `pbiviz start` + Developer Visual | command `/pbiviz-debug` |
| Test & lint | ESLint + jasmine/karma unit tests | `references/testing.md` |
| Package | `pbiviz package` → `dist/<name>.pbiviz` | `references/packaging-certification.md` |
| Certify & publish | Partner Center + AppSource | `references/packaging-certification.md` |

## Project structure

`pbiviz new <name>` scaffolds a complete project. The files that matter most:

- **`pbiviz.json`** — visual metadata: internal `name`, `displayName`, unique `guid`, `visualClassName` (must match your `IVisual` class name), `version` (four-part `x.x.x.x`), `apiVersion`, `author`, `assets.icon`, and the paths to `capabilities.json` and `style/visual.less`.
- **`capabilities.json`** — the contract with the host: what data the visual accepts and what appears in the Format pane.
- **`src/visual.ts`** — the `IVisual` implementation (your render code).
- **`src/settings.ts`** — the formatting settings model (Format pane cards/slices).
- **`style/visual.less`** — styles.
- **`assets/icon.png`** — the Visualizations-pane icon, a **20×20 PNG**.
- **`tsconfig.json`**, **`package.json`**, **`package-lock.json`**, **`.eslintrc`**.

Full annotated layout and `pbiviz.json` field reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/project-structure.md`.

## capabilities.json — the data and format contract

`capabilities.json` tells the host what kind of data the visual accepts and what customizable properties appear in the Format pane. From **API v4.6.0** all root properties are optional **except `privileges`, which is required** (use `"privileges": []` when the visual needs no special access).

Root objects:

- **`privileges`** — special access the visual needs: `WebAccess` (external URLs — **must be empty for certification**), `ExportContent` (download to file), `LocalStorage`.
- **`dataRoles`** — the field wells users drag data into. Each has a `name`, `displayName`, and `kind`: `Grouping` (discrete buckets), `Measure` (numeric), or `GroupingOrMeasure`.
- **`dataViewMappings`** — how roles map into a `DataView` (`categorical`, `table`, `matrix`, or `single`), with `conditions` bounding how many fields each role accepts and a `dataReductionAlgorithm` (`top`/`bottom`/`sample`/`window`, default `top` at 1000, max 30000).
- **`objects`** — Format pane properties. Each object/property name must exactly match a card/slice in your formatting model.
- **Feature flags** — `supportsHighlight`, `sorting`, `drilldown`, `expandCollapse`, `supportsLandingPage`, `supportsEmptyDataView`, `supportsKeyboardFocus`, `tooltips`, `advancedEditModeSupport`, `supportsMultiVisualSelection`, `subtotals`, `keepAllMetadataColumns`.

Details and copy-paste blocks: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/capabilities.md`. Complete files: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/capabilities-json.md`.

## DataView — reading the data

Each valid `dataViewMappings` entry produces a `DataView` delivered in `update(options)` as `options.dataViews[0]`. Power BI only populates the mapping types you declared.

- **`single`** — one aggregated value (`dataView.single.value`). For KPI cards.
- **`categorical`** — independent groupings + measures (`dataView.categorical.categories[]` and `.values[]`). The most common mapping for charts. Group `values` `by` a series role for hierarchical/series data; read groups with `categorical.values.grouped()`.
- **`table`** — a flat list of rows (`dataView.table.columns[]`, `dataView.table.rows[]`). **Do not assume row order.**
- **`matrix`** — hierarchical rows/columns as a tree of `DataViewMatrixNode` (`dataView.matrix.rows.root`, `.columns.root`, `.valueSources`). Supports expand/collapse of row headers (API 4.1+).

Always null-check the mapping (`if (!dataView?.categorical?.values) return;`) before reading — a user may not have populated every field well. Parsing patterns for every mapping type: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/dataview-mapping.md`.

## The IVisual API

Every visual is a class implementing `IVisual` (named exactly as `visualClassName` in `pbiviz.json`):

```typescript
export class Visual implements IVisual {
    constructor(options: VisualConstructorOptions) { /* one-time setup */ }
    public update(options: VisualUpdateOptions): void { /* render on every data/size/view change */ }
    public getFormattingModel(): powerbi.visuals.FormattingModel { /* build the Format pane */ }
    public destroy(): void { /* optional cleanup */ }
}
```

- **`constructor(options)`** — runs once. Capture `options.element` (your DOM root) and `options.host` (the `IVisualHost`), and create long-lived services (`createSelectionManager`, `createLocalizationManager`, `colorPalette`, `tooltipService`, `eventService`).
- **`update(options)`** — runs on every change. `options.viewport` is the size, `options.dataViews` the data, `options.type` flags the cause (`Data | Resize | ViewMode | Style | ResizeEnd`). Re-render here.
- **`getFormattingModel()`** — returns the Format pane model (replaces the deprecated `enumerateObjectInstances`).

Host services (selection, tooltips, color palette, `launchUrl`, `persistProperties`, `fetchMoreData`, `storageService`, `eventService`, `displayWarningIcon`, `acquireAADTokenService`) are detailed in `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/visual-api.md`.

**Rendering Events API (required for certification):** call `host.eventService.renderingStarted(options)` at the start of `update`, `renderingFinished(options)` when the DOM is fully drawn, and `renderingFailed(options, reason)` on error. This signals "export to PDF/PowerPoint" and automated tests that rendering is complete.

## The modern Format pane (API 5.1+)

Use API version **5.1 or later** and implement `getFormattingModel`. The recommended approach is the **formatting model utils** (`powerbi-visuals-utils-formattingmodel`):

1. Declare a settings model in `src/settings.ts` extending `formattingSettings.Model`, composed of **cards** (`formattingSettings.SimpleCard` / `CompositeCard`) → optional **groups** → **slices** (`ToggleSwitch`, `NumUpDown`, `Slider`, `ColorPicker`, `ItemDropdown`, `AutoDropdown`, `FontControl`, `TextInput`, `AlignmentGroup`, …). **Card `name` must equal the object name and slice `name` must equal the property name in `capabilities.json`.**
2. In the constructor: `this.formattingSettingsService = new FormattingSettingsService(localizationManager?)`.
3. In `update`: `this.settings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);`
4. Implement `getFormattingModel()` → `return this.formattingSettingsService.buildFormattingModel(this.settings);`

Property type ↔ capabilities value-type mapping, composite slices, conditional formatting (per-data-point colors via `dataViewWildcard` selectors + `instanceKind`), and reset-to-default: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/formatting-model.md`. Full `settings.ts`: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/formatting-settings.md`.

## Interactivity

- **Selection & cross-filtering** — create an `ISelectionManager` in the constructor and an `ISelectionId` per data point with `host.createSelectionIdBuilder().withCategory(...)` / `.withSeries(...)` / `.withTable(...)` / `.withMatrixNode(...)`. Call `selectionManager.select(id, multiSelect)` on click; reflect `selectionManager.getSelectionIds()` visually. Support Ctrl-click for multi-select.
- **Highlighting** — set `"supportsHighlight": true` and render the `values[i].highlights` array (non-highlighted portions dimmed) when other visuals cross-filter yours.
- **Tooltips** — declare `"tooltips"` in capabilities and use `host.tooltipService` (or `powerbi-visuals-utils-tooltiputils`) to show/move/hide tooltips on pointer events.
- **Context menu** — `selectionManager.showContextMenu(selectionId, {x, y}, dataRole?)` on `contextmenu`. The `dataRole` argument is required when the visual supports `drilldown` or `expandCollapse`.
- **Drill-down / expand-collapse**, **bookmarks** (register a selection callback, restore on `update`), **landing page** (`supportsLandingPage` + `supportsEmptyDataView`), **`launchUrl`**, **local storage**, and the **color palette** are all covered in `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/interactivity.md`.

## Testing, linting, and security

Certification requires `eslint`, `eslint-plugin-powerbi-visuals`, and `typescript` in `package.json`, a clean `npm audit` (no high/moderate), and no JS console errors. Unit tests use jasmine + karma with `powerbi-visuals-utils-testutils`. Manipulate the DOM safely — **never** use `innerHTML`/`D3.html()` with user data, and avoid `eval`/`Function`/dynamic `setTimeout`. See `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/testing.md`.

## Packaging & certification

- **Package:** `pbiviz package` writes `dist/<name>.pbiviz`. The `description` field in `pbiviz.json` must be filled in or the command fails. Bump the four-part `version` before each package.
- **Certify:** publish to AppSource via **Partner Center**, then optionally request certification. Requirements: latest API, a lowercase **`certification`** Git branch matching the submitted package, OSS-only libraries, Rendering Events API support, **no external network access** (`WebAccess` empty/omitted), no minified code, and a clean `pbiviz package --certification-audit`. Full checklist: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/packaging-certification.md`.

## Utility packages

Microsoft ships helper packages so you don't reinvent common chart plumbing: `powerbi-visuals-utils-formattingmodel` (Format pane), `-dataviewutils`, `-formattingutils` (number/date formatting + text measurement), `-svgutils`, `-chartutils` (axes/legend), `-colorutils`, `-interactivityutils`, `-tooltiputils`, `-typeutils`, and `-testutils`. Reference + common errors: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/utils-and-troubleshooting.md`.

## Reference files

| File | Path | Content |
|------|------|---------|
| Building approaches | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/building-approaches.md` | Choosing SDK vs Deneb vs SVG-via-DAX vs HTML Content vs Charticulator; React + pbiviz MCP |
| Environment setup | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/environment-setup.md` | Node, pbiviz install, dev mode, account/SSL setup |
| Project structure | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/project-structure.md` | Folder layout, `pbiviz.json`, `tsconfig`, `package.json` |
| Capabilities | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/capabilities.md` | privileges, dataRoles, mappings, objects, feature flags |
| DataView mapping | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/dataview-mapping.md` | single/categorical/table/matrix parsing, reduction, conditions |
| Visual API | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/visual-api.md` | IVisual lifecycle, host services, rendering events |
| Formatting model | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/formatting-model.md` | Format pane, utils, slice types, conditional formatting |
| Interactivity | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/interactivity.md` | selection, tooltips, context menu, drill, bookmarks, landing page |
| Testing | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/testing.md` | ESLint, unit tests, debugging, security rules |
| Packaging & certification | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/packaging-certification.md` | pbiviz package, AppSource, certification checklist |
| Utils & troubleshooting | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/utils-and-troubleshooting.md` | utility packages, common errors and fixes |

## Example files

| File | Path | Content |
|------|------|---------|
| Visual (bar chart) | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/visual-ts-barchart.md` | Complete `visual.ts`: IVisual, D3, selection, tooltips, rendering events |
| capabilities.json | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/capabilities-json.md` | Complete capabilities for categorical, table, and matrix visuals |
| Formatting settings | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/formatting-settings.md` | `settings.ts` cards/groups/slices + conditional formatting |
| Config files | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/pbiviz-and-config.md` | `pbiviz.json`, `tsconfig.json`, `package.json`, `.eslintrc` |
| Scaffold walkthrough | `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/scaffold-walkthrough.md` | End-to-end: new → develop → start → package → certify |
