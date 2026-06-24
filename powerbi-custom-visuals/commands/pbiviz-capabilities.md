---
name: pbiviz-capabilities
description: Author or edit capabilities.json — data roles, dataView mappings, conditions, Format-pane objects, privileges, and feature flags — keeping it consistent with the visual code.
argument-hint: "[path to capabilities.json] [--add-role <name>] [--feature highlight|sorting|drilldown|tooltips|landingpage]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Edit capabilities.json

Create or modify the visual's data and format contract safely.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/capabilities.md`. Examples: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/capabilities-json.md`.

## Step 1: Locate and read

Find `capabilities.json` (Glob `**/capabilities.json` if no path) and read it alongside `pbiviz.json` (for `apiVersion`) and `src/settings.ts` (for object/property names).

## Step 2: Apply the requested change

Depending on the request:
- **Data roles** — add/edit `dataRoles` with `name`, `displayName`, `kind` (`Grouping` / `Measure` / `GroupingOrMeasure`), and optional `requiredTypes`/`preferredTypes`.
- **Mappings** — edit `dataViewMappings` (`categorical` / `table` / `matrix` / `single`), `for...in` vs `bind...to`, `conditions` cardinality, and `dataReductionAlgorithm`.
- **Objects** — add Format-pane objects/properties with correct `type` values.
- **Features** — toggle `supportsHighlight`, `sorting`, `drilldown`, `expandCollapse`, `tooltips`, `supportsLandingPage`, `supportsEmptyDataView`, `supportsKeyboardFocus`, etc.
- **Privileges** — set `privileges` (`WebAccess` / `ExportContent` / `LocalStorage`, or `[]`).

## Step 3: Enforce invariants

Verify every change against these rules:
- `privileges` is present (use `[]` when none).
- At most one role has `min ≥ 1` in any single `conditions` entry.
- Every `objects` object/property name matches a card/slice `name` in `settings.ts` (flag mismatches to fix in both files).
- `dataReductionAlgorithm.count` ≤ 30000.
- Only mappings the visual actually reads are declared.

## Step 4: Validate and report

1. Confirm the file is valid JSON.
2. Summarize what changed and any matching edits required in `settings.ts` or `visual.ts`.

## Guidelines

- For certification, keep `WebAccess` out of `privileges`.
- Don't rename or remove objects that existing reports depend on — it breaks saved formatting.
- Prefer `displayNameKey` over `displayName` when the visual is localized.
