# Example: project config files

## pbiviz.json

```json
{
  "visual": {
    "name": "salesBarChart",
    "displayName": "Sales Bar Chart",
    "guid": "salesBarChart9F2C1A7B4E0D4F2E8A1B6C3D5E7F9012",
    "visualClassName": "Visual",
    "version": "1.0.0.0",
    "description": "A categorical bar chart with cross-filtering, tooltips, and conditional formatting.",
    "supportUrl": "https://community.powerbi.com",
    "gitHubUrl": "https://github.com/your-org/sales-bar-chart"
  },
  "apiVersion": "5.11.0",
  "author": { "name": "Your Name", "email": "you@example.com" },
  "assets": { "icon": "assets/icon.png" },
  "style": "style/visual.less",
  "capabilities": "capabilities.json",
  "dependencies": null,
  "stringResources": []
}
```

- `visualClassName` must equal the exported class in `src/visual.ts`.
- `version` is four parts.
- `description` and `author` are required for `pbiviz package`.
- `apiVersion` ≥ 5.1 to use `getFormattingModel`.

## package.json

```json
{
  "name": "salesbarchart",
  "version": "1.0.0",
  "scripts": {
    "pbiviz": "pbiviz",
    "start": "pbiviz start",
    "package": "pbiviz package",
    "lint": "npx eslint . --ext .js,.jsx,.ts,.tsx",
    "test": "karma start config/karma.conf.ts"
  },
  "dependencies": {
    "d3": "^7.9.0",
    "powerbi-visuals-utils-formattingmodel": "^6.0.0",
    "powerbi-visuals-utils-dataviewutils": "^6.0.0",
    "powerbi-visuals-utils-formattingutils": "^6.0.0"
  },
  "devDependencies": {
    "@types/d3": "^7.4.0",
    "powerbi-visuals-api": "~5.11.0",
    "powerbi-visuals-tools": "^5.6.0",
    "typescript": "^5.5.0",
    "eslint": "^8.57.0",
    "eslint-plugin-powerbi-visuals": "^0.8.0",
    "karma": "^6.4.0",
    "jasmine": "^5.0.0",
    "powerbi-visuals-utils-testutils": "^6.0.0"
  }
}
```

Certification requires `typescript`, `eslint`, `eslint-plugin-powerbi-visuals`, and the `lint` command shown.

## tsconfig.json

```json
{
  "compilerOptions": {
    "allowJs": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./.tmp/build/",
    "types": ["powerbi-visuals-api"]
  },
  "files": [ "src/visual.ts" ]
}
```

The `files` array must point at the file containing the main `IVisual` class.

## .eslintrc.json

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "plugins": ["powerbi-visuals"],
  "extends": ["plugin:powerbi-visuals/recommended"]
}
```

## .gitignore (certification-friendly)

```gitignore
node_modules/
.tmp/
dist/
*.pbiviz
.vscode/.react/
```

Certification requires `node_modules`, `.tmp`, and `dist` to be git-ignored and not committed.

## style/visual.less

```less
.barChart {
  display: block;
  cursor: default;
}
.barChart rect {
  transition: fill-opacity 120ms ease-in-out;
}
```
