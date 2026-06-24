---
name: pbiviz-certify
description: Audit a custom visual against Power BI certification requirements and prepare the AppSource / Partner Center submission, with a pass/fail readiness report.
argument-hint: "[path to project] [--fix]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Certify a Power BI visual

Check the project against Microsoft's certification requirements and produce a readiness report.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/packaging-certification.md`.

## Step 1: Inventory the project

Read `pbiviz.json`, `capabilities.json`, `package.json`, `.gitignore`, and the `src/` files. Confirm it is a single-visual repository.

## Step 2: Static requirement checks

Verify each requirement and record pass/fail:
- Not an R-visual; uses a recent `apiVersion` and `powerbi-visuals-tools`.
- `package.json` has `typescript`, `eslint`, `eslint-plugin-powerbi-visuals`, and the lint command `npx eslint . --ext .js,.jsx,.ts,.tsx`.
- Required files present: `capabilities.json`, `pbiviz.json`, `package.json`, `package-lock.json`, `tsconfig.json`.
- `.gitignore` excludes `node_modules`, `.tmp`, `dist`.
- `privileges` contains no `WebAccess` (no external access).
- Rendering Events API (`renderingStarted`/`renderingFinished`/`renderingFailed`) is used.

## Step 3: Source-safety scan

Grep the source for disallowed patterns and report each hit:
- `fetch(`, `XMLHttpRequest`, `WebSocket`
- `innerHTML`, `outerHTML`, `.html(` with user data
- `eval(`, `new Function(`, user input in `setTimeout`/`setInterval`/`requestAnimationFrame`
- minified files

## Step 4: Command checks

Run and capture results:
1. `npm install`
2. `npx eslint . --ext .js,.jsx,.ts,.tsx`
3. `npm audit` (must have no high/moderate)
4. `pbiviz package` then `pbiviz package --certification-audit`. If `--fix`, also run `pbiviz package --certification-fix` for forbidden calls inside third-party libraries only, and warn to retest.

## Step 5: Submission prep + report

1. Confirm a lowercase `certification` Git branch matching the package (or instruct how to create it).
2. List the Partner Center steps: publish to AppSource, then *Product setup ▸ Request Power BI certification*, providing the source link + access in the notes.
3. Output a checklist-style readiness report with every requirement marked PASS/FAIL and the exact remediation for each failure.

## Guidelines

- Certification needs the compiled package to exactly match the submitted source.
- `--certification-fix` is only for library code you don't control; fix your own code by hand.
- Certified visuals can't access external services or use commercial libraries.
