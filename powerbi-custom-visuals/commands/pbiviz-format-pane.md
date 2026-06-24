---
name: pbiviz-format-pane
description: Build or extend the modern Format pane (API 5.1+) — formatting model cards, groups, and slices via formatting model utils, with matching capabilities objects.
argument-hint: "[--card <name>] [--slice toggle|number|color|dropdown|font|text] [--conditional]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Build the Format pane

Add Format-pane controls using `getFormattingModel` and `powerbi-visuals-utils-formattingmodel`.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/formatting-model.md`. Example: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/examples/formatting-settings.md`.

## Step 1: Confirm API and dependency

1. Verify `pbiviz.json` `apiVersion` is 5.1 or later (bump it if not).
2. Ensure `powerbi-visuals-utils-formattingmodel` is in `package.json` (install if missing).

## Step 2: Define the settings model

In `src/settings.ts`, add the requested card(s) extending `SimpleCard`/`CompositeCard`, with slices of the right type:
- `--slice toggle` → `ToggleSwitch` (`bool`)
- `--slice number` → `NumUpDown`/`Slider` (`numeric`/`integer`)
- `--slice color` → `ColorPicker` (`fill`)
- `--slice dropdown` → `ItemDropdown`/`AutoDropdown` (`enumeration`)
- `--slice font` → `FontControl` composite
- `--slice text` → `TextInput`/`TextArea` (`text`)

Card `name` must equal the capabilities object name; slice `name` must equal the property name.

## Step 3: Mirror in capabilities.json

Add matching `objects` entries with the correct value types. A name or type mismatch throws at runtime.

## Step 4: Wire the service

Confirm `visual.ts`:
1. Creates `new FormattingSettingsService(localizationManager?)` in the constructor.
2. Calls `populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews)` in `update`.
3. Returns `buildFormattingModel(this.settings)` from `getFormattingModel`.
4. Reads the slice values to drive the render.

## Step 5: Conditional formatting (optional)

If `--conditional`, emit per-data-point `ColorPicker` slices with a `dataViewWildcard` selector, `altConstantSelector`, and `instanceKind: ConstantOrRule` to expose the fx button.

## Guidelines

- Toggle `visible` to show/hide dependent slices dynamically.
- Set `analyticsPane: true` for analytics-pane cards.
- Reset-to-default works automatically with the utils — no extra code.
- Use `displayNameKey`/`descriptionKey` for localized visuals.
