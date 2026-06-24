# Example: a complete `visual.ts` (D3 bar chart)

A categorical bar chart implementing the full modern stack: `IVisual` lifecycle, DataView parsing, the formatting model (API 5.1+), selection/cross-filter, tooltips, the color palette, and the Rendering Events API. Pair it with `capabilities-json.md` (the categorical example) and `formatting-settings.md`.

```typescript
"use strict";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import * as d3 from "d3";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;
import DataView = powerbi.DataView;
import PrimitiveValue = powerbi.PrimitiveValue;
import IColorPalette = powerbi.extensibility.IColorPalette;
import ITooltipService = powerbi.extensibility.ITooltipService;

interface BarDatum {
    category: string;
    value: number;
    color: string;
    selectionId: ISelectionId;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private barsGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    private selectionManager: ISelectionManager;
    private colorPalette: IColorPalette;
    private tooltipService: ITooltipService;
    private formattingSettingsService: FormattingSettingsService;
    private settings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.colorPalette = options.host.colorPalette;
        this.tooltipService = options.host.tooltipService;
        this.selectionManager = options.host.createSelectionManager();

        const localization = options.host.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService(localization);

        this.svg = d3.select(options.element).append("svg").classed("barChart", true);
        this.barsGroup = this.svg.append("g").classed("bars", true);

        // clear selection when the empty canvas is clicked
        this.svg.on("click", () => {
            this.selectionManager.clear().then(() => this.syncSelection([]));
        });
        // context menu on empty canvas
        this.svg.on("contextmenu", (event: MouseEvent) => {
            this.selectionManager.showContextMenu({}, { x: event.clientX, y: event.clientY });
            event.preventDefault();
        });
        // restore styling when bookmarks/host change the selection
        this.selectionManager.registerOnSelectCallback((ids: ISelectionId[]) => this.syncSelection(ids));
    }

    public update(options: VisualUpdateOptions): void {
        this.host.eventService.renderingStarted(options);
        try {
            this.settings = this.formattingSettingsService.populateFormattingSettingsModel(
                VisualFormattingSettingsModel, options.dataViews);

            const data = this.transform(options.dataViews && options.dataViews[0]);
            const { width, height } = options.viewport;
            this.svg.attr("width", width).attr("height", height);

            if (!data.length) {
                this.barsGroup.selectAll("rect").remove();
                this.host.eventService.renderingFinished(options);
                return;
            }

            const x = d3.scaleBand<string>()
                .domain(data.map(d => d.category))
                .range([0, width]).padding(0.2);
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.value) ?? 0]).nice()
                .range([height, 0]);

            const selectedIds = this.selectionManager.getSelectionIds() as ISelectionId[];

            const bars = this.barsGroup.selectAll<SVGRectElement, BarDatum>("rect").data(data, d => d.category);
            bars.enter().append("rect")
              .merge(bars)
                .attr("x", d => x(d.category)!)
                .attr("width", x.bandwidth())
                .attr("y", d => y(d.value))
                .attr("height", d => height - y(d.value))
                .attr("fill", d => d.color)
                .style("fill-opacity", d => this.opacityFor(d, selectedIds))
                .on("click", (event: MouseEvent, d) => {
                    const multi = event.ctrlKey || event.metaKey;
                    this.selectionManager.select(d.selectionId, multi)
                        .then((ids) => this.syncSelection(ids as ISelectionId[]));
                    event.stopPropagation();
                })
                .on("contextmenu", (event: MouseEvent, d) => {
                    this.selectionManager.showContextMenu(d.selectionId, { x: event.clientX, y: event.clientY });
                    event.preventDefault();
                    event.stopPropagation();
                })
                .on("mousemove", (event: MouseEvent, d) => {
                    this.tooltipService.show({
                        coordinates: [event.clientX, event.clientY],
                        isTouchEvent: false,
                        dataItems: [{ displayName: d.category, value: d.value.toString() }],
                        identities: [d.selectionId],
                    });
                })
                .on("mouseout", () => this.tooltipService.hide({ immediately: true, isTouchEvent: false }));
            bars.exit().remove();

            this.host.eventService.renderingFinished(options);
        } catch (e) {
            this.host.eventService.renderingFailed(options, (e as Error).message);
        }
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.settings);
    }

    private transform(dataView: DataView): BarDatum[] {
        const cat = dataView && dataView.categorical;
        if (!cat || !cat.categories || !cat.categories[0] || !cat.values || !cat.values[0]) {
            return [];
        }
        const categoryColumn = cat.categories[0];
        const measureColumn = cat.values[0];
        const categories: PrimitiveValue[] = categoryColumn.values;
        const defaultColor = this.settings?.dataColors?.defaultColor?.value?.value;

        return categories.map((c, i) => {
            const category = c == null ? "" : c.toString();
            return {
                category,
                value: Number(measureColumn.values[i]) || 0,
                color: defaultColor ?? this.colorPalette.getColor(category).value,
                selectionId: this.host.createSelectionIdBuilder()
                    .withCategory(categoryColumn, i)
                    .createSelectionId(),
            };
        });
    }

    private opacityFor(d: BarDatum, selected: ISelectionId[]): number {
        if (!selected.length) return 1;
        return selected.some(s => s.equals(d.selectionId)) ? 1 : 0.3;
    }

    private syncSelection(selected: ISelectionId[]): void {
        this.barsGroup.selectAll<SVGRectElement, BarDatum>("rect")
            .style("fill-opacity", d => this.opacityFor(d, selected));
    }

    public destroy(): void {
        // optional: Power BI usually just removes the iframe
    }
}
```

## Notes

- **Rendering Events** wrap `update` so export-to-PDF/PowerPoint and report-page tooltips work and certification passes.
- **Selection** uses `withCategory`; canvas click clears, Ctrl/Cmd-click multi-selects, and `syncSelection` dims unselected bars (also restored on bookmark via `registerOnSelectCallback`).
- **Color** comes from the Format pane (`dataColors.defaultColor`) and falls back to the theme-aware `colorPalette` so it respects report themes.
- **Null-guarding** in `transform` returns `[]` when field wells are empty — pair with a landing page (`supportsLandingPage`/`supportsEmptyDataView`) for guidance UI.
- `style/visual.less` should at minimum size the SVG, e.g. `.barChart { display: block; }`.
