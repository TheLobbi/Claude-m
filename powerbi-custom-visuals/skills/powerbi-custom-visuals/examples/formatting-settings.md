# Example: `settings.ts` (formatting model)

Built with `powerbi-visuals-utils-formattingmodel`. Card `name` must equal the capabilities object name; slice `name` must equal the property name (see `capabilities-json.md`).

## Basic model — color + data labels

```typescript
"use strict";
import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/** Card → capabilities object "dataColors" */
class DataColorsCardSettings extends FormattingSettingsCard {
    defaultColor = new formattingSettings.ColorPicker({
        name: "defaultColor",                 // === capabilities property name
        displayName: "Default color",
        value: { value: "#118DFF" },
    });

    name: string = "dataColors";              // === capabilities object name
    displayName: string = "Data colors";
    slices: Array<FormattingSettingsSlice> = [this.defaultColor];
}

/** Card → capabilities object "dataLabels" */
class DataLabelsCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show", displayName: "Show", value: true,
    });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Text size", value: 12,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 60 },
        },
    });
    color = new formattingSettings.ColorPicker({
        name: "color", displayName: "Color", value: { value: "#252423" },
    });

    name: string = "dataLabels";
    displayName: string = "Data labels";
    // hide font/color slices when the toggle is off
    slices: Array<FormattingSettingsSlice> = [this.show, this.fontSize, this.color];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    dataColors = new DataColorsCardSettings();
    dataLabels = new DataLabelsCardSettings();
    cards = [this.dataColors, this.dataLabels];
}
```

Read it in `update`: `this.settings.dataLabels.show.value`, `this.settings.dataColors.defaultColor.value.value`.

## Dynamic visibility

Hide slices/groups/cards by flipping `visible` after populating the model:

```typescript
public update(options: VisualUpdateOptions): void {
    this.settings = this.formattingSettingsService.populateFormattingSettingsModel(
        VisualFormattingSettingsModel, options.dataViews);

    const on = this.settings.dataLabels.show.value;
    this.settings.dataLabels.fontSize.visible = on;
    this.settings.dataLabels.color.visible = on;
    // ...
}
```

## Composite card with a group

```typescript
import FormattingSettingsCompositeCard = formattingSettings.CompositeCard;
import FormattingSettingsGroup = formattingSettings.Group;

class AxisGroup extends FormattingSettingsGroup {
    fontControl = new formattingSettings.FontControl({
        name: "axisFont",
        displayName: "Font",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", value: "Segoe UI" }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", value: 10 }),
        bold: new formattingSettings.ToggleSwitch({ name: "bold", value: false }),
        italic: new formattingSettings.ToggleSwitch({ name: "italic", value: false }),
        underline: new formattingSettings.ToggleSwitch({ name: "underline", value: false }),
    });
    name = "axisLabels";
    displayName = "Labels";
    slices = [this.fontControl];
}

class ValueAxisCard extends FormattingSettingsCompositeCard {
    showAxis = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });
    labels = new AxisGroup(Object());

    name = "valueAxis";
    displayName = "Value axis";
    topLevelSlice = this.showAxis;           // card on/off switch in the header
    groups = [this.labels];
}
```

Each `FontControl` sub-property needs a matching capabilities object (`fontFamily` → `{ formatting: { fontFamily } }`, `fontSize` → `{ formatting: { fontSize } }`, the rest `{ bool }`).

## Conditional formatting — one color per data point

Build `ColorPicker` slices at runtime (after parsing the DataView), with a wildcard selector + `instanceKind` to expose the **fx** button:

```typescript
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";

class DataPointCardSettings extends FormattingSettingsCard {
    name = "dataPoint";
    displayName = "Data point colors";
    slices: Array<FormattingSettingsSlice> = [];   // filled per-update
}

// in update(), after computing `barData`:
const card = this.settings.dataPoint;
card.slices = barData.map(d => new formattingSettings.ColorPicker({
    name: "fill",
    displayName: d.category,
    value: { value: d.color },
    selector: dataViewWildcard.createDataViewWildcardSelector(
        dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals),
    altConstantSelector: d.selectionId.getSelector(),
    instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule,
}));
```

Matching capabilities object: `"dataPoint": { "properties": { "fill": { "type": { "fill": { "solid": { "color": true } } } } } }`.

## Localization

Use `displayNameKey`/`descriptionKey` and pass a localization manager into the service:

```typescript
this.formattingSettingsService = new FormattingSettingsService(options.host.createLocalizationManager());
// slice: new formattingSettings.NumUpDown({ name: "fontSize", displayNameKey: "Visual_TextSize", value: 12 })
```

Add the keys to `stringResources/<locale>/resources.json`.
