# Packaging, publishing, and certification

## Package a `.pbiviz`

Before packaging, in `pbiviz.json`:

- Set `visual.displayName`, and fill `visual.description` (**required** — the command fails without it).
- Set `visual.supportUrl` and `visual.gitHubUrl`.
- Set `author.name` and `author.email`.
- Bump the four-part `visual.version` (`x.x.x.x`).
- Replace `assets/icon.png` with your 20×20 PNG.

Then:

```bash
pbiviz package
```

This writes `dist/<name>.pbiviz` (overwriting any previous build). That single file is everything needed to import the visual into Power BI Desktop or the service.

Import to test: **Visualizations pane ▸ … ▸ Import a visual from a file ▸ select the `.pbiviz`**.

## Distribution options

| Channel | How | Audience |
|---------|-----|----------|
| File import | Share the `.pbiviz`; import via *Import a visual from a file* | You / ad-hoc |
| Organizational store | Tenant admin uploads to the org visual store | Your tenant |
| AppSource (public) | Submit via Partner Center | Everyone |
| AppSource + certified | Submit, then request certification | Everyone (extra trust + features) |

## Publish to AppSource (Partner Center)

1. Create/register a **Partner Center** account and a Power BI visuals offer.
2. Upload the `.pbiviz`, add listing metadata (name, description, screenshots, sample report/`.pbix`, privacy + support links).
3. Submit for validation. A **new** visual is downloadable from the AppSource link within hours but takes ~10–14 days to reach Desktop/Service production; **updates** take up to ~2 weeks to roll out.

## Certification

Certification is **optional** and signals the visual was reviewed to not access external resources. Certified visuals gain features such as **export to PowerPoint/PDF** and **display in subscription emails**. R-visuals and visuals that need external services/commercial libraries **cannot** be certified.

### Requirements checklist

**General**

- Approved/published through Partner Center first (recommended before requesting certification).
- Complies with the [guidelines for Power BI visuals](https://learn.microsoft.com/power-bi/developer/visuals/guidelines-powerbi-visuals).
- Passes the required submission tests.
- The compiled package **exactly matches** the submitted source.
- Not an R-visual.

**Code repository**

- Repository reviewable by the Power BI team (GitHub recommended).
- Contains code for **only this one** visual.
- Has a lowercase branch named **`certification`** whose source matches the submitted package.
- Provides access to any private npm packages / git submodules used.

**Required files**

- `.gitignore` excluding `node_modules`, `.tmp`, `dist` (these folders must not be committed).
- `capabilities.json`, `pbiviz.json`, `package.json`, `package-lock.json`, `tsconfig.json`.
- `package.json` includes `typescript`, `eslint`, `eslint-plugin-powerbi-visuals`, and the lint command `npx eslint . --ext .js,.jsx,.ts,.tsx`.

**Commands must pass cleanly**

- `npm install`
- `pbiviz package`
- `npm audit` — no high/moderate warnings.
- ESLint (with `eslint-plugin-powerbi-visuals`) — no errors.

**Compiling**

- Use the latest `powerbi-visuals-tools` and the latest API.
- Build with `pbiviz package` (or a `npm run package` custom script). Audit with `pbiviz package --certification-audit`.

**Source code — required**

- OSS-only, publicly reviewable libraries (JS/TS).
- Implements the **Rendering Events API** (`renderingStarted/Finished/Failed`).
- Manipulates the DOM safely; sanitizes user input/data before insertion.

**Source code — not allowed**

- External network access (`fetch`, `XMLHttpRequest`, WebSocket) — `WebAccess` privileges must be empty/omitted.
- `innerHTML` / `D3.html(user data)`.
- Console errors/exceptions for any input data.
- Arbitrary/dynamic code: `eval()`, `Function()`, unsafe `setTimeout`/`setInterval`/`requestAnimationFrame` with user input.
- Minified JS files or projects.

### Submit for certification

In Partner Center, open the visual ▸ Product setup ▸ check **Request Power BI certification**, and on **Review and publish** provide a link to the source code and the credentials to access it.

For a **private repo**: create a dedicated account for the validation team, enable 2FA, generate recovery codes, and grant read-only access to **`pbicvsupport`**; supply the repo link, sign-in credentials, and recovery codes in the submission notes.

### After certification

- AppSource shows a yellow **PBI Certified** badge; the Power BI import dialog shows a blue badge and a **Power BI Certified** filter.
- The badge typically appears within ~3 weeks of approval.
- Microsoft may remove a visual from the certified list at its discretion.

## Versioning discipline

- Bump `pbiviz.json` `version` (four-part) on every package.
- For an update to a live visual, ensure `capabilities.json` changes don't break existing reports (don't rename/remove objects authors already use).
- Keep the `certification` branch == the submitted package; only update it during a resubmission.
