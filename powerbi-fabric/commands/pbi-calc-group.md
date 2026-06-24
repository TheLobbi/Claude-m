---
name: pbi-calc-group
description: Author a calculation group (time intelligence, currency, or format switching) as TMDL, collapsing repeated measure variants into reusable calculation items.
argument-hint: "<purpose, e.g. 'time intelligence: Current, YTD, PY, YOY%'> [--date-table Date] [--precedence 1]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Author a Calculation Group

Generate a calculation group as TMDL with well-named calculation items.

## Instructions

1. Parse the purpose to derive the calculation items (e.g. Current, YTD, QTD, MTD, PY, YOY, YOY%).
2. Read `skills/powerbi-analytics/references/calculation-groups.md` for syntax, precedence, dynamic format strings, and gotchas.
3. Resolve the date table (`--date-table`, default `Date`) and precedence (`--precedence`, default 1).
4. Emit a `createOrReplace` TMDL block with the calculation group table, the hidden `Ordinal` column, the display column sorted by `Ordinal`, and one `calculationItem` per variant using `SELECTEDMEASURE()`.
5. Add a dynamic format string to ratio items (e.g. `YOY%` → `"#,##0.00%"`).
6. Guard arithmetic items with `ISNUMERIC(SELECTEDMEASURE())` when the model has non-numeric (title/format) measures.
7. Remind the user to enable **Discourage implicit measures** (required) and that all measures become the variant type once a calculation group exists.

## Output Format (TMDL)

```tmdl
createOrReplace
table 'Time Intelligence'
    calculationGroup
        precedence: 1
        calculationItem Current = SELECTEDMEASURE()
        calculationItem YTD = CALCULATE ( SELECTEDMEASURE(), DATESYTD ( 'Date'[Date] ) )
        calculationItem PY  = CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
        calculationItem 'YOY%' =
            VAR cur = SELECTEDMEASURE()
            VAR py  = CALCULATE ( SELECTEDMEASURE(), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )
            RETURN DIVIDE ( cur - py, py )
            formatString: "#,##0.00%"
    column 'Time Calculation'
        dataType: string
        sourceColumn: Name
        sortByColumn: Ordinal
    column Ordinal
        dataType: int64
        sourceColumn: Ordinal
        isHidden
```

## Guidelines

- Name the display column for how users think (e.g. "Time Calculation", "Currency").
- Set `precedence` higher for the group that should apply last (outermost) when composing multiple groups.
- Pin a single item in a measure with `CALCULATE ( [m], 'Time Intelligence'[Time Calculation] = "YTD" )`.
- Validate against a real `Date` table marked as a date table; correct item DAX to the actual table name.
