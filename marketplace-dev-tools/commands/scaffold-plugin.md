---
name: scaffold-plugin
description: Generate a complete Claude plugin from research output
argument-hint: "<research-json-path> --plugin-name <name> [--category cloud|productivity|analytics|devops|security]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Scaffold a Plugin from Research

Generate a complete Claude Code plugin directory from a research JSON file.

## Instructions

### 1. Load and validate research

Read the research JSON file at the provided path. Validate it contains:
- `service` and `displayName` fields
- At least one area with endpoints
- Permission scopes for each endpoint

If validation fails, report what is missing and exit.

### 2. Derive plugin metadata

From the research JSON, determine:
- **Plugin name**: use `--plugin-name` argument, or derive from `service` (e.g., `microsoft-{service}`)
- **Category**: use `--category` argument, or infer from service type (Graph productivity services = `productivity`, Azure infra = `cloud`, analytics = `analytics`, security = `security`, CI/CD = `devops`)
- **Keywords**: extract from service name, areas, and common tags
- **Triggers**: derive from service name, display name, and area names

### 3. Create directory structure

```
{plugin-name}/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── {plugin-name}/
│       └── SKILL.md
├── commands/
│   ├── {command-1}.md
│   ├── {command-2}.md
│   ├── ...
│   └── setup.md
├── agents/
│   └── {service}-reviewer.md
└── README.md
```

### 4. Generate plugin.json

Use the standard format:
```json
{
  "name": "{plugin-name}",
  "version": "1.0.0",
  "description": "{description from research}",
  "author": { "name": "Markus Ahling" },
  "keywords": [...],
  "skills": ["./skills/{plugin-name}/SKILL.md"],
  "agents": ["./agents/{service}-reviewer.md"],
  "commands": ["./commands/{cmd}.md", ...]
}
```

### 5. Generate SKILL.md

Create a comprehensive skill file containing:
- YAML frontmatter with `name`, `description`, `allowed-tools` (Read, Write, Edit, Glob, Grep, Bash), and `triggers`
- Service overview section
- REST API endpoint tables grouped by area (from research)
- Permission reference table
- Request/response schema examples
- Common patterns section
- Best practices section

### 6. Generate command files

Create one command file per major operation area. Derive command names using the pattern `{service}-{operation}` (e.g., `bookings-list-businesses`, `bookings-create-appointment`).

Group related CRUD operations into single commands where it makes sense (e.g., one command for managing appointments covers create, update, cancel).

Each command file must have:
- YAML frontmatter: `name`, `description`, `argument-hint`, `allowed-tools`
- Step-by-step instructions for the operation
- Required API call details (method, URL, headers, body)
- Expected response handling

Always generate a `setup.md` command with `AskUserQuestion` in `allowed-tools` for auth configuration.

### 7. Generate agent file

Create a reviewer agent with:
- YAML frontmatter: `name`, `description`, `model: inherit`, `color: orange`, `tools` (Read, Grep, Glob)
- Review scope covering API usage, schema correctness, permission handling, and security
- Structured output format (Critical/Warnings/Suggestions)

### 8. Generate README.md

Create a README following the established pattern:
- Plugin title and description
- What this plugin provides (knowledge plugin disclaimer)
- Setup instructions (reference `/setup` command)
- Capabilities table
- Commands table
- Agent table
- Plugin structure tree
- Trigger keywords list
- Author line

### 9. Validate and report

After generating all files:
1. List all created files
2. Verify plugin.json references are correct
3. Display marketplace registration command:
   ```
   Add to .claude-plugin/marketplace.json, then run:
   npm run validate:all
   ```
