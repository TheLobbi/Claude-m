---
name: pbiviz-scaffold
description: Scaffold a new Power BI custom visual project with pbiviz and wire it up for the modern format pane, a chosen data mapping, and a starter render.
argument-hint: "<visual name> [--mapping categorical|table|matrix|single] [--lib d3|none] [--api 5.11.0]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Scaffold a Power BI Visual

Create a buildable visual project and tailor it to the user's intended chart.

References: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/project-structure.md` and the examples under `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/`.

## Step 1: Determine intent

Parse the name and flags. Establish:
- Visual display name and internal name.
- Data mapping — `--mapping` or infer (charts → `categorical`, grids → `table`, hierarchies → `matrix`, KPI → `single`).
- Rendering library — `--lib` (default `d3`).
- API version — `--api` (default a 5.1+ value for the modern format pane).

## Step 2: Generate the project

1. Run `pbiviz new <name>` in the target directory.
2. `cd <name>` and run `npm install`.
3. If `--lib d3`, add `d3` and `@types/d3` to `package.json` and install.

## Step 3: Configure metadata

Edit `pbiviz.json`: set `displayName`, `visualClassName` (match the class), a four-part `version`, `apiVersion` (5.1+), and `author`. Leave `description` for `/pbiviz-package` but note it is required before packaging.

## Step 4: Author the contract and code

1. Write `capabilities.json` for the chosen mapping (use `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/capabilities-json.md`), including `"privileges": []`.
2. Write `src/settings.ts` (formatting model) with card/slice names matching the capabilities objects (use the formatting-settings example).
3. Write `src/visual.ts` implementing `IVisual` with the Rendering Events API, DataView parsing for the mapping, and `getFormattingModel` (use the bar-chart example as the template, adapted to the mapping).

## Step 5: Verify it builds

1. Run `npx eslint . --ext .js,.jsx,.ts,.tsx` and fix issues.
2. Suggest `pbiviz start` (or run `/pbiviz-debug`) to view the Developer Visual.

## Guidelines

- Keep `visualClassName`, the class name, and capabilities/settings names consistent.
- Always null-guard the DataView in `update` and pair with a landing page when appropriate.
- Don't bundle libraries via `externalJS` (unsupported) — use npm dependencies.
