# Visual project structure

`pbiviz new <name>` scaffolds a complete, buildable project.

```
myVisual
├── .vscode/                 # VS Code workspace settings (launch.json, settings.json)
├── assets/
│   └── icon.png             # Visualizations-pane icon — MUST be a 20×20 PNG
├── node_modules/            # dependencies (never commit; in .gitignore)
├── src/
│   ├── visual.ts            # the IVisual implementation (your render code)
│   └── settings.ts          # the formatting settings model (Format pane)
├── style/
│   └── visual.less          # styles compiled into the package
├── capabilities.json        # data + format contract with the host
├── pbiviz.json              # visual metadata
├── tsconfig.json            # TypeScript config (points at the main .ts file)
├── package.json             # npm metadata + dependencies + scripts
├── package-lock.json
└── .eslintrc                # ESLint config (eslint-plugin-powerbi-visuals)
```

> Older scaffolds (tools 3.x) also emitted `tslint.json`; modern projects use **ESLint** with `eslint-plugin-powerbi-visuals`, which certification requires.

## File-by-file

| Path | Role |
|------|------|
| `pbiviz.json` | Visual metadata — name, guid, version, apiVersion, author, asset/capabilities/style paths |
| `capabilities.json` | Declares data roles, dataView mappings, Format-pane objects, feature flags, privileges |
| `src/visual.ts` | The class implementing `IVisual`; class name must equal `visualClassName` |
| `src/settings.ts` | Formatting settings model (cards/groups/slices) consumed by `getFormattingModel` |
| `style/visual.less` | LESS styles bundled into the `.pbiviz` |
| `assets/icon.png` | 20×20 PNG shown in the Visualizations pane |
| `tsconfig.json` | Must reference the `.ts` file containing the main class |
| `package.json` | Dependencies (`powerbi-visuals-api`, utils, D3…) and scripts (`package`, `lint`, `test`) |

## pbiviz.json reference

```jsonc
{
  "visual": {
    "name": "myVisual",                 // internal name (no spaces); folder/package id
    "displayName": "My Visual",         // shown in the Visualizations pane
    "guid": "myVisual23D8B823CF134D3AA7CC0A5D63B20B7F", // globally unique; do not reuse
    "visualClassName": "Visual",        // MUST match the IVisual class name in visual.ts
    "version": "1.0.0.0",               // FOUR-part version (x.x.x.x); bump before each package
    "description": "",                  // REQUIRED before `pbiviz package` will run
    "supportUrl": "",                   // shown to report authors (optional but recommended)
    "gitHubUrl": ""                     // source link (recommended; required-ish for certification)
  },
  "apiVersion": "5.11.0",               // Power BI Visuals API; use 5.1+ for the modern Format pane
  "author": { "name": "", "email": "" },// REQUIRED before packaging
  "assets": { "icon": "assets/icon.png" },
  "style": "style/visual.less",
  "capabilities": "capabilities.json",
  "dependencies": null,                 // path to dependencies.json for R-based visuals
  "stringResources": []                 // localization resource files
}
```

Rules and gotchas:

- **`version` must have four parts** (`x.x.x.x`). If you only have three, append `.0`.
- **`visualClassName` must exactly match** the exported class in `src/visual.ts`. A mismatch yields a blank visual.
- **`guid` must be unique** per published visual; never copy another visual's guid.
- `description` and `author` (`name`+`email`) are **required** for `pbiviz package`.
- `externalJS` is **not supported** from tools 3.x — bundle libraries via npm/`package.json` instead.
- Set `apiVersion` to a value your installed `powerbi-visuals-api` supports; the modern `getFormattingModel` Format pane needs **5.1 or later**.

## package.json essentials

```jsonc
{
  "name": "myvisual",
  "scripts": {
    "package": "pbiviz package",
    "start": "pbiviz start",
    "lint": "npx eslint . --ext .js,.jsx,.ts,.tsx",
    "test": "karma start config/karma.conf.ts"
  },
  "dependencies": {
    "powerbi-visuals-api": "~5.11.0",
    "powerbi-visuals-utils-formattingmodel": "^6.0.0",
    "d3": "^7.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-powerbi-visuals": "^0.8.0"
  }
}
```

`powerbi-visuals-api` is usually a **devDependency type-only** package (the host provides the runtime). The four certification-required packages are `typescript`, `eslint`, `eslint-plugin-powerbi-visuals`, plus the lint script `npx eslint . --ext .js,.jsx,.ts,.tsx`.

## tsconfig.json

Must include the file holding the main class, and target a module/lib the bundler supports:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "sourceMap": true,
    "strict": true,
    "outDir": "./.tmp/build/",
    "types": ["powerbi-visuals-api"]
  },
  "files": [ "src/visual.ts" ]
}
```
