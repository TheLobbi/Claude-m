# Testing, linting, debugging, and security

## Live debugging with the Developer Visual

```bash
pbiviz start
```

This serves the visual over HTTPS at `https://localhost:8080/assets` with hot reload. In a report (developer mode enabled), add the **Developer Visual** (dashed-square icon), bind fields, and edit `src/visual.ts` — saves reload automatically.

Debug tips:

- Open the browser dev tools (F12). The visual runs in an `iframe`; use the frame selector to scope the console.
- `console.log` works during development, but **must not throw or leave errors** for any input data (a certification requirement).
- Toggle the **Show dataview** tab in the Developer Visual to inspect the exact `DataView` shape the host delivers.
- If the visual is blank: check `visualClassName` matches the class, the dev cert is trusted, and `pbiviz start` is running.

## ESLint (required for certification)

Certification requires `eslint`, `eslint-plugin-powerbi-visuals`, and `typescript` in `package.json`, plus a lint script:

```json
"scripts": { "eslint": "npx eslint . --ext .js,.jsx,.ts,.tsx" }
```

`.eslintrc.json`:

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["powerbi-visuals"],
  "extends": ["plugin:powerbi-visuals/recommended"]
}
```

The plugin flags the patterns certification forbids (external access, unsafe DOM, `eval`, etc.). `npx eslint . --ext .js,.jsx,.ts,.tsx` must return **no errors**.

## Unit testing (jasmine + karma)

Power BI visuals are tested in a real browser (Chromium headless) with **karma** + **jasmine**, using `powerbi-visuals-utils-testutils` for a mock host, a `VisualBuilder`, and sample `DataView`s.

```typescript
import { VisualBuilder } from "./visualBuilder";
import { sampleData } from "./sampleData";

describe("BarChart", () => {
    let visualBuilder: VisualBuilder;
    beforeEach(() => { visualBuilder = new VisualBuilder(500, 500); });

    it("renders one bar per category", (done) => {
        visualBuilder.updateRenderTimeout(sampleData, () => {
            expect(visualBuilder.bars.length).toBe(sampleData.categorical.categories[0].values.length);
            done();
        });
    });
});
```

`utils-testutils` provides `testDataViewBuilder` to construct `DataView`s from raw arrays, and helpers to simulate clicks/selection so you can assert cross-filter behavior. Run with `karma start`.

Aim for coverage of: data parsing (each mapping you declared), empty/null data views, the formatting-model defaults, and selection.

## Security rules (enforced at certification)

These cause certification rejection — and most are also just good practice:

- **No external access** for certified visuals — no `fetch`, `XMLHttpRequest`, or `WebSocket`; `WebAccess` privilege must be empty/omitted.
- **Safe DOM only** — never `innerHTML`, `outerHTML`, or `D3.html()` with user data/input. Use `textContent`, `d3 .text()`, or sanitize first.
- **No dynamic code** — no `eval()`, `new Function()`, or user input passed to `setTimeout`/`setInterval`/`requestAnimationFrame`.
- **No console errors/exceptions** for any input data.
- **No minified** source or libraries; OSS-only, reviewable dependencies.
- **`npm audit`** must report no high/moderate vulnerabilities.

Audit for unsafe calls with the toolchain (tools 6.1+):

```bash
pbiviz package --certification-audit
pbiviz package --certification-fix    # auto-strip forbidden calls from third-party libs only
```

`--certification-fix` is for forbidden calls inside libraries you don't control; if the offending code is yours, remove it. Re-test thoroughly afterward and keep `npm run package` in sync to avoid a package-hash mismatch during review.

## Pre-package / pre-submit checklist

- `npm install` — clean.
- `npx eslint . --ext .js,.jsx,.ts,.tsx` — no errors.
- `npm audit` — no high/moderate.
- `karma start` (unit tests) — green.
- `pbiviz package` — succeeds; `pbiviz package --certification-audit` — clean.
- No `console` errors in the Developer Visual across empty/partial/large data.
