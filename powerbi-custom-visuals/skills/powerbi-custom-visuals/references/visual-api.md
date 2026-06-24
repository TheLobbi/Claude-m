# The IVisual API

Every visual is a single class that implements `IVisual`. The class name must equal `visualClassName` in `pbiviz.json`.

```typescript
"use strict";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;
        // one-time setup: create root SVG/DOM, services, event listeners
    }

    public update(options: VisualUpdateOptions): void {
        // called on every data / size / view-mode / style change — re-render here
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        // build and return the Format pane model (see formatting-model.md)
    }

    public destroy(): void {
        // optional cleanup (Power BI usually just drops the iframe)
    }
}
```

## Lifecycle methods

| Method | When | Use for |
|--------|------|---------|
| `constructor(options)` | Once, at instantiation | Capture `element` + `host`; create root DOM, selection manager, services, listeners |
| `update(options)` | Every data/host change | Read the `DataView`, compute layout from `viewport`, (re)render |
| `getFormattingModel()` | Opening/editing the Format pane | Return the Format pane model (replaces `enumerateObjectInstances`) |
| `destroy()` | On unload (not guaranteed) | Remove listeners/timers; do not rely on it being called |

## VisualConstructorOptions

- `element: HTMLElement` — the DOM node that contains your visual. Append your root SVG/canvas/div here.
- `host: IVisualHost` — services and metadata for talking to Power BI.

### IVisualHost services (the ones you actually use)

| Service / property | Purpose |
|--------------------|---------|
| `createSelectionManager()` | Create the `ISelectionManager` for selection/cross-filter/context menu |
| `createSelectionIdBuilder()` | Build an `ISelectionId` per data point |
| `colorPalette` | Theme-aware colors (`getColor(key).value`); respects report theme |
| `tooltipService` | Show/move/hide tooltips |
| `eventService` | Rendering Events API (`renderingStarted/Finished/Failed`) |
| `createLocalizationManager()` | Localized strings; pass into `FormattingSettingsService` |
| `persistProperties(changes)` | Persist property values into the report (saved with the visual) |
| `applyJsonFilter(...)` | Apply Basic/Advanced/Tuple/Identity filters to other visuals |
| `applyCustomSort(args)` | Trigger custom sort |
| `fetchMoreData(aggregateSegments?)` | Page beyond the data-reduction limit |
| `launchUrl(url)` | Open a URL in a new tab (https only) |
| `storageService` / `storageV2Service` | Local storage (requires the `LocalStorage` privilege) |
| `downloadService` | Export content to file (requires `ExportContent`) |
| `displayWarningIcon(hover, detailed)` | Show a warning badge on the visual header |
| `licenseManager` | Query the user's license for paid visuals |
| `acquireAADTokenService` / `authenticationService` | Microsoft Entra ID token for backed services |
| `colorPalette.isHighContrast` | Detect high-contrast mode for accessibility |
| `locale` | Current locale string |
| `instanceId` | Identify this visual instance |

## VisualUpdateOptions

| Property | Meaning |
|----------|---------|
| `viewport: IViewport` | `{ width, height }` the visual must render within |
| `dataViews: DataView[]` | The data; usually read `dataViews[0]` |
| `type: VisualUpdateType` | Bitflags: `Data` `\|` `Resize` `\|` `ViewMode` `\|` `Style` `\|` `ResizeEnd` |
| `viewMode: ViewMode` | `View` `\|` `Edit` `\|` `InFocusEdit` |
| `editMode: EditMode` | `Default` `\|` `Advanced` (render advanced UI only when `Advanced`) |
| `operationKind?` | `Create` (fresh) or `Append` (a `fetchMoreData` segment) |
| `jsonFilters?` | Filters currently applied |
| `isInFocus?` | Whether the visual is in focus mode |

Use `options.type` to skip expensive work — e.g. only recompute scales on `Data`/`ResizeEnd`, not every `Resize` tick.

```typescript
import VisualUpdateType = powerbi.VisualUpdateType;
const dataChanged = (options.type & VisualUpdateType.Data) !== 0;
```

## Rendering Events API (required for certification)

Signal render progress so "Export to PDF/PowerPoint", report-page tooltips, and automated tests know when the visual is done.

```typescript
public update(options: VisualUpdateOptions): void {
    this.host.eventService.renderingStarted(options);
    try {
        // ... draw the visual ...
        this.host.eventService.renderingFinished(options);
    } catch (e) {
        this.host.eventService.renderingFailed(options, (e as Error).message);
    }
}
```

For asynchronous rendering, call `renderingFinished` only after the final frame is committed to the DOM.

## fetchMoreData paging

```typescript
public update(options: VisualUpdateOptions): void {
    if (options.operationKind === powerbi.VisualDataChangeOperationKind.Create) {
        this.rows = [];                       // new query — reset
    }
    this.rows.push(...this.readRows(options.dataViews[0]));
    const more = this.host.fetchMoreData(true); // true = aggregate segments
    if (!more) {
        this.render();                        // no more pages — draw
    }
}
```

Pair with a `window` data-reduction algorithm in `capabilities.json`.

## colorPalette and themes

```typescript
const palette = this.host.colorPalette;
const color = palette.getColor(category.toString()).value; // stable per key, theme-aware
if (palette.isHighContrast) {
    // use palette.foreground / background / foregroundSelected for accessibility
}
```
