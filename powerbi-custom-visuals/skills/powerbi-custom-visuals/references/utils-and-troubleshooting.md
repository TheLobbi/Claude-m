# Utility packages and troubleshooting

## powerbi-visuals-api

The typed API surface (`import powerbi from "powerbi-visuals-api"`). Provides `IVisual`, `VisualConstructorOptions`, `VisualUpdateOptions`, `DataView*`, `ISelectionManager`, formatting model interfaces (`powerbi.visuals.FormattingModel`), and enums. Pin it to a version that matches the `apiVersion` in `pbiviz.json`. It is a **type-only / dev dependency** — the host supplies the runtime implementation.

## Official utility packages

Reuse these instead of hand-rolling chart plumbing:

| Package | Provides |
|---------|----------|
| `powerbi-visuals-utils-formattingmodel` | `FormattingSettingsService`, cards/groups/slices — **the recommended Format pane builder** |
| `powerbi-visuals-utils-dataviewutils` | DataView parsing helpers, `dataViewWildcard` and selector helpers for conditional formatting |
| `powerbi-visuals-utils-formattingutils` | Number/date value formatting (`valueFormatter`), text measurement/truncation (`textMeasurementService`) |
| `powerbi-visuals-utils-svgutils` | SVG helpers: `manipulation` (translate/transform), shapes, `CssConstants` |
| `powerbi-visuals-utils-chartutils` | Axis helpers, legend, label layout, data-label utilities |
| `powerbi-visuals-utils-colorutils` | Color parsing/conversion helpers |
| `powerbi-visuals-utils-interactivityutils` | `interactivityService`/`behavior` pattern for selection + highlight |
| `powerbi-visuals-utils-tooltiputils` | `createTooltipServiceWrapper` for binding tooltips to D3 selections |
| `powerbi-visuals-utils-typeutils` | Type helpers (`pixelConverter`, `double`, prototype helpers) |
| `powerbi-visuals-utils-testutils` | Mock host, `VisualBuilder`, `testDataViewBuilder` for unit tests |

Typical formatting + text-measurement usage:

```typescript
import { valueFormatter, textMeasurementService } from "powerbi-visuals-utils-formattingutils";

const fmt = valueFormatter.create({ format: measureColumn.source.format });
const label = fmt.format(value);
const width = textMeasurementService.measureSvgTextWidth({ text: label, fontFamily: "Segoe UI", fontSize: "12px" });
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Developer Visual is blank | `visualClassName` ≠ class name; dev cert untrusted; `pbiviz start` not running | Align names; `pbiviz --install-cert`; restart `pbiviz start` |
| "Can't reach localhost:8080" | Dev server down or cert not trusted | Run `pbiviz start`; trust the cert; restart the browser |
| `dataViews[0]` is `undefined`/empty | Required field wells not filled, or mapping `conditions` not met | Add a landing page; check `conditions` cardinality matches the dropped fields |
| Mapping data is `null` | That mapping type isn't declared in `dataViewMappings` | Declare the mapping you read (`categorical`/`table`/`matrix`/`single`) |
| Format pane card missing / errors | Card/slice `name` ≠ capabilities object/property name, or type mismatch | Make names and types match exactly between `settings.ts` and `capabilities.json` |
| `enumerateObjectInstances` not called | API 5.1+ ignores it | Implement `getFormattingModel` instead |
| `pbiviz package` fails | `description`/`author` missing, or 3-part version | Fill `pbiviz.json` metadata; use a four-part `version` |
| Only ~1000 rows arrive | Default `top` reduction = 1000 | Raise `dataReductionAlgorithm.count` (≤30000) and/or page with `fetchMoreData` |
| Selection doesn't cross-filter | Selection ids built with the wrong builder for the mapping | Use `withCategory`/`withSeries`/`withTable`/`withMatrixNode` to match the mapping |
| Export to PDF/PowerPoint cuts off | Rendering Events API not called | Call `renderingStarted`/`renderingFinished` around `update` |
| Certification rejected | External calls, unsafe DOM, console errors, minified code, missing `certification` branch | See `packaging-certification.md`; run `pbiviz package --certification-audit` |
| `npm audit` blocks certification | Vulnerable transitive deps | Update deps until no high/moderate findings |
| High-contrast mode looks wrong | Not honoring the palette | Use `colorPalette.isHighContrast` + `foreground`/`background` colors |

## Where to look in the source

- API interfaces: `microsoft/powerbi-visuals-api` (`src/visuals-api.d.ts`, `formatting-model-api.d.ts`, `schema.capabilities.json`).
- Reference implementation: `microsoft/PowerBI-visuals-sampleBarChart` (`barChartTutorial` branch) — API 5.1, `getFormattingModel`, selection, tooltips, conditional formatting.
- Tools: `microsoft/powerbi-visuals-tools` (the `pbiviz` CLI).
