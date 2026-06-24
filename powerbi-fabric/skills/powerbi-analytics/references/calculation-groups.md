# Calculation groups

Calculation groups collapse dozens of near-identical measures (e.g. one per time-intelligence variant) into a small set of reusable **calculation items**. A calculation item is a DAX expression that rewrites whatever measure it is applied to, using `SELECTEDMEASURE()` as the placeholder. They require **compatibility level 1500 or higher**.

## Core concepts

- **Calculation group** — a special single-column table holding calculation items.
- **Calculation item** — a DAX expression applied to the measure in context via `SELECTEDMEASURE()`.
- **Calculation group column** — the column users drop on a slicer/axis to pick an item.
- **Precedence** — when several calculation groups apply, the higher `precedence` value is applied last (outermost).

## Create one

In Power BI Desktop **Model view ▸ Calculation group** (ribbon). You'll be prompted to enable **Discourage implicit measures** — required, because calculation items apply only to explicit measures, not drag-to-aggregate implicit ones.

Or author it in **TMDL view**:

```tmdl
createOrReplace
table 'Time Intelligence'
    calculationGroup
        precedence: 1

        calculationItem Current = SELECTEDMEASURE()

        calculationItem YTD =
            CALCULATE ( SELECTEDMEASURE(), DATESYTD ( 'Date'[Date] ) )

        calculationItem PY =
            CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )

        calculationItem 'YOY%' =
            VAR cur = SELECTEDMEASURE()
            VAR py  = CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
            RETURN DIVIDE ( cur - py, py )

    column 'Time Calculation'
        dataType: string
        sourceColumn: Name
        sortByColumn: Ordinal
    column Ordinal
        dataType: int64
        sourceColumn: Ordinal
        isHidden
```

## Dynamic format strings

Calculation items inherit the underlying measure's format by default. Turn on **Dynamic format string** on an item to override — e.g. format `YOY%` as a percentage with `"#,##0.00%"`. The format expression itself is DAX.

## Apply a calculation item

- **In a visual** — put the calculation group column on rows/columns/slicer; each measure is rewritten per item.
- **In a measure** — pin a specific item with `CALCULATE`:

```dax
Orders YOY% = CALCULATE ( [Orders], 'Time Intelligence'[Time Calculation] = "YOY%" )
```

## Selection expressions

Set **selection expressions** on the calculation group to control behavior when the user makes multiple, invalid, or no selections on the group — giving fine-grained control instead of the default fallback.

## Precedence with multiple groups

Set `precedence` per group; higher precedence is applied later (outer). Typical pattern: a "Time Intelligence" group and a separate "Currency"/"Format" group with different precedence so they compose predictably.

## Gotchas

- **Variant data type** — adding any calculation group switches all model measures to the **variant** type in reports. This can break dynamic-format-string measures that expect text; wrap with `FORMAT([m], "")` to coerce back to string, or move the logic into a DAX UDF.
- **Math on non-numeric measures** — items that multiply/divide will error on text measures (dynamic titles). Guard with `ISNUMERIC ( SELECTEDMEASURE() )` before applying arithmetic:

```dax
calculationItem 'Times two safe' =
    IF ( ISNUMERIC ( SELECTEDMEASURE() ), SELECTEDMEASURE() * 2, SELECTEDMEASURE() )
```

- Calculation items don't apply to implicit measures — keep **Discourage implicit measures** on and author explicit measures.
- Always set the hidden `Ordinal` column and `sortByColumn` so items display in a logical order.
