# Deneb spec examples (Vega-Lite & Vega)

Copy-paste specifications for the **Deneb** custom visual. All reference the Power BI dataset by its Deneb name **`dataset`** and use Deneb's Power BI expression functions (`pbiColor`, `pbiFormat`, `pbiPatternSVG`) and the `__selected__` cross-filter field. Drag the named fields into Deneb's **Values** data role; rename to match your columns. Background on every identifier here is in `references/deneb-vega.md`.

---

## 1. Vega-Lite — responsive bar chart with cross-filtering

A bar chart that fills the visual, dims unselected bars, uses the report theme color, and formats the tooltip with a Power BI format string. Requires **cross-filtering enabled** (Settings ▸ Expose cross-filtering values).

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": "container",
  "autosize": { "type": "fit", "contains": "padding" },
  "data": { "name": "dataset" },
  "mark": { "type": "bar", "cornerRadiusEnd": 2, "tooltip": true },
  "encoding": {
    "x": { "field": "Category", "type": "nominal", "axis": { "labelAngle": 0 }, "sort": "-y" },
    "y": { "field": "Sales", "type": "quantitative", "axis": { "title": null } },
    "color": { "value": { "expr": "pbiColor(0)" } },
    "opacity": {
      "condition": { "test": "datum.__selected__ == 'off'", "value": 0.3 },
      "value": 1
    },
    "tooltip": [
      { "field": "Category", "type": "nominal", "title": "Category" },
      { "field": "Sales", "type": "quantitative", "title": "Sales",
        "format": "$#,0", "formatType": "pbiFormat" }
    ]
  }
}
```

> `formatType: "pbiFormat"` makes the tooltip use Power BI format strings + the model locale. Drop it to fall back to D3 formats.

---

## 2. Vega-Lite — line chart with a rolling mean overlay

Layered chart: raw line plus a 7-point moving average computed with a window transform.

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": "container",
  "data": { "name": "dataset" },
  "transform": [
    { "window": [{ "op": "mean", "field": "Sales", "as": "RollingMean" }],
      "frame": [-3, 3], "sort": [{ "field": "Date" }] }
  ],
  "encoding": { "x": { "field": "Date", "type": "temporal", "axis": { "title": null } } },
  "layer": [
    { "mark": { "type": "line", "opacity": 0.4, "color": { "expr": "pbiColor(0)" } },
      "encoding": { "y": { "field": "Sales", "type": "quantitative" } } },
    { "mark": { "type": "line", "strokeWidth": 3, "color": { "expr": "pbiColor(1)" } },
      "encoding": { "y": { "field": "RollingMean", "type": "quantitative", "title": "Sales" } } }
  ]
}
```

---

## 3. Vega-Lite — bullet chart (not in the Power BI core set)

Actual vs target with qualitative bands — a common "why Deneb" chart. Bind `Measure`, `Target`, and band fields, or hard-code bands in a `datum`.

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 60,
  "data": { "name": "dataset" },
  "encoding": { "x": { "type": "quantitative", "scale": { "nice": false }, "title": null } },
  "layer": [
    { "mark": { "type": "bar", "color": "#eee", "size": 28 },
      "encoding": { "x": { "field": "Range3" } } },
    { "mark": { "type": "bar", "color": "#ddd", "size": 28 },
      "encoding": { "x": { "field": "Range2" } } },
    { "mark": { "type": "bar", "color": "#ccc", "size": 28 },
      "encoding": { "x": { "field": "Range1" } } },
    { "mark": { "type": "bar", "color": { "expr": "pbiColor(0)" }, "size": 10 },
      "encoding": { "x": { "field": "Measure" } } },
    { "mark": { "type": "tick", "color": "#333", "thickness": 2, "size": 36 },
      "encoding": { "x": { "field": "Target" } } }
  ]
}
```

---

## 4. Vega-Lite — pattern fill on selected marks (accessibility)

Encode the selection with **texture** (not just opacity), using `pbiPatternSVG`. Render mode must be **SVG** for pattern fills.

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": "container",
  "data": { "name": "dataset" },
  "mark": { "type": "bar", "tooltip": true },
  "encoding": {
    "x": { "field": "Category", "type": "nominal" },
    "y": { "field": "Sales", "type": "quantitative" },
    "fill": {
      "condition": {
        "test": "datum.__selected__ == 'on'",
        "value": { "expr": "pbiPatternSVG('diagonal-stripe-6', pbiColor(0), '#ffffff')" }
      },
      "value": { "expr": "pbiColor(0)" }
    }
  }
}
```

---

## 5. Vega — advanced cross-filter (brush / aggregate marks)

Pure **Vega** with manual selection management (Settings ▸ cross-filtering ▸ **Advanced**). Clicking a `data-point` mark applies a filter on `Product`; clicking empty space clears. Uses the reserved `pbiCrossFilterSelection` signal and the `_{Product}_` placeholder.

```json
{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "width": "container",
  "height": "container",
  "data": [{ "name": "dataset" }],
  "signals": [
    {
      "name": "pbiCrossFilterSelection",
      "value": [],
      "on": [
        {
          "events": { "source": "scope", "type": "mouseup", "markname": "data-point" },
          "update": "pbiCrossFilterApply(event, \"datum['Product'] == _{Product}_\")"
        },
        {
          "events": { "source": "view", "type": "mouseup",
            "filter": ["!event.item || event.item.mark.name != 'data-point'"] },
          "update": "pbiCrossFilterClear()"
        }
      ]
    }
  ],
  "scales": [
    { "name": "x", "type": "band", "domain": { "data": "dataset", "field": "Product" },
      "range": "width", "padding": 0.1 },
    { "name": "y", "type": "linear", "nice": true, "zero": true, "range": "height",
      "domain": { "data": "dataset", "field": "Sales" } }
  ],
  "axes": [
    { "scale": "x", "orient": "bottom" },
    { "scale": "y", "orient": "left" }
  ],
  "marks": [
    {
      "name": "data-point",
      "type": "rect",
      "from": { "data": "dataset" },
      "encode": {
        "enter": {
          "x": { "scale": "x", "field": "Product" },
          "width": { "scale": "x", "band": 1 },
          "y": { "scale": "y", "field": "Sales" },
          "y2": { "scale": "y", "value": 0 }
        },
        "update": {
          "fill": { "signal": "pbiColor(0)" },
          "fillOpacity": { "signal": "datum.__selected__ == 'off' ? 0.3 : 1" },
          "cursor": { "value": "pointer" }
        }
      }
    }
  ]
}
```

---

## 6. Config object — apply the report theme to every spec

Paste into the Deneb **Config** pane (kept separate from the Specification) so all marks/axes inherit theme styling. `pbiColor` is not valid in static config `range` arrays, so list the palette or rely on per-encoding `pbiColor(...)`.

```json
{
  "background": null,
  "font": "Segoe UI",
  "axis": {
    "labelColor": "#605E5C",
    "titleColor": "#252423",
    "gridColor": "#E1DFDD",
    "domainColor": "#C8C6C4",
    "tickColor": "#C8C6C4"
  },
  "legend": { "labelColor": "#605E5C", "titleColor": "#252423" },
  "view": { "stroke": "transparent" },
  "range": {
    "category": ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7", "#744EC2"]
  }
}
```

---

## 7. Minimal template `usermeta` block

Wrap a finished spec with `usermeta` to make it an importable Deneb **template** (Deneb prompts the user to map fields to the `dataset` placeholders on import).

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "usermeta": {
    "information": {
      "name": "Themed Bar Chart",
      "description": "Responsive bar with cross-filtering and theme colors.",
      "author": "Your Name",
      "uuid": "00000000-0000-0000-0000-000000000000"
    },
    "deneb": { "build": "1.7.0", "metaVersion": 1 },
    "provider": "vegaLite",
    "dataset": [
      { "key": "__0__", "name": "Category", "description": "Discrete axis field", "type": "nominal", "kind": "column" },
      { "key": "__1__", "name": "Sales", "description": "Numeric measure", "type": "quantitative", "kind": "measure" }
    ]
  },
  "data": { "name": "dataset" },
  "mark": "bar",
  "encoding": {
    "x": { "field": "Category", "type": "nominal" },
    "y": { "field": "Sales", "type": "quantitative" }
  }
}
```

> Field names in the spec must match the `usermeta.dataset[].name` values; Deneb rewrites them to the user's chosen columns on import.
</content>
