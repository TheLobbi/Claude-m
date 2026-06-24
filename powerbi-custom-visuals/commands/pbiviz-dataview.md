---
name: pbiviz-dataview
description: Design a dataView mapping and generate the matching DataView-parsing code in visual.ts for categorical, table, matrix, or single mappings.
argument-hint: "[--mapping categorical|table|matrix|single] [--grouped] [--paging]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Design and parse the DataView

Wire the data contract to the render code so `update` reads the right shape.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/dataview-mapping.md`.

## Step 1: Choose the mapping

Pick or confirm the mapping from the request:
- `categorical` — groupings + measures (most charts); add `--grouped` for a series via `group.by`.
- `table` — flat rows (grids); never assume row order.
- `matrix` — hierarchical rows/columns (tree); enable expand/collapse + drilldown if needed.
- `single` — one aggregated value (KPI cards).

## Step 2: Update capabilities

Ensure `capabilities.json` declares the chosen mapping and matching `conditions`. If paging large data (`--paging`), set a `window` (or `top`) `dataReductionAlgorithm` with the desired `count`.

## Step 3: Generate parsing code

In `src/visual.ts`, write a `transform(dataView)` that:
1. Null-guards the mapping (`if (!dataView?.categorical?.values) return [];`).
2. Reads columns/rows/nodes for the mapping (use `categorical.values.grouped()` for series, `withMatrixNode` recursion for matrix).
3. Builds a typed data array including an `ISelectionId` per point using the correct builder (`withCategory` / `withSeries` / `withTable` / `withMatrixNode`).
4. Captures `highlights` when `supportsHighlight` is on.

## Step 4: Handle paging (optional)

If `--paging`, accumulate rows across `update` calls: reset on `operationKind === Create`, append otherwise, and call `host.fetchMoreData(true)`; render only when it returns `false`.

## Step 5: Verify

1. Type-check (`npx tsc --noEmit` or rely on `pbiviz start`).
2. Confirm the Developer Visual's **Show dataview** tab matches the expected shape.

## Guidelines

- Match the selection-builder method to the mapping or cross-filtering breaks.
- Default reduction is `top`/1000; raise `count` (≤30000) or page for larger sets.
- Keep parsing pure and defensive — users may populate only some field wells.
