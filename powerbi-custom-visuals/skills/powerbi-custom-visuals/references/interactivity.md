# Interactivity

Power BI visuals interact with the rest of the report through **selection** (cross-filter/cross-highlight) and **filters**. This reference covers selection, highlighting, tooltips, context menus, drill-down, bookmarks, landing pages, `launchUrl`, and local storage.

## Selection and cross-filtering

Selecting a data point notifies the host, which cross-filters the other visuals on the page.

```typescript
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;

constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.selectionManager = this.host.createSelectionManager();
    // re-render selection styling when the host clears selection (e.g. clicking blank canvas)
    this.selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => this.syncSelectionStyles(ids));
}
```

### Build a selection id per data point

Use the matching builder method for your mapping (see `dataview-mapping.md`):

| Mapping | Builder call |
|---------|--------------|
| Categorical category | `.withCategory(categoryColumn, index)` |
| Categorical series | `.withSeries(values, group)` |
| Measure | `.withMeasure(measureQueryName)` |
| Table row | `.withTable(table, rowIndex)` |
| Matrix node | `.withMatrixNode(node, levels)` |

```typescript
const selectionId = this.host.createSelectionIdBuilder()
    .withCategory(categoryColumn, i)
    .createSelectionId();
```

### Apply selection on click (with multi-select)

```typescript
rect.on("click", (event: MouseEvent, d) => {
    const multi = event.ctrlKey || event.metaKey;       // Ctrl/Cmd = add to selection
    this.selectionManager.select(d.selectionId, multi).then((ids) => {
        this.syncSelectionStyles(ids);                  // dim unselected points
    });
    event.stopPropagation();
});

// clear selection when the empty canvas is clicked
this.svg.on("click", () => this.selectionManager.clear().then(() => this.syncSelectionStyles([])));
```

`select(id | id[], multiSelect?)` returns a promise of the active ids. With `multiSelect: true` the previous selection is preserved.

## Highlighting (cross-highlight)

Set `"supportsHighlight": true` in `capabilities.json`. When another visual cross-highlights yours, each value column carries a parallel `highlights` array; render the highlighted portion solid and the rest dimmed.

```typescript
const value = measureColumn.values[i] as number;
const highlight = measureColumn.highlights ? (measureColumn.highlights[i] as number) : value;
// draw full bar at `value` (dimmed) and an overlay bar at `highlight` (solid)
```

## Tooltips

Declare `"tooltips"` in capabilities and use `host.tooltipService` (or `powerbi-visuals-utils-tooltiputils`).

```typescript
this.tooltipService = options.host.tooltipService;

rect.on("mousemove", (event: MouseEvent, d) => {
    this.tooltipService.show({
        coordinates: [event.clientX, event.clientY],
        isTouchEvent: false,
        dataItems: [{ displayName: d.category, value: d.value.toString() }],
        identities: [d.selectionId],
    });
});
rect.on("mouseout", () => this.tooltipService.hide({ immediately: true, isTouchEvent: false }));
```

For **report-page (canvas) tooltips**, declare `supportedTypes.canvas` and add a `tooltips` data role so authors can bind a tooltip page.

## Context menu

```typescript
this.svg.on("contextmenu", (event: MouseEvent, d) => {
    this.selectionManager.showContextMenu(d ? d.selectionId : {}, { x: event.clientX, y: event.clientY });
    event.preventDefault();
});
```

> If the visual supports `drilldown` or `expandCollapse`, pass the data-role name as the third argument: `showContextMenu(id, point, "category")`. Otherwise the host logs an error.

## Drill-down

Declare `"drilldown": { "roles": ["category"] }`. Power BI adds drill controls to the visual header; on drill, the next `update` delivers a deeper level of the hierarchy in the `DataView`. For matrix visuals, pair with `expandCollapse` and `selectionManager.toggleExpandCollapse(nodeId, entireLevel?)`.

## Bookmarks and report-state persistence

To restore selection when a bookmark is applied:

```typescript
this.selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => {
    this.syncSelectionStyles(ids);   // called when a bookmark changes the selection
});
```

Persist *visual* state (not selection) with `host.persistProperties({ merge: [ ... ] })`, which writes property values back into the report definition so they survive reloads and bookmarks.

## Landing page

Show guidance when no data is bound:

```json
"supportsLandingPage": true,
"supportsEmptyDataView": true
```

```typescript
public update(options: VisualUpdateOptions): void {
    const hasData = !!options.dataViews?.[0]?.categorical?.values;
    if (!hasData) { this.showLandingPage(); return; }
    this.hideLandingPage();
    // ...render...
}
```

## launchUrl

Open external links safely in a new tab (https only; relative/`javascript:` URLs are rejected):

```typescript
this.host.launchUrl("https://learn.microsoft.com/power-bi/developer/visuals/");
```

## Local storage

Requires the `LocalStorage` privilege in `capabilities.json`.

```typescript
const storage = this.host.storageV2Service ?? this.host.storageService;
await storage.set("lastView", JSON.stringify(state));
const raw = await storage.get("lastView");
```

## Accessibility

- Respect `host.colorPalette.isHighContrast` and use `foreground`/`background`/`foregroundSelected`.
- Set `"supportsKeyboardFocus": true` and make data points focusable (`tabindex`) and operable via Enter/Space.
- Provide `aria-label`/`role` on interactive SVG/DOM nodes.
