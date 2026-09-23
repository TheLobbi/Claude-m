#!/usr/bin/env node
/**
 * sync-marketplace.mjs
 *
 * Syncs plugin descriptions and metadata from per-plugin plugin.json manifests
 * into .claude-plugin/marketplace.json so the marketplace stays
 * up-to-date without manual copy-paste.
 *
 * Usage:
 *   node scripts/sync-marketplace.mjs          # dry-run (report only)
 *   node scripts/sync-marketplace.mjs --write  # apply changes
 */
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const marketplacePath = path.join(rootDir, ".claude-plugin", "marketplace.json");
const dryRun = !process.argv.includes("--write");

if (dryRun) {
  console.log("Dry-run mode (pass --write to apply changes)\n");
}

// ── Load sources ──────────────────────────────────────────────────────────────

const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));

let marketplaceChanged = false;
const changes = [];

// ── Sync descriptions from plugin.json → marketplace.json ─────────────────

for (const entry of marketplace.plugins) {
  const pluginDir = resolvePluginDir(entry);
  if (!pluginDir) continue;

  const manifestPath = path.join(rootDir, pluginDir, ".claude-plugin", "plugin.json");
  if (!fs.existsSync(manifestPath)) continue;

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    console.warn(`  ⚠ Could not parse ${manifestPath}`);
    continue;
  }

  // Sync description: plugin.json is the authoritative source
  if (manifest.description && manifest.description !== entry.description) {
    changes.push({
      plugin: entry.name,
      field: "description",
      from: entry.description,
      to: manifest.description,
    });
    entry.description = manifest.description;
    marketplaceChanged = true;
  }

  // Sync tags if plugin.json has keywords/tags not yet in marketplace
  const manifestTags = manifest.keywords ?? manifest.tags ?? [];
  if (manifestTags.length > 0 && Array.isArray(entry.tags)) {
    const tagSet = new Set(entry.tags);
    const newTags = manifestTags.filter((t) => !tagSet.has(t));
    if (newTags.length > 0) {
      changes.push({
        plugin: entry.name,
        field: "tags",
        from: entry.tags.join(", "),
        to: [...entry.tags, ...newTags].join(", "),
      });
      entry.tags.push(...newTags);
      marketplaceChanged = true;
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (changes.length === 0) {
  console.log("✓ Marketplace is already in sync with plugin manifests.");
  process.exit(0);
}

console.log(`Found ${changes.length} change(s):\n`);
for (const c of changes) {
  console.log(`  ${c.plugin} [${c.field}]`);
  console.log(`    - ${truncate(c.from, 100)}`);
  console.log(`    + ${truncate(c.to, 100)}`);
  console.log();
}

// ── Write ─────────────────────────────────────────────────────────────────────

if (!dryRun) {
  if (marketplaceChanged) {
    fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf8");
    console.log("✓ Updated .claude-plugin/marketplace.json");
  }
} else {
  console.log("(no files written — pass --write to apply)");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePluginDir(entry) {
  const src = entry.source;
  if (typeof src === "string") {
    return src.startsWith("./") ? src.slice(2) : src;
  }
  if (typeof src === "object" && src !== null) {
    if (src.path) return src.path;
    if (src.repo) return src.repo;
  }
  // Fall back to plugin name as directory
  return entry.name;
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + "..." : str;
}
