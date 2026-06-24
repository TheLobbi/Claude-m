# DAX user-defined functions (UDFs)

DAX UDFs package reusable, parameterized DAX logic into the model so you define a calculation once and call it anywhere DAX is supported (measures, calculated columns, visual calculations, other UDFs). They are **generally available in Power BI Desktop and the Power BI service from the June 2026 release** and require **compatibility level 1702 or higher**.

## Why use them

- **Reusability / consistency** — define logic once, call it everywhere.
- **Maintainability** — fix or evolve a rule in one place.
- **Safer authoring** — optional type hints + type-check helpers.
- **First-class model objects** — UDFs live in the model (Model Explorer ▸ *Functions*) and serialize to `functions.tmdl` in a Power BI Project.

## Syntax

```dax
/// Optional description
/// @param {ParameterType} ParameterName - description
/// @returns description
FUNCTION <Name> = ( [<param> [: [<type>] [<subtype>] [<mode>]] [= <default>], ...] ) => <body>
```

Define a UDF in **DAX query view** (with `DEFINE`) or **TMDL view** (`createOrReplace` / `function`):

```dax
DEFINE
    /// AddTax takes an amount and returns it including tax
    FUNCTION AddTax = ( amount : NUMERIC ) => amount * 1.1
EVALUATE
{ AddTax ( 10 ) }   // returns 11
```

```tmdl
createOrReplace
    /// AddTax takes an amount and returns it including tax
    function AddTax = (amount : NUMERIC) => amount * 1.1
```

After defining, use **Update model with changes** (DQV) or **Apply** (TMDL view) to add it to the model.

## Parameters and type hints

Each parameter accepts optional hints in the form `[type] [subtype] [mode]`:

- **Type** — `AnyVal`, `Scalar`, `Table`, `AnyRef`, `CalendarRef`, `ColumnRef`, `MeasureRef`, `TableRef`.
- **Subtype** (scalar only) — `Variant`, `Int64`, `Decimal`, `Double`, `String`, `DateTime`, `Boolean`, `Numeric`.
- **Mode** — `val` (eager evaluation) or `expr` (lazy evaluation).

```dax
DEFINE
    /// returns x cast to Int64
    FUNCTION CastToInt = ( x : SCALAR INT64 VAL ) => x
EVALUATE
{ CastToInt ( 3.4 ), CastToInt ( 3.5 ), CastToInt ( "5" ) }   // 3, 4, 5
```

`val` vs `expr` matters when a parameter is a measure/column reference: `expr` (lazy) re-evaluates the argument in each filter context inside the body; `val` (eager) evaluates once at the call site.

## Type checking inside the body

Validate inputs with `ISNUMERIC`, `ISINT64`, `ISDOUBLE`, `ISDECIMAL`, `ISSTRING`, `ISBOOLEAN`, `ISDATETIME` and branch accordingly.

## Using UDFs

```dax
-- measure (full filter context)
Total Sales with Tax = AddTax ( [Total Sales] )

-- calculated column (per row)
Sales Amount with Tax = CONVERT ( AddTax ( 'Sales'[Sales Amount] ), CURRENCY )

-- nested / composed
DEFINE
    FUNCTION AddTax = ( amount : NUMERIC ) => amount * 1.1
    FUNCTION AddTaxAndDiscount = ( amount : NUMERIC, discount : NUMERIC ) => AddTax ( amount - discount )
EVALUATE { AddTaxAndDiscount ( 10, 2 ) }   // 8.8
```

## Where UDFs live in source control

In a Power BI Project (PBIP) / TMDL model, all UDFs serialize into a single **`functions.tmdl`** root file in the model's `definition` folder — diff-friendly and reviewable like any other model object.

## Distribution: daxlib

The community package repository **[daxlib.org](https://daxlib.org)** publishes reusable DAX UDF packages in TMDL format (install via TMDL), including `DaxLib.SVG` for building inline SVG visuals from measures. Prefer a vetted package over hand-rolling common helpers.

## Practical guidance

- Replace repeated measure boilerplate (tax, discount, currency conversion, safe-divide variants) with a single UDF.
- A UDF can also replace a dynamic-format-string expression that breaks under the variant data type introduced by calculation groups (see `calculation-groups.md`).
- Keep UDFs pure and well-typed; add the `///` description + `@param`/`@returns` so they're self-documenting in Model Explorer.
- UDFs require a recent model compatibility level (1702+); older models must be upgraded first.
