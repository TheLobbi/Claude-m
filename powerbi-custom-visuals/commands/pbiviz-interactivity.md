---
name: pbiviz-interactivity
description: Add interactivity to a custom visual — selection and cross-filtering, highlighting, tooltips, context menu, drill-down, bookmarks, landing page, or launchUrl.
argument-hint: "[--feature selection|highlight|tooltips|contextmenu|drilldown|bookmarks|landingpage|launchurl|localstorage]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Add interactivity

Implement the requested interaction features against the host services.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/interactivity.md`.

## Step 1: Identify the feature(s)

Resolve `--feature` (or infer from the request). Read `src/visual.ts` and `capabilities.json` first.

## Step 2: Implement

Apply the matching pattern:
- **selection** — create `ISelectionManager` in the constructor; build per-point `ISelectionId` with the correct builder; `select(id, multiSelect)` on click; clear on canvas click; dim unselected points; restore via `registerOnSelectCallback`.
- **highlight** — set `supportsHighlight: true`; render the `values[i].highlights` array dimmed-vs-solid.
- **tooltips** — declare `tooltips` in capabilities; use `host.tooltipService.show/move/hide` on pointer events (add a `tooltips` role for canvas tooltips).
- **contextmenu** — `selectionManager.showContextMenu(id, {x,y}, dataRole?)` on `contextmenu` (pass the role if drilldown/expandCollapse is supported).
- **drilldown** — `drilldown.roles` in capabilities; for matrix, add `expandCollapse` and `toggleExpandCollapse`.
- **bookmarks** — restore selection in `registerOnSelectCallback`; persist visual state with `persistProperties`.
- **landingpage** — `supportsLandingPage` + `supportsEmptyDataView`; render guidance when no data is bound.
- **launchurl** — `host.launchUrl(httpsUrl)`.
- **localstorage** — add the `LocalStorage` privilege; use `storageV2Service`/`storageService`.

## Step 3: Update capabilities

Add any required flags/roles/privileges the feature needs, keeping object names in sync with the code.

## Step 4: Verify

1. Type-check / `pbiviz start`.
2. Manually confirm: clicking cross-filters; Ctrl-click multi-selects; canvas click clears; tooltips/context menu/drill behave; bookmarks restore state.

## Guidelines

- Match selection builders to the data mapping.
- Sanitize any user data before touching the DOM; never use `innerHTML` with user input.
- `launchUrl` accepts https only; `WebAccess`/`LocalStorage` need privileges (and `WebAccess` blocks certification).
