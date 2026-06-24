# Example: end-to-end walkthrough

From an empty folder to a certified-ready `.pbiviz`.

## 0. Prerequisites (once)

```bash
npm i -g powerbi-visuals-tools@latest   # provides `pbiviz`
pbiviz --install-cert                    # trust the local dev SSL cert
pbiviz                                   # verify install (prints commands)
```

Enable developer mode: Power BI Desktop (*File ▸ Options ▸ Report settings ▸ Develop a visual*, per session) or the service (*Developer settings ▸ Power BI Developer mode*).

## 1. Scaffold

```bash
pbiviz new salesBarChart
cd salesBarChart
npm install
```

This creates `pbiviz.json`, `capabilities.json`, `src/visual.ts`, `src/settings.ts`, `style/visual.less`, `assets/icon.png`, `tsconfig.json`, `package.json`, `.eslintrc`.

## 2. Define the data + format contract

Edit `capabilities.json` — declare `dataRoles` (a `category` grouping + a `measure`), a `categorical` `dataViewMappings` with a `conditions` cap, the `objects` for the Format pane, and `"privileges": []`. Use the categorical example in `capabilities-json.md`.

## 3. Build the formatting model

Replace `src/settings.ts` with a `VisualFormattingSettingsModel` whose card/slice names match the capabilities objects/properties. Use `formatting-settings.md`.

## 4. Implement the visual

Replace `src/visual.ts` with the `IVisual` implementation — parse the categorical DataView, render with D3, wrap `update` in the Rendering Events API, wire selection + tooltips, and return `getFormattingModel()`. Use `visual-ts-barchart.md`.

## 5. Run and iterate

```bash
pbiviz start
```

In a report with developer mode on, add the **Developer Visual** (dashed-square icon), drag a text field into **Category** and a numeric field into **Measure**. Edit `src/visual.ts` and save — it hot-reloads. Use the Developer Visual's **Show dataview** tab to inspect the exact `DataView`.

Sanity checks while iterating:

- Bars render one per category; resizing reflows; clearing the fields shows the landing page.
- Clicking a bar cross-filters other visuals; Ctrl-click multi-selects; clicking the canvas clears.
- The Format pane shows your cards; toggling them changes the render.
- The browser console is **clean** for empty, partial, and large data.

## 6. Lint, audit, test

```bash
npx eslint . --ext .js,.jsx,.ts,.tsx     # no errors
npm audit                                 # no high/moderate
karma start                               # unit tests green (optional but recommended)
```

## 7. Fill metadata and package

In `pbiviz.json`: set `displayName`, `description` (required), `supportUrl`, `gitHubUrl`, `author.name`/`email`, bump the four-part `version`, and replace `assets/icon.png` with a 20×20 PNG.

```bash
pbiviz package                            # → dist/salesBarChart.pbiviz
pbiviz package --certification-audit      # check for unsafe fetch/XHR/eval (tools 6.1+)
```

Import `dist/salesBarChart.pbiviz` via **Visualizations ▸ … ▸ Import a visual from a file** to verify the packaged build.

## 8. Publish / certify (optional)

1. Push the source to GitHub; create a lowercase **`certification`** branch matching the package.
2. Add `node_modules`, `.tmp`, `dist` to `.gitignore` (don't commit them).
3. In **Partner Center**, create a Power BI visual offer, upload the `.pbiviz`, and submit for AppSource.
4. To certify: on the offer's Product setup, check **Request Power BI certification** and provide the source link + access in the notes. See `packaging-certification.md`.

## Iterate later

- Bump `pbiviz.json` `version` before each `pbiviz package`.
- Don't rename/remove `capabilities.json` objects authors already use — it breaks existing reports.
- Keep the `certification` branch in sync with each resubmission.
