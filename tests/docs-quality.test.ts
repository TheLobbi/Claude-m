import fs from "node:fs";
import path from "node:path";

type MarketplacePlugin = {
  name: string;
  source: string | { source: string; [key: string]: unknown };
};

const repoRoot = path.resolve(__dirname, "..");
const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function getLocalMarketplacePlugins(): Array<MarketplacePlugin & { source: string }> {
  const marketplace = readJson<{ plugins: MarketplacePlugin[] }>(marketplacePath);
  return marketplace.plugins.filter(
    (plugin): plugin is MarketplacePlugin & { source: string } =>
      typeof plugin.source === "string" && plugin.source.startsWith("./")
  );
}

function getMarkdownFilesInDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(dirPath, entry.name));
}

function hasFrontmatter(content: string): boolean {
  return /^---\n[\s\S]*?\n---\n/.test(content);
}

function getFrontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  return match ? match[1] : "";
}

describe("Documentation quality guardrails", () => {
  const localPlugins = getLocalMarketplacePlugins();

  test("local marketplace plugins have matching directory and README", () => {
    expect(localPlugins.length).toBeGreaterThan(0);

    for (const plugin of localPlugins) {
      const directoryName = plugin.source.replace(/^\.\//, "");
      const pluginDir = path.join(repoRoot, directoryName);

      // Plugins nested under a shared "plugins/" directory may use
      // compact folder names (for example, plugins/teams for
      // microsoft-teams-mcp). Only enforce folder == plugin.name for
      // top-level plugin folders.
      const isTopLevel = !directoryName.includes("/");
      if (isTopLevel) {
        expect(directoryName).toBe(plugin.name);
      }
      expect(fs.existsSync(pluginDir)).toBe(true);
      expect(fs.statSync(pluginDir).isDirectory()).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, "README.md"))).toBe(true);
    }
  });

  test("command files include frontmatter and minimum required sections", () => {
    const commandFiles: string[] = [];

    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      commandFiles.push(...getMarkdownFilesInDir(path.join(pluginDir, "commands")));
    }

    expect(commandFiles.length).toBeGreaterThan(0);

    for (const filePath of commandFiles) {
      const content = fs.readFileSync(filePath, "utf8");

      expect(hasFrontmatter(content)).toBe(true);
      // Accept H1 OR H2 as the minimum title/section heading. The
      // validator already requires at least one H2; an H1 is encouraged
      // but not strictly required by Claude Code's command spec.
      expect(content).toMatch(/^#{1,2}\s+.+/m);
      const hasSecondarySection = /^##\s+.+/m.test(content);
      const hasOrderedInstructionList = /^\d+\.\s+.+/m.test(content);
      expect(hasSecondarySection || hasOrderedInstructionList).toBe(true);
    }
  });

  test("every local plugin has at least one SKILL trigger phrase section", () => {
    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      // MCP-server bundle plugins (with package.json or .mcp.json) and
      // hook-only plugins are valid plugin shapes per the Claude Code spec
      // and don't require skill docs.
      const isInfrastructurePlugin =
        fs.existsSync(path.join(pluginDir, "package.json")) ||
        fs.existsSync(path.join(pluginDir, ".mcp.json")) ||
        fs.existsSync(path.join(pluginDir, "hooks"));
      if (isInfrastructurePlugin) continue;

      const skillsRoot = path.join(pluginDir, "skills");
      const nestedSkillDocs = fs.existsSync(skillsRoot)
        ? fs
            .readdirSync(skillsRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .flatMap((entry) => getMarkdownFilesInDir(path.join(skillsRoot, entry.name)))
            .filter((file) => path.basename(file) === "SKILL.md")
        : [];

      const skillDocs = getMarkdownFilesInDir(skillsRoot).concat(nestedSkillDocs);

      expect(skillDocs.length).toBeGreaterThan(0);

      const hasTriggerSection = skillDocs.some((skillPath) => {
        const content = fs.readFileSync(skillPath, "utf8");
        const frontmatter = getFrontmatter(content);

        const hasFrontmatterTriggerList = /(?:^|\n)triggers:\s*(?:\n\s*-\s+.+)+/i.test(frontmatter);
        const hasTriggerHeading = /^##\s+(Trigger Phrases?|When to (Activate|Use))\b/im.test(content);
        // Many SKILL files embed trigger phrases inline in the description
        // frontmatter using natural language ("Trigger on:", "Activate
        // when:") instead of a separate triggers list.
        const hasInlineTriggerCue = /(trigger on|activate when|trigger phrases?)\b/i.test(frontmatter);

        return hasFrontmatterTriggerList || hasTriggerHeading || hasInlineTriggerCue;
      });

      expect(hasTriggerSection).toBe(true);
    }
  });

  test("reviewer agents include explicit output format blocks", () => {
    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      const agentsDir = path.join(pluginDir, "agents");
      const reviewerAgents = getMarkdownFilesInDir(agentsDir).filter((filePath) =>
        /review/i.test(path.basename(filePath))
      );

      // Reviewer agents must declare a structured output. Accept any of:
      //  - an explicit output-format-style heading ("Output Format",
      //    "Review Output Format", "Strict Output Format", "Required
      //    Output Template", "Code Review Report", etc.)
      //  - a fenced template block whose body contains canonical review
      //    section labels ("Review Summary", "Issues Found", "Overall",
      //    "Pass/Fail", "Severity", "Recommendation")
      //  - a "Review Process" / "Review Phases" structure with sub-phases
      //    that include a final "Report" or "Output" phase
      const outputHeadingRe =
        /(##|###)\s*(?:(?:required|strict)\s+)?(?:review\s+)?(output(?:\s+format|\s+template)?|review output|report format|response format|code review report)\b/i;
      const templateBlockRe =
        /```[\s\S]{0,4000}?(review summary|issues found|overall|pass\/?fail|severity|recommendation)[\s\S]*?```/i;
      const phaseReportRe =
        /(##|###|####)\s*(?:phase\s+\d+\s*:?\s*)?(report|output|summary)\b/i;

      for (const reviewerPath of reviewerAgents) {
        const content = fs.readFileSync(reviewerPath, "utf8");
        const hasOutputShape =
          outputHeadingRe.test(content) ||
          templateBlockRe.test(content) ||
          phaseReportRe.test(content);
        expect(hasOutputShape).toBe(true);
      }
    }
  });

  test("install slugs are consistent across marketplace.json and plugin manifests", () => {
    const marketplace = readJson<{ plugins: MarketplacePlugin[] }>(marketplacePath);
    const marketplaceSlugs = new Set(marketplace.plugins.map((plugin) => plugin.name));

    for (const plugin of localPlugins) {
      const pluginDir = path.join(repoRoot, plugin.source.replace(/^\.\//, ""));
      const pluginManifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
      const manifest = readJson<{ name: string }>(pluginManifestPath);

      expect(manifest.name).toBe(plugin.name);
      expect(marketplaceSlugs.has(manifest.name)).toBe(true);
    }
  });
});
