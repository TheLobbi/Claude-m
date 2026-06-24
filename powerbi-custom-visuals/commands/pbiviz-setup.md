---
name: pbiviz-setup
description: Set up a machine for Power BI custom visual development — install Node.js and the pbiviz tool, trust the dev certificate, and enable developer mode.
argument-hint: "[--check] [--skip-cert]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# Power BI Custom Visuals Setup

Get the user's environment ready to develop, debug, and package custom Power BI visuals.

Reference: `${CLAUDE_PLUGIN_ROOT}/skills/powerbi-custom-visuals/references/environment-setup.md`.

## Step 1: Verify Node.js and npm

Run `node --version` and `npm --version`. If Node is missing or old, direct the user to install the current LTS from <https://nodejs.org> and restart the terminal. If `--check` is passed, only report versions and exit after Step 4.

## Step 2: Install or verify the pbiviz tool

1. Check for the CLI: `pbiviz --version`.
2. If absent, install it: `npm i -g powerbi-visuals-tools@latest` (harmless warnings may appear).
3. Confirm with `pbiviz` (prints the supported-commands banner).

## Step 3: Trust the developer SSL certificate

Unless `--skip-cert` is passed, run `pbiviz --install-cert` and walk the user through trusting it (Windows: Trusted Root store; macOS: Keychain). Without it the Developer Visual renders blank.

## Step 4: Enable developer mode

Ask which target the user develops against, then give the exact steps:

- **Power BI Desktop** — *File ▸ Options and settings ▸ Options ▸ Report settings ▸ enable "Develop a visual"* (resets each session).
- **Power BI service** — *Settings ▸ Developer settings ▸ Power BI Developer mode* (persistent).

Use AskUserQuestion when the target is unclear.

## Step 5: Summarize

Output a checklist showing the resolved Node/npm/pbiviz versions, cert status, and developer-mode target, then point the user to `/pbiviz-scaffold` to create their first visual.

## Guidelines

- Never disable TLS verification to work around cert issues — install/trust the cert instead.
- A **Power BI Pro** or **PPU** account is required to sideload and test in the service; mention this if the user only has free.
- Prefer the latest `powerbi-visuals-tools`; pin Node to a current LTS.
