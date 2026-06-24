#!/usr/bin/env node
/**
 * Restructure the marketplace + plugin manifests to align with the canonical
 * Claude Code plugin marketplace schema documented at
 * https://code.claude.com/docs/en/plugin-marketplaces.
 *
 * What this does (idempotent):
 * 1. Converts every plugin entry's `source` from the verbose self-referential
 *    `git-subdir` object to the canonical relative-path string ("./<path>").
 * 2. Promotes top-level marketplace metadata: $schema, version, metadata.
 * 3. Enriches each plugin entry with version, author, homepage, repository,
 *    license, keywords (pulled from the plugin's own plugin.json).
 * 4. Sorts plugins by (category, name) for stable diffs.
 * 5. Normalizes each plugin's .claude-plugin/plugin.json so it carries the
 *    full recommended metadata set (without overwriting existing values).
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MARKETPLACE_PATH = path.join(ROOT, ".claude-plugin", "marketplace.json");

const REPO_URL = "https://github.com/markus41/Claude-m";
const DEFAULT_AUTHOR = { name: "Markus Ahling" };
const DEFAULT_LICENSE = "MIT";
const MARKETPLACE_VERSION = "2.0.0";

const CATEGORY_ORDER = ["cloud", "analytics", "security", "devops", "productivity"];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
}

function pluginFolder(plugin) {
  if (typeof plugin.source === "string") {
    return plugin.source.replace(/^\.\//, "");
  }
  if (plugin.source && typeof plugin.source === "object" && plugin.source.path) {
    return plugin.source.path;
  }
  return plugin.name;
}

function homepageFor(folder) {
  return `${REPO_URL}/blob/main/${folder}/README.md`;
}

function normalizePluginManifest(folder, plugin) {
  const manifestDir = path.join(ROOT, folder, ".claude-plugin");
  const manifestPath = path.join(manifestDir, "plugin.json");
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }
  let current = {};
  if (fs.existsSync(manifestPath)) {
    try {
      current = readJson(manifestPath);
    } catch {
      current = {};
    }
  }

  const merged = {
    name: current.name || plugin.name,
    version: current.version || "1.0.0",
    description: current.description || plugin.description,
    author: current.author || DEFAULT_AUTHOR,
    license: current.license || DEFAULT_LICENSE,
    homepage: current.homepage || homepageFor(folder),
    repository: current.repository || REPO_URL,
    keywords: current.keywords || plugin.tags || [],
    ...current,
  };

  // Re-apply explicit defaults if existing fields were present but empty.
  if (!merged.license) merged.license = DEFAULT_LICENSE;
  if (!merged.homepage) merged.homepage = homepageFor(folder);
  if (!merged.repository) merged.repository = REPO_URL;
  if (!merged.author) merged.author = DEFAULT_AUTHOR;
  if (!merged.keywords || merged.keywords.length === 0) {
    merged.keywords = plugin.tags || [];
  }

  // Stable key order for diff readability.
  const ordered = {};
  const order = [
    "name",
    "version",
    "description",
    "author",
    "license",
    "homepage",
    "repository",
    "keywords",
    "skills",
    "commands",
    "agents",
    "hooks",
    "mcpServers",
    "lspServers",
  ];
  for (const k of order) {
    if (k in merged) ordered[k] = merged[k];
  }
  for (const k of Object.keys(merged)) {
    if (!(k in ordered)) ordered[k] = merged[k];
  }

  writeJson(manifestPath, ordered);
  return ordered;
}

function buildPluginEntry(plugin, manifest, folder) {
  const sourceString = `./${folder}`;
  const entry = {
    name: plugin.name,
    source: sourceString,
    description: plugin.description || manifest.description,
    version: manifest.version,
    author: manifest.author,
    license: manifest.license,
    homepage: manifest.homepage,
    repository: manifest.repository,
    category: plugin.category,
    tags: plugin.tags || manifest.keywords || [],
    keywords: manifest.keywords || plugin.tags || [],
  };
  if (typeof plugin.strict === "boolean") {
    entry.strict = plugin.strict;
  } else {
    entry.strict = true;
  }
  return entry;
}

function main() {
  const marketplace = readJson(MARKETPLACE_PATH);
  const next = {
    $schema:
      "https://raw.githubusercontent.com/anthropics/claude-code/main/schemas/marketplace.schema.json",
    name: marketplace.name,
    description:
      marketplace.description ||
      "Focused Claude marketplace for Microsoft workflow plugins maintained in this repository.",
    version: MARKETPLACE_VERSION,
    owner: marketplace.owner || DEFAULT_AUTHOR,
    metadata: {
      version: MARKETPLACE_VERSION,
      repository: REPO_URL,
      license: DEFAULT_LICENSE,
    },
    plugins: [],
  };

  const plugins = (marketplace.plugins || []).slice();
  plugins.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  let updated = 0;
  for (const plugin of plugins) {
    const folder = pluginFolder(plugin);
    if (!fs.existsSync(path.join(ROOT, folder))) {
      console.warn(`skip (folder missing): ${folder}`);
      continue;
    }
    const manifest = normalizePluginManifest(folder, plugin);
    next.plugins.push(buildPluginEntry(plugin, manifest, folder));
    updated++;
  }

  writeJson(MARKETPLACE_PATH, next);
  console.log(`Restructured marketplace: ${updated} plugins.`);
}

main();
