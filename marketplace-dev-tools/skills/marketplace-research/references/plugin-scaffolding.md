# Plugin Scaffolding Reference

## Overview

This reference documents the canonical directory structure, file formats, frontmatter schemas, and conventions for creating new Claude-m marketplace plugins. It is the authoritative guide for the `marketplace-dev-tools` skill when scaffolding new plugins or reviewing existing ones for compliance.

---

## Plugin Directory Structure

```
<plugin-slug>/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (install metadata)
├── agents/
│   └── <agent-name>.md          # Agent definition files (optional)
├── commands/
│   └── <command-name>.md        # Command definition files
├── hooks/
│   └── <hook-name>.md           # Hook definition files (optional)
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md             # Primary skill knowledge base
│       └── references/
│           └── <topic>.md       # Progressive disclosure reference files
├── workflows/
│   └── <workflow-name>.md       # Cross-plugin workflow definitions (optional)
└── README.md                    # Human-readable plugin overview
```

### Required Files

| File | Required | Notes |
|------|----------|-------|
| `.claude-plugin/plugin.json` | Yes | Install manifest |
| `skills/<name>/SKILL.md` | Yes | Core skill knowledge |
| `commands/<name>.md` | Recommended | At least one command |
| `README.md` | Yes | Documentation |

---

## plugin.json Manifest Schema

```json
{
  "name": "plugin-slug",
  "version": "1.0.0",
  "description": "One-sentence description of what this plugin enables",
  "publisher": "publisher-handle",
  "repository": "https://github.com/publisher/repo",
  "capabilities": [
    "list-capability-one",
    "list-capability-two"
  ],
  "category": "cloud | productivity | analytics | devops | security",
  "skills": [
    {
      "name": "skill-name",
      "path": "skills/skill-name/SKILL.md"
    }
  ],
  "commands": [
    {
      "name": "command-name",
      "path": "commands/command-name.md"
    }
  ],
  "agents": [
    {
      "name": "agent-name",
      "path": "agents/agent-name.md"
    }
  ],
  "hooks": [
    {
      "name": "hook-name",
      "path": "hooks/hook-name.md",
      "trigger": "setup | teardown | pre-command | post-command"
    }
  ],
  "dependencies": [],
  "minClaudeVersion": "3.5",
  "tags": ["azure", "microsoft", "cloud"]
}
```

---

## SKILL.md Template

```markdown
---
name: <Skill Display Name>
description: >
  <2-3 sentence description of what this skill enables.
  Include the primary API surface (e.g., "Microsoft Graph v1.0"),
  the entity types it manages, and the operations it supports.>
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - <primary keyword>
  - <secondary keyword>
  - <entity name>
  - <operation verb>
---

# <Skill Display Name>

## Overview

<2-3 paragraph overview of the service/API. Include:>
- What the service does
- Authentication requirements (OAuth scopes, admin consent)
- Base URL pattern and API version

## REST API Overview

Base URL: `https://...`
Authentication: `Bearer <token>` with scope `...`

## Core Operations

| Operation | Method | Endpoint | Notes |
|---|---|---|---|
| List ... | GET | `/entities` | Pagination via @odata.nextLink |
| Get ... | GET | `/entities/{id}` | |
| Create ... | POST | `/entities` | Body: JSON |
| Update ... | PATCH | `/entities/{id}` | |
| Delete ... | DELETE | `/entities/{id}` | |

## Code Examples

\`\`\`typescript
// Primary operation example
\`\`\`

## Best Practices

- ...
- ...

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| <topic description> | [\`references/<file>.md\`](./references/<file>.md) |
```

---

## Command Frontmatter YAML Schema

```yaml
---
name: command-name
description: One-line description of what this command does (shown in autocomplete)
skill: skill-name        # Must match a skill name in skills/
parameters:
  - name: resourceGroup
    description: Azure resource group name
    required: true
    type: string
  - name: subscriptionId
    description: Azure subscription ID
    required: false
    type: string
    default: ""
examples:
  - description: List all resources in a resource group
    value: "list all resources in resource group 'prod-rg'"
  - description: Filter by resource type
    value: "list Virtual Machines in resource group 'prod-rg'"
permissions:
  - scope: User.Read
    type: delegated
  - scope: Directory.Read.All
    type: application
---

# <Command Display Name>

## Purpose

<What this command does and when to use it.>

## Usage

```text
<Example invocation>
```

## Steps

1. <Step 1>
2. <Step 2>
3. <Step 3>

## Output

<Describe the expected output format.>

## Error Handling

| Error | Meaning | Resolution |
|-------|---------|------------|
| ... | ... | ... |
```

---

## Agent Frontmatter YAML Schema

```yaml
---
name: agent-name
description: One-line description of the agent's purpose
model: claude-opus-4-5      # or claude-sonnet-4-5
skills:
  - skill-name-1
  - skill-name-2
tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
system_prompt: |
  You are a specialized agent for <purpose>.

  Your primary responsibilities:
  - <responsibility 1>
  - <responsibility 2>

  Always:
  - <always rule 1>
  - <always rule 2>

  Never:
  - <never rule 1>
max_turns: 20
---

# <Agent Display Name>

## Purpose

<What this agent does autonomously.>

## Trigger Scenarios

- <When to invoke this agent>
- <Another scenario>

## Capabilities

- <capability 1>
- <capability 2>
```

---

## Hook Configuration Schema

```yaml
---
name: hook-name
trigger: setup | teardown | pre-command | post-command
description: What this hook does
skill: skill-name
---

# Hook: <Name>

## Trigger

Runs on: `<trigger event>`

## Purpose

<Why this hook is needed and what it configures.>

## Steps

<What the hook does step by step.>
```

---

## Reference File Naming Conventions

| Pattern | Use For | Example |
|---------|---------|---------|
| `<entity>-operations.md` | CRUD operations for a primary entity | `message-operations.md` |
| `<protocol>-reference.md` | Protocol or API reference | `fetchxml-reference.md` |
| `<feature>-patterns.md` | Design patterns | `retry-patterns.md` |
| `<service>-reference.md` | Service-specific deep dive | `exchange-reference.md` |
| `operational-knowledge.md` | Limits, errors, troubleshooting | `operational-knowledge.md` |
| `authentication.md` | Auth flows and credential setup | `authentication.md` |

---

## MCP Server Integration Pattern

For plugins that expose tools via Model Context Protocol (MCP):

```json
// .claude-plugin/plugin.json addition
{
  "mcpServers": [
    {
      "name": "my-service-mcp",
      "command": "npx",
      "args": ["-y", "@publisher/my-service-mcp@latest"],
      "env": {
        "MY_SERVICE_API_KEY": "${MY_SERVICE_API_KEY}"
      }
    }
  ]
}
```

---

## Progressive Disclosure Implementation Guide

Every plugin SKILL.md should end with a "Progressive Disclosure — Reference Files" section:

```markdown
## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Operational knowledge (errors, limits, safe defaults) | [`references/operational-knowledge.md`](./references/operational-knowledge.md) |
| Core entity operations | [`references/entity-operations.md`](./references/entity-operations.md) |
| Authentication and permissions | [`references/authentication.md`](./references/authentication.md) |
```

**Reference file quality standard:**
- 200–500 lines
- Full REST API/SDK endpoint tables (Method, Endpoint, Permissions, Parameters, Notes)
- Complete TypeScript/PowerShell/Python code examples
- Error codes table (Code, Meaning, Remediation)
- Limits table (Resource, Limit, Notes)
- Common patterns and gotchas section (at least 5–10 items)

---

## Validation Checklist for New Plugins

```bash
# Run built-in validation
npm run validate:all

# Manual checklist:
# [ ] plugin.json has all required fields (name, version, description, skills, commands)
# [ ] SKILL.md has valid frontmatter (name, description, allowed-tools, triggers)
# [ ] At least one command file with valid frontmatter
# [ ] README.md exists and has installation instructions
# [ ] All file paths in plugin.json exist on disk
# [ ] No Windows-style CRLF line endings (use LF)
# [ ] All code snippets are syntactically valid
# [ ] Triggers list covers primary use cases (at least 5 phrases)
# [ ] Progressive disclosure section in SKILL.md
# [ ] Reference files are 200–500 lines
# [ ] No hardcoded secrets or real credentials in examples
```

---

## Common Scaffolding Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Validation fails on `plugin.json` | Missing required field | Check schema; add `name`, `version`, `description` |
| SKILL.md frontmatter parse error | YAML syntax error | Validate YAML; check for unescaped colons in strings |
| Command not found in plugin | `commands` array in `plugin.json` missing entry | Add `{ "name": "...", "path": "commands/..." }` |
| Skill triggers not matching | Triggers too specific or misspelled | Use common synonyms; include entity names and operation verbs |
| Reference file not linked | Missing from SKILL.md progressive disclosure table | Add row to the table at bottom of SKILL.md |
| Line ending errors | Files saved with CRLF on Windows | Run `git config core.autocrlf false`; convert with `dos2unix` |
| Plugin install fails | Repository URL incorrect in marketplace.json | Verify GitHub repository path and branch |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| SKILL.md size | No hard limit; recommend < 2,000 lines | Split into references if larger |
| Reference file size | 200–500 lines target | < 200 = insufficient; > 500 = split into multiple files |
| Triggers per skill | No hard limit; recommend 8–20 | Too few = missed activations; too many = false positives |
| Commands per plugin | No hard limit | Each command needs a separate `.md` file |
| Plugin name length | 64 characters | Used in install slug |
| Plugin version | Semantic versioning required | e.g., `1.0.0`, `2.1.3` |
| MCP server args | No hard limit | Keep startup args minimal |
