import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, 'artifacts');
const outputPath = path.join(artifactsDir, 'capability-graph.json');
const marketplacePath = path.join(rootDir, '.claude-plugin', 'marketplace.json');

const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
const strictPlugins = detectChangedPlugins();

let hasError = false;
const graph = {
  strictPluginScope: Array.from(strictPlugins).sort(),
  sourceFiles: {
    marketplace: toRepoPath(marketplacePath)
  },
  plugins: {}
};

for (const pluginEntry of marketplace.plugins ?? []) {
  if (typeof pluginEntry.source !== 'string' || !pluginEntry.source.startsWith('./')) continue;

  const pluginDir = path.join(rootDir, pluginEntry.source.slice(2));
  const manifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  const readmePath = path.join(pluginDir, 'README.md');
  const skillsDir = path.join(pluginDir, 'skills');
  const commandsDir = path.join(pluginDir, 'commands');
  const agentsDir = path.join(pluginDir, 'agents');

  if (!assertFileExists(manifestPath, pluginEntry.name, 'manifest')) continue;
  if (!assertFileExists(readmePath, pluginEntry.name, 'README')) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const readme = fs.readFileSync(readmePath, 'utf8');
  const skillFiles = getSkillFiles(skillsDir);
  const commandFiles = getMarkdownFiles(commandsDir);
  const agentFiles = getMarkdownFiles(agentsDir);

  graph.plugins[pluginEntry.name] = {
    category: pluginEntry.category,
    description: pluginEntry.description,
    files: {
      manifest: toRepoPath(manifestPath),
      readme: toRepoPath(readmePath),
      skills: skillFiles.map(toRepoPath),
      commands: commandFiles.map(toRepoPath),
      agents: agentFiles.map(toRepoPath)
    },
    domains: buildDomains(pluginEntry, readme, readmePath, skillFiles, commandFiles)
  };

  const isStrict = strictPlugins.has(pluginEntry.name);
  const hasPackageJson = fs.existsSync(path.join(pluginDir, 'package.json'));
  const hasMcpConfig = fs.existsSync(path.join(pluginDir, '.mcp.json'));
  const declaresMcpServers = manifest.mcpServers && Object.keys(manifest.mcpServers).length > 0;
  const declaresLspServers = manifest.lspServers && Object.keys(manifest.lspServers).length > 0;
  const declaresHooks = manifest.hooks || fs.existsSync(path.join(pluginDir, 'hooks'));
  const isInfrastructurePlugin = hasPackageJson || hasMcpConfig || declaresMcpServers || declaresLspServers || declaresHooks;
  validateDrift({ pluginEntry, manifest, pluginDir, manifestPath, readme, readmePath, isStrict });
  validateIntegrationMetadata({ pluginEntry, readme, readmePath, skillFiles, commandFiles, agentFiles, isStrict, isInfrastructurePlugin });
}

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
console.log(`Wrote capability graph: ${toRepoPath(outputPath)}`);

if (hasError) process.exit(1);
console.log('Capability graph validation passed.');

function buildDomains(pluginEntry, readme, readmePath, skillFiles, commandFiles) {
  const domainSet = new Set(extractReadmeDomains(readme));
  if (domainSet.size === 0) domainSet.add(pluginEntry.category || 'general');
  const prerequisites = collectPrerequisites([readmePath, ...skillFiles, ...commandFiles]);
  const actions = commandFiles.map((commandPath) => extractAction(commandPath));

  const domains = {};
  for (const domain of domainSet) domains[domain] = { actions, prerequisites };
  return domains;
}

function validateDrift({ pluginEntry, manifest, pluginDir, manifestPath, readme, readmePath, isStrict }) {
  const folderSlug = path.basename(pluginDir);
  // Plugins nested under a shared "plugins/" directory may use compact
  // folder names (e.g., plugins/teams for microsoft-teams-mcp). Only
  // enforce the folder-name == plugin-name convention for top-level
  // plugin folders.
  const isTopLevel = !pluginEntry.source.slice(2).includes('/');
  if (isTopLevel && folderSlug !== pluginEntry.name) {
    fail(`Slug mismatch: marketplace "${pluginEntry.name}" != folder "${folderSlug}". Fix ${toRepoPath(pluginDir)} or ${toRepoPath(marketplacePath)}.`);
  }
  if (manifest.name !== pluginEntry.name) {
    fail(`Name drift: ${toRepoPath(manifestPath)} has name "${manifest.name}" but marketplace expects "${pluginEntry.name}".`);
  }
  if (isStrict && !new RegExp(`\\b${escapeRegExp(pluginEntry.name)}\\b`, 'i').test(readme)) {
    fail(`README naming drift for "${pluginEntry.name}": slug is not referenced in ${toRepoPath(readmePath)}.`);
  }
}

function validateIntegrationMetadata({ pluginEntry, readme, readmePath, skillFiles, commandFiles, agentFiles, isStrict, isInfrastructurePlugin }) {
  if (!isInfrastructurePlugin) {
    if (skillFiles.length === 0) {
      fail(`Missing skill docs for "${pluginEntry.name}". Add skills/*/SKILL.md in ${toRepoPath(path.join(rootDir, pluginEntry.source.slice(2)))}.`);
    }
    if (commandFiles.length === 0) {
      fail(`Missing command docs for "${pluginEntry.name}". Add commands/*.md in ${toRepoPath(path.join(rootDir, pluginEntry.source.slice(2)))}.`);
    }
  }
  if (!isStrict) return;

  const prereqSources = [
    hasPrereqSection(readme) ? toRepoPath(readmePath) : null,
    ...skillFiles.filter((p) => hasPrereqSection(fs.readFileSync(p, 'utf8'))).map(toRepoPath),
    ...commandFiles.filter((p) => hasPrereqSection(fs.readFileSync(p, 'utf8'))).map(toRepoPath)
  ].filter(Boolean);
  if (prereqSources.length === 0) {
    fail(`Missing prerequisites metadata for "${pluginEntry.name}". Add a "Prerequisites"/"Requirements" section in ${toRepoPath(readmePath)} or related skill/command docs.`);
  }

  for (const skillPath of skillFiles) {
    if (!hasTriggers(fs.readFileSync(skillPath, 'utf8'))) {
      fail(`Missing trigger phrases in ${toRepoPath(skillPath)}. Add non-empty frontmatter "triggers" entries.`);
    }
  }
  for (const agentPath of agentFiles) {
    if (!hasOutputFormat(fs.readFileSync(agentPath, 'utf8'))) {
      fail(`Missing output format metadata in ${toRepoPath(agentPath)}. Add an explicit output/report format section and checklist-style review criteria.`);
    }
  }
}

function detectChangedPlugins() {
  const files = runGitDiffFiles();
  const changed = new Set();
  for (const file of files) {
    // Strict-mode content checks should only fire when the substantive
    // surface of a plugin changes — its skills, commands, agents, hooks,
    // or source. Pure documentation (README) and pure manifest-metadata
    // updates (plugin.json) don't warrant the deep content audit.
    if (/(?:^|\/)README\.md$/.test(file)) continue;
    if (/\.claude-plugin\/plugin\.json$/.test(file)) continue;
    const root = file.split('/')[0];
    if (marketplace.plugins.some((p) => typeof p.source === 'string' && p.source === `./${root}`)) {
      changed.add(root);
    }
  }
  return changed;
}

function runGitDiffFiles() {
  const candidates = [
    'git diff --name-only --diff-filter=ACMR $(git merge-base HEAD origin/main)',
    'git diff --name-only --diff-filter=ACMR HEAD~1'
  ];

  for (const cmd of candidates) {
    try {
      const out = execSync(cmd, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'], shell: '/bin/bash' }).toString('utf8');
      return out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    } catch {
      // try next strategy
    }
  }
  return [];
}

function getSkillFiles(skillsDir) {
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) return [];
  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsDir, entry.name, 'SKILL.md'))
    .filter((skillPath) => fs.existsSync(skillPath));
}

function getMarkdownFiles(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

function hasTriggers(content) {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!frontmatter) return false;
  const triggerBlock = frontmatter[1].match(/(^|\n)triggers:\s*\n([\s\S]*?)(\n[a-zA-Z-]+:\s|$)/);
  return Boolean(triggerBlock && /\n\s*-\s*\S+/.test(`\n${triggerBlock[2]}`));
}

function hasOutputFormat(content) {
  const hasFormatSection = /(##|###)\s*(output format|review output|report format|response format)\b/i.test(content);
  const hasStructuredTemplate = /```[\s\S]*?(review summary|issues found|overall)\b/i.test(content);
  const hasActionableChecks = /(##|###)\s*(checks|review checklist|validation checklist)\b/i.test(content) || /^[-*]\s+Verify\b/m.test(content);
  return (hasFormatSection || hasStructuredTemplate) && hasActionableChecks;
}

function hasPrereqSection(content) {
  return /^(##|###)\s+.*(prerequisites?|requirements?|permissions?|authentication)\b/im.test(content);
}

function extractReadmeDomains(content) {
  return (content.match(/^\|\s*\*\*.+$/gm) ?? [])
    .map((row) => row.split('|').map((c) => c.trim()).filter(Boolean))
    .filter((cells) => cells.length >= 2)
    .map((cells) => cells[0].replace(/^\*\*|\*\*$/g, '').trim());
}

function collectPrerequisites(filePaths) {
  const prereqs = new Set();
  for (const filePath of filePaths) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    let capture = false;
    for (const line of lines) {
      if (/^(##|###)\s+.*(prerequisites?|requirements?|permissions?|authentication)\b/i.test(line)) {
        capture = true;
        continue;
      }
      if (capture && /^(##|###)\s+/.test(line)) capture = false;
      if (!capture) continue;
      const bullet = line.match(/^[-*]\s+(.+)/)?.[1]?.trim();
      if (bullet) prereqs.add(bullet);
    }
  }
  return Array.from(prereqs).sort();
}

function extractAction(commandPath) {
  const content = fs.readFileSync(commandPath, 'utf8');
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n?/);
  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    name: frontmatter?.[1].match(/(^|\n)name:\s*(.+)$/m)?.[2]?.trim() || path.basename(commandPath, '.md'),
    description: frontmatter?.[1].match(/(^|\n)description:\s*(.+)$/m)?.[2]?.trim() || h1 || '',
    source: toRepoPath(commandPath)
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertFileExists(filePath, pluginName, label) {
  if (fs.existsSync(filePath)) return true;
  fail(`Missing ${label} for "${pluginName}": ${toRepoPath(filePath)}.`);
  return false;
}

function toRepoPath(absolutePath) {
  return path.relative(rootDir, absolutePath) || '.';
}

function fail(message) {
  hasError = true;
  console.error(message);
}
