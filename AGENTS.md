# Working in Claude-m

This is a Claude plugin marketplace. Markdown under plugin `skills/`,
`commands/`, and `agents/` is shipped behavior, not contributor documentation.

- `.claude-plugin/marketplace.json` owns install names, source paths and
  categories. Per-plugin `.claude-plugin/plugin.json` owns descriptions;
  `node scripts/sync-marketplace.mjs` previews synchronization and `--write`
  applies it. Keep the marketplace name `claude-m-microsoft-marketplace` stable.
- Most plugins live at the root; the original MCP bundles live under `plugins/`
  and share TypeScript source in `src/`. `ms-graph-omni/` is a separate package.
  Its `CLAUDE.md` is a manifest-loaded product entry point; preserve that loader.
- Knowledge plugins need commands and discoverable skills. MCP, hook and LSP
  plugins have different valid shapes; see `scripts/validate-plugins.mjs`.
  Keep first-party marketplace entries strict and repair schema errors rather
  than disabling validation.
- Cross-plugin identity scoping and output redaction follow
  [the integration context contract](docs/integration-context.md). Preserve
  explicit tenant, subscription, cloud and permission checks before API calls;
  never expose secrets or unredacted sensitive identifiers in reports.
- [Fabric item ownership](docs/fabric-item-coverage-matrix.md) is parsed by tests
  and routes overlapping plugin surfaces. Update it with ownership changes.
- Repository changes do not authorize tenant provisioning, consent, deployment
  or release. Plugin setup commands can have those effects; read their scope.

Use `bun install` for root development. Run the relevant validators in
[README.md](README.md#development), `bun run lint`, and `bun run test --runInBand`.
The root Jest configuration excludes `ms-graph-omni`; changes there need its
own package checks. Keep durable contributor constraints here and use source,
manifests and tests for implementation catalogs.
