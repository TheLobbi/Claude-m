---
name: pbiviz-migrate
description: Migrate a custom visual to a newer API version and convert the legacy enumerateObjectInstances settings to the modern getFormattingModel format pane.
argument-hint: "[--to-api 5.11.0] [--to-formatting-model]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Migrate a Power BI visual

Upgrade the API version and modernize the Format pane.

References: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/formatting-model.md` and `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/project-structure.md`.

## Step 1: Assess current state

Read `pbiviz.json` (current `apiVersion`), `package.json` (tools/utils versions), and `src/` to detect the legacy pattern: an `enumerateObjectInstances`/`enumerateObjectInstancesToReset` implementation and a hand-written settings parser.

## Step 2: Update dependencies

1. Set `pbiviz.json` `apiVersion` to the target (`--to-api`, 5.1+ for the modern pane).
2. Update `powerbi-visuals-api` and `powerbi-visuals-tools` in `package.json`; add `powerbi-visuals-utils-formattingmodel`.
3. Run `npm install`.

## Step 3: Convert to the formatting model

If `--to-formatting-model` (or legacy code is detected):
1. Rewrite `src/settings.ts` as a `FormattingSettingsModel` with cards/groups/slices whose names match the existing `capabilities.json` objects/properties.
2. In `visual.ts`: create `FormattingSettingsService`, call `populateFormattingSettingsModel` in `update`, and implement `getFormattingModel` returning `buildFormattingModel`.
3. Delete `enumerateObjectInstances`/`enumerateObjectInstancesToReset` (ignored from API 5.1).
4. Preserve existing object/property names and defaults so saved reports keep their formatting.

## Step 4: Reconcile capabilities and deprecations

1. Ensure `privileges` exists (required from v4.6 — add `[]` if missing).
2. Replace any `externalJS` usage with npm dependencies (unsupported since tools 3.x).
3. Confirm the four-part `version` format.

## Step 5: Verify

1. `npx eslint . --ext .js,.jsx,.ts,.tsx` and type-check.
2. `pbiviz start` — confirm the Format pane renders all cards and existing reports' formatting is intact.
3. `pbiviz package` to confirm a clean build.

## Guidelines

- Never rename/remove capabilities objects authors already use — it resets their formatting.
- Migrate one card at a time and diff the Format pane against the old build.
- Add the Rendering Events API during migration if it's missing (needed for certification).
