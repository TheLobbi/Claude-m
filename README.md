# Claude-m

Microsoft plugins for Claude Code: Azure, Microsoft 365, Fabric, Power Platform,
Dynamics 365 and security. Plugins provide task commands, skills and reviewer
agents; some also ship MCP servers.

## Install

In Claude Code:

```text
/plugin marketplace add markus41/Claude-m
/plugin install microsoft-azure-mcp@claude-m-microsoft-marketplace
```

Use the exact plugin `name` from the
[marketplace manifest](.claude-plugin/marketplace.json). Its `source` points to
the plugin directory, whose README explains setup, permissions and usage.
Credentials and tenant consent are configured separately for each plugin.

If SSH authentication fails, add the marketplace using its HTTPS URL:
`/plugin marketplace add https://github.com/markus41/Claude-m.git`.

To uninstall, use `/plugin uninstall <plugin-name>`. To remove the marketplace
registration, use `/plugin marketplace remove claude-m-microsoft-marketplace`.

## Find a workflow

| Task | Starting points |
|---|---|
| Azure inventory and governance | [Azure MCP](plugins/azure/README.md), [cost governance](azure-cost-governance/README.md), [policy security](azure-policy-security/README.md) |
| Microsoft 365 administration | [M365 admin](m365-admin/README.md), [Graph and Office MCP](ms-graph-omni/README.md) |
| Fabric and Power BI | [Item ownership matrix](docs/fabric-item-coverage-matrix.md), [Power BI](powerbi-fabric/README.md) |
| Identity and compliance | [Entra security](entra-id-security/README.md), [Purview](purview-compliance/README.md), [sharing audit](sharing-auditor/README.md) |
| Power Platform | [Power Apps](powerapps/README.md), [Power Automate](power-automate/README.md), [ALM](powerplatform-alm/README.md) |
| Build a plugin | [Marketplace development tools](marketplace-dev-tools/README.md) |

For workflows spanning plugins, read the
[integration context contract](docs/integration-context.md) and
[multi-plugin runbooks](workflows/multi-plugin-workflows.md).

## Plugin catalog

The complete catalog, install names, categories and source paths live in the
[marketplace manifest](.claude-plugin/marketplace.json). Each entry links to
the plugin's README and manifest; use those product docs for detailed commands,
skills, permissions and examples.

## Development

See [AGENTS.md](AGENTS.md) for repository contracts. Root TypeScript and Jest
support the MCP bundles under `plugins/`; `ms-graph-omni/` has its own package.

```bash
bun install
bun run lint
bun run test --runInBand
node scripts/validate-marketplace.mjs
node scripts/validate-plugins.mjs
node scripts/validate-command-frontmatter.mjs
node scripts/validate-capability-graph.mjs
```

To build the root MCP bundles, run `bun x tsc` followed by
`bun run bundle:mcp-plugins`. Capability validation writes
`artifacts/capability-graph.json`; review generated changes before committing.

When adding or renaming a plugin, update its manifest and the marketplace entry.
Preview description/tag synchronization with `node scripts/sync-marketplace.mjs`
and apply intended changes with `--write`. Update that plugin's usage docs and
run the validators above; use `claude plugin validate <plugin-directory>` for
host validation when the Claude CLI is available.

Original marketplace © Markus Ahling. Plugin licenses are declared in their
manifests. Root package metadata declares ISC; preserve each plugin's attribution
and license metadata.
