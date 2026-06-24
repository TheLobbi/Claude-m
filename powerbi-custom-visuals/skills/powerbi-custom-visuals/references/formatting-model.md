# The Format pane and formatting model

From **API version 5.1+**, visuals build the Format pane by implementing `getFormattingModel()` (which **replaces** the deprecated `enumerateObjectInstances` / `enumerateObjectInstancesToReset`). The recommended way to build the model is the **formatting model utils** package, `powerbi-visuals-utils-formattingmodel`.

## Steps to add modern Format pane support

1. Set `apiVersion` to `5.1` or later in `pbiviz.json`.
2. Declare every customizable property as an `object` in `capabilities.json` (object name + property name + property type are required).
3. Build a settings model in `src/settings.ts` (cards → groups → slices) using the utils.
4. In the visual: create `FormattingSettingsService`, populate the model in `update`, and return it from `getFormattingModel`.

## Model components (largest → smallest)

| Component | Class | Role |
|-----------|-------|------|
| Model | `formattingSettings.Model` | The whole pane; holds the `cards` array |
| Card | `formattingSettings.SimpleCard` / `CompositeCard` | A top-level grouping (one per capabilities object) |
| Group | `formattingSettings.Group` | Sub-grouping inside a card; expandable |
| Container | (card `container`) | Switchable sub-sections via a dropdown |
| Slice | `formattingSettings.Slice` | One property control (simple) or several related (composite) |

- A **card's `name` must equal the `objects` object name** in `capabilities.json`.
- A **slice's `name` must equal the `properties` property name** in `capabilities.json`.
- Set `analyticsPane: true` on a card to place it in the Analytics pane instead of Format.
- Toggle `visible` on cards/groups/slices to show/hide them dynamically.

## settings.ts (formatting model utils)

```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class DataLabelsCardSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "Show", value: true });
    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize", displayName: "Text size", value: 12,
        options: {
            minValue: { type: powerbi.visuals.ValidatorType.Min, value: 8 },
            maxValue: { type: powerbi.visuals.ValidatorType.Max, value: 60 },
        },
    });
    name: string = "dataLabels";          // === capabilities object name
    displayName: string = "Data labels";
    slices: Array<FormattingSettingsSlice> = [this.show, this.fontSize];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    dataLabels = new DataLabelsCardSettings();
    cards = [this.dataLabels];
}
```

Matching `capabilities.json`:

```json
"objects": {
  "dataLabels": {
    "properties": {
      "show": { "type": { "bool": true } },
      "fontSize": { "type": { "formatting": { "fontSize": true } } }
    }
  }
}
```

## Wire it into the visual

```typescript
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
    private formattingSettingsService: FormattingSettingsService;
    private formattingSettings: VisualFormattingSettingsModel;

    constructor(options: VisualConstructorOptions) {
        const localization = options.host.createLocalizationManager();
        this.formattingSettingsService = new FormattingSettingsService(localization);
    }

    public update(options: VisualUpdateOptions): void {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel, options.dataViews);
        const labelsOn = this.formattingSettings.dataLabels.show.value;
        // ...render using settings...
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
```

## Property type ↔ capabilities mapping

| Capabilities value type | Formatting slice class |
|-------------------------|------------------------|
| `bool` | `ToggleSwitch` |
| `numeric` / `integer` | `NumUpDown`, `Slider` |
| `fill` (solid color) | `ColorPicker` |
| `fillRule` (gradient) | `GradientBar` (value `min[,mid],max`) |
| `text` | `TextInput`, `TextArea` |
| `enumeration: []` | `ItemDropdown` / `ItemFlagsSelection` (list in code) or `AutoDropdown` / `AutoFlagsSelection` (list in capabilities) |
| `formatting: { fontSize }` | `NumUpDown` |
| `formatting: { fontFamily }` | `FontPicker` |
| `formatting: { alignment }` | `AlignmentGroup` |
| `formatting: { labelDisplayUnits }` | `AutoDropdown` |

> A mismatch between the capabilities object/property names or types and the formatting model throws an error at runtime.

### Composite slices

- **`FontControl`** — bundles font family, size, and bold/italic/underline. Each sub-property needs its own capabilities object (`fontFamily`, `fontSize`, bools).
- **`MarginPadding`** — bundles left/right/top/bottom numerics.

## Conditional (rule-based) formatting

Let report authors color by a rule, or color per data point. Add a selector and `instanceKind` to the descriptor:

```typescript
import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";

new formattingSettings.ColorPicker({
    name: "fill",
    displayName: dataPoint.category,
    value: { value: dataPoint.color },
    selector: dataViewWildcard.createDataViewWildcardSelector(
        dataViewWildcard.DataViewWildcardMatchingOption.InstancesAndTotals),
    altConstantSelector: dataPoint.selectionId.getSelector(),
    instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule,
});
```

In `capabilities.json`, mark the property `"rule"`-capable by giving it a `fill`/`fillRule` type; the `ConstantOrRule` instance kind enables the **fx** (conditional formatting) button.

## Reset to default

Formatting model utils auto-populate each card's `revertToDefaultDescriptors`, enabling the per-card **Reset to default** button and the pane-wide **Reset all settings to default** button — no extra code needed.

## Localization

Pass an `ILocalizationManager` into `FormattingSettingsService`, and use `displayNameKey`/`descriptionKey` (instead of `displayName`/`description`) on slices. Add the keys to `stringResources/<locale>/resources.json`.
