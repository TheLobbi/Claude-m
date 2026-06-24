# Environment setup

Set up a local machine to develop, debug, and package Power BI custom visuals.

## Prerequisites

- **Power BI Pro** or **Premium Per User (PPU)** account (to test in the service and to sideload visuals).
- An IDE for TypeScript/JavaScript — **Visual Studio Code** is recommended.
- **Windows PowerShell** v4+ (Windows) or **Terminal** (macOS). The toolchain is cross-platform.

## 1. Install Node.js

Install the current LTS from <https://nodejs.org>. Restart the terminal (or the machine on Windows) afterward so `node` and `npm` are on `PATH`.

```bash
node --version
npm --version
```

## 2. Install the pbiviz tool

`pbiviz` (the `powerbi-visuals-tools` package) compiles the visual source into a `.pbiviz` package and runs the local dev server.

```bash
npm i -g powerbi-visuals-tools@latest
```

Harmless deprecation/peer warnings may print; they don't block installation. Verify:

```bash
pbiviz            # prints the banner and the list of supported commands
pbiviz --version
```

Common subcommands:

| Command | Purpose |
|---------|---------|
| `pbiviz new <name>` | Scaffold a new visual project |
| `pbiviz start` | Start the dev server with hot reload (serves the Developer Visual) |
| `pbiviz package` | Build the production `.pbiviz` into `dist/` |
| `pbiviz package --certification-audit` | Flag unsafe `fetch`/`XMLHttpRequest`/`eval` calls (tools 6.1+) |
| `pbiviz info` / `pbiviz --install-cert` | Show project info / install the dev SSL certificate |

## 3. Install (trust) the developer SSL certificate

`pbiviz start` serves the visual over HTTPS from `localhost`. The browser/Power BI must trust the local certificate.

```bash
pbiviz --install-cert
```

Follow the OS prompt to import the certificate (on Windows, into *Current User ▸ Trusted Root Certification Authorities*; on macOS, trust it in Keychain Access). Without a trusted cert, the Developer Visual shows a blank box or a connection error.

## 4. Enable developer mode

Developer mode lets you sideload an in-development visual.

### Power BI Desktop (per session)

`File ▸ Options and settings ▸ Options ▸ Report settings (Current file) ▸ enable "Develop a visual" ▸ OK`. This resets each session — re-enable it whenever you reopen the report.

### Power BI service (persistent)

Go to **Settings ▸ Developer settings** (or `https://app.powerbi.com/user/user-settings/developer-settings`) and turn on **Power BI Developer mode**. This stays enabled until you turn it off.

## 5. Start developing

```bash
pbiviz new myVisual
cd myVisual
npm install          # restore dependencies
pbiviz start         # serves the visual at https://localhost:8080/assets
```

Then in a Power BI report add the **Developer Visual** (the dashed-square icon in the Visualizations pane), bind some fields, and edit `src/visual.ts` — the visual hot-reloads on save.

## Troubleshooting setup

- **`pbiviz` not recognized** — reopen the terminal so the global npm bin is on `PATH`; confirm `npm prefix -g`.
- **Developer Visual is blank / "can't reach localhost"** — `pbiviz start` isn't running, or the dev cert isn't trusted. Run `pbiviz --install-cert` and restart the browser.
- **Developer Visual missing from the pane** — developer mode isn't enabled for the current report/session (Desktop) or tenant user (service).
- **Node/engine errors on `npm install`** — the project's `apiVersion`/tools version may require a newer Node LTS; upgrade Node.
- **Corporate proxy blocks the global install** — configure `npm config set proxy/https-proxy` or install behind your registry mirror.
