---
name: pbiviz-package
description: Build a distributable .pbiviz — fill required pbiviz.json metadata, bump the four-part version, set the icon, then run pbiviz package and verify the output.
argument-hint: "[--bump major|minor|patch|build] [--audit]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Package the visual

Produce `dist/<name>.pbiviz` ready to import or submit.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/packaging-certification.md`.

## Step 1: Check required metadata

Read `pbiviz.json` and confirm/fill:
- `visual.displayName`, `visual.description` (**required** — package fails without it).
- `visual.supportUrl`, `visual.gitHubUrl`.
- `author.name`, `author.email`.
- `visual.version` is four parts (`x.x.x.x`).
- `assets/icon.png` exists and is a 20×20 PNG.

## Step 2: Bump the version

Apply `--bump` to the four-part `version` (default `build`, the last segment). Keep `package.json` version in step if the project uses it.

## Step 3: Pre-build checks

1. `npx eslint . --ext .js,.jsx,.ts,.tsx` — no errors.
2. `npm audit` — no high/moderate (report if any).
3. Optional: run unit tests.

## Step 4: Build

1. Run `pbiviz package`.
2. If `--audit`, also run `pbiviz package --certification-audit` to flag unsafe `fetch`/`XHR`/`eval`.
3. Confirm `dist/<name>.pbiviz` was written.

## Step 5: Verify the package

Tell the user to import `dist/<name>.pbiviz` via **Visualizations ▸ … ▸ Import a visual from a file** and smoke-test it, then summarize the version and output path.

## Guidelines

- Bump the version on every package or imports may use a stale cached build.
- Don't change/remove capabilities objects that existing reports rely on.
- For certification, prefer `--audit` and resolve findings before submitting (see `/pbiviz-certify`).
