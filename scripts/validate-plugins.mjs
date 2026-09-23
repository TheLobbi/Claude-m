import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const marketplacePath = path.join(rootDir, '.claude-plugin', 'marketplace.json');

const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));

let hasError = false;

for (const pluginEntry of marketplace.plugins ?? []) {
  if (typeof pluginEntry.source !== 'string' || !pluginEntry.source.startsWith('./')) {
    continue;
  }

  const pluginDir = path.join(rootDir, pluginEntry.source.slice(2));
  const manifestPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  const readmePath = path.join(pluginDir, 'README.md');
  const commandsDir = path.join(pluginDir, 'commands');
  const skillsDir = path.join(pluginDir, 'skills');

  if (!fs.existsSync(pluginDir) || !fs.statSync(pluginDir).isDirectory()) {
    fail(`Marketplace source directory does not exist: ${pluginEntry.source}`);
    continue;
  }

  if (!fs.existsSync(manifestPath)) {
    fail(`Missing required file ${toRepoPath(manifestPath)} for plugin ${pluginEntry.name}`);
    continue;
  }

  if (!fs.existsSync(readmePath)) {
    fail(`Missing required file ${toRepoPath(readmePath)} for plugin ${pluginEntry.name}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Detect plugin shape per Claude Code plugin spec: a plugin can ship any
  // mix of skills, commands, agents, hooks, MCP servers, or LSP servers.
  // MCP-bundle plugins (with package.json or .mcp.json) and hook-only plugins
  // are valid even without skills/commands. Knowledge plugins must still
  // include both skills and commands.
  const hasPackageJson = fs.existsSync(path.join(pluginDir, 'package.json'));
  const hasMcpConfig = fs.existsSync(path.join(pluginDir, '.mcp.json'));
  const declaresMcpServers = manifest.mcpServers && Object.keys(manifest.mcpServers).length > 0;
  const declaresLspServers = manifest.lspServers && Object.keys(manifest.lspServers).length > 0;
  const declaresHooks = manifest.hooks || fs.existsSync(path.join(pluginDir, 'hooks'));
  const isMcpPlugin = hasPackageJson || hasMcpConfig || declaresMcpServers;
  const isInfrastructurePlugin = isMcpPlugin || declaresLspServers || declaresHooks;

  // .mcp.json must wrap servers under "mcpServers" per the Claude Code plugin spec.
  if (hasMcpConfig) {
    try {
      const mcp = JSON.parse(fs.readFileSync(path.join(pluginDir, '.mcp.json'), 'utf8'));
      if (!mcp || typeof mcp.mcpServers !== 'object' || mcp.mcpServers === null) {
        fail(`.mcp.json in ${toRepoPath(pluginDir)} must wrap servers under top-level "mcpServers" key`);
      }
    } catch (err) {
      fail(`Could not parse .mcp.json in ${toRepoPath(pluginDir)}: ${err.message}`);
    }
  }

  // hooks/hooks.json (or any hooks file referenced by manifest.hooks as a string)
  // must wrap event handlers under a top-level "hooks" key.
  const hookFilePaths = [];
  const defaultHooksFile = path.join(pluginDir, 'hooks', 'hooks.json');
  if (fs.existsSync(defaultHooksFile) && fs.statSync(defaultHooksFile).isFile()) {
    hookFilePaths.push(defaultHooksFile);
  }
  if (typeof manifest.hooks === 'string') {
    const hp = path.join(pluginDir, manifest.hooks);
    if (fs.existsSync(hp) && fs.statSync(hp).isFile() && !hookFilePaths.includes(hp)) {
      hookFilePaths.push(hp);
    }
  }
  for (const hp of hookFilePaths) {
    try {
      const h = JSON.parse(fs.readFileSync(hp, 'utf8'));
      if (!h || typeof h.hooks !== 'object' || h.hooks === null) {
        fail(`Hook file ${toRepoPath(hp)} must wrap event handlers under top-level "hooks" key`);
      }
    } catch (err) {
      fail(`Could not parse hook file ${toRepoPath(hp)}: ${err.message}`);
    }
  }

  // Bundled MCP plugins (package.json + dist/) need a runnable mcpServers
  // declaration in the manifest, otherwise Claude Code never starts the server.
  if (hasPackageJson && !declaresMcpServers && !hasMcpConfig) {
    fail(`Plugin ${pluginEntry.name} ships an MCP bundle (package.json) but does not declare mcpServers in plugin.json or a .mcp.json file`);
  }

  if (!isInfrastructurePlugin) {
    if (!fs.existsSync(skillsDir) || !hasSkillFile(skillsDir)) {
      fail(`Missing required skills/*/SKILL.md in ${toRepoPath(pluginDir)} for plugin ${pluginEntry.name}`);
    }
  }

  const commandFiles = getMarkdownFiles(commandsDir);
  if (!isInfrastructurePlugin && commandFiles.length === 0) {
    fail(`Missing required commands/*.md in ${toRepoPath(pluginDir)} for plugin ${pluginEntry.name}`);
  }

  const hasReviewerSupport = Array.isArray(manifest.agents) && manifest.agents.some((agentPath) => /reviewer/i.test(agentPath));
  if (hasReviewerSupport) {
    const reviewerAgentFiles = getMarkdownFiles(path.join(pluginDir, 'agents')).filter((agentPath) => /reviewer/i.test(agentPath));
    if (reviewerAgentFiles.length === 0) {
      fail(`Plugin ${pluginEntry.name} declares reviewer support but has no agents/*.md reviewer file`);
    }
  }

  const manifestName = manifest.name;
  if (manifestName !== pluginEntry.name) {
    fail(`Name mismatch for ${pluginEntry.source}: marketplace name is "${pluginEntry.name}" but manifest name is "${manifestName}"`);
  }

  for (const commandPath of commandFiles) {
    lintCommand(commandPath);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('Knowledge plugin validation passed.');

function hasSkillFile(skillsDir) {
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return false;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      return true;
    }
  }

  return false;
}

function getMarkdownFiles(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(directory, entry.name));
}

function lintCommand(commandPath) {
  const content = fs.readFileSync(commandPath, 'utf8');

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    fail(`Missing YAML frontmatter block in ${toRepoPath(commandPath)}`);
    return;
  }

  const frontmatter = frontmatterMatch[1];
  if (!/^description:/m.test(frontmatter)) {
    fail(`Command frontmatter missing "description" in ${toRepoPath(commandPath)}`);
  }

  if (!/^allowed-tools:/m.test(frontmatter)) {
    fail(`Command frontmatter missing "allowed-tools" in ${toRepoPath(commandPath)}`);
  }

  const body = content.slice(frontmatterMatch[0].length);
  if (!/^##\s+/m.test(body)) {
    fail(`Command doc must include at least one H2 section (## ...) in ${toRepoPath(commandPath)}`);
  }

  // Accept any of: numbered list, bullet list, numbered step headings, or
  // three-or-more H2/H3 sections (a sectioned procedure). Each form
  // expresses deterministic, ordered steps in different syntaxes.
  const hasNumberedList = /^\d+\.\s+/m.test(body);
  const hasBulletList = /^[-*]\s+/m.test(body);
  const hasStepHeadings = /^#{2,3}\s+(?:Step\s+)?\d+[.:]/im.test(body);
  const sectionHeadings = body.match(/^#{2,3}\s+\S/gm) || [];
  const hasMultiSectionProcedure = sectionHeadings.length >= 3;
  if (!hasNumberedList && !hasBulletList && !hasStepHeadings && !hasMultiSectionProcedure) {
    fail(`Command doc should include deterministic steps/checks as a list in ${toRepoPath(commandPath)}`);
  }
}

function toRepoPath(absolutePath) {
  return path.relative(rootDir, absolutePath) || '.';
}

function fail(message) {
  hasError = true;
  console.error(message);
}
