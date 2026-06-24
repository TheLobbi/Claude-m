---
name: pbiviz-debug
description: Run the pbiviz dev server and diagnose a custom visual — blank Developer Visual, empty dataView, format-pane errors, console exceptions, and cert issues.
argument-hint: "[--start] [--symptom blank|nodata|formatpane|console|cert]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Debug a Power BI visual

Start the dev loop and resolve common failures.

References: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/testing.md` and `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/utils-and-troubleshooting.md`.

## Step 1: Start the dev server

If `--start` (or no specific symptom), run `pbiviz start` from the project root and remind the user to add the **Developer Visual** in a report with developer mode enabled. Use the **Show dataview** tab to inspect the delivered `DataView`.

## Step 2: Triage by symptom

Work the matching checklist:
- **blank** — `visualClassName` must equal the class name; dev cert must be trusted (`pbiviz --install-cert`); `pbiviz start` must be running.
- **nodata** — required field wells unfilled or `conditions` unmet; the read mapping must be declared in `dataViewMappings`; add null-guards and a landing page.
- **formatpane** — card/slice `name` must match capabilities object/property names and types; ensure `getFormattingModel` is implemented (API 5.1+ ignores `enumerateObjectInstances`).
- **console** — find the throwing code; never `innerHTML` user data; guard against `null`/`undefined` cells; certification requires a clean console for all inputs.
- **cert** — connection/cert errors: reinstall and trust the dev certificate, restart the browser.

## Step 3: Inspect the code

1. Read `visual.ts`, `capabilities.json`, `settings.ts`, `pbiviz.json`.
2. Grep for risky patterns (`innerHTML`, `eval(`, `fetch(`, `XMLHttpRequest`).
3. Verify the Rendering Events API wraps `update`.

## Step 4: Fix and re-verify

Apply the fix, then re-run `pbiviz start` (or `npx eslint . --ext .js,.jsx,.ts,.tsx`) and confirm the symptom is gone across empty, partial, and large data.

## Guidelines

- Reproduce with the smallest dataset first.
- Keep `console.log` out of shipped code paths that could throw.
- Don't disable TLS to fix cert errors — trust the dev certificate.
