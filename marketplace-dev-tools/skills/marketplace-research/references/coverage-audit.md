# Coverage Audit Reference

## Overview

Coverage auditing is the process of systematically identifying gaps between available Microsoft platform APIs and the current plugin catalog. This reference documents the audit methodology, endpoint-to-feature mapping, permission coverage matrix, documentation quality scoring, test scenario identification, validation checklists, and marketplace readiness criteria.

---

## API Surface Coverage Analysis Methodology

### Step 1 — Enumerate Available API Surface

```bash
# Fetch Graph API metadata and list all top-level entity sets
curl -s "https://graph.microsoft.com/v1.0/\$metadata" \
  | grep -oP 'Name="[^"]*"' \
  | sort -u > graph_v1_entities.txt

# Compare beta to v1.0 for gaps
curl -s "https://graph.microsoft.com/beta/\$metadata" \
  | grep -oP 'Name="[^"]*"' \
  | sort -u > graph_beta_entities.txt

diff graph_v1_entities.txt graph_beta_entities.txt > gap_candidates.txt

# For Dataverse — list all standard entities
GET https://org.crm.dynamics.com/api/data/v9.2/EntityDefinitions?\$select=LogicalName,DisplayName,IsCustomizable
```

### Step 2 — Map API Surface to Existing Plugins

For each plugin in the marketplace, extract the endpoints it covers:

```python
import re
from pathlib import Path

def extract_endpoints_from_skill(skill_path: str) -> list[dict]:
    """Extract all REST endpoints documented in a SKILL.md or reference file."""
    content = Path(skill_path).read_text(encoding="utf-8")
    endpoints = []

    # Pattern: | GET | /endpoint | ...
    table_pattern = re.compile(
        r'\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*(`?)([^|`]+)\2\s*\|'
    )
    for match in table_pattern.finditer(content):
        endpoints.append({
            "method": match.group(1),
            "endpoint": match.group(3).strip(),
            "file": skill_path,
        })

    # Pattern: axios.get|post|etc calls
    code_pattern = re.compile(
        r'axios\.(get|post|put|patch|delete)\(["\']([^"\']+)["\']'
    )
    for match in code_pattern.finditer(content):
        endpoints.append({
            "method": match.group(1).upper(),
            "endpoint": match.group(2),
            "file": skill_path,
        })

    return endpoints


def audit_plugin_coverage(plugin_root: str) -> dict:
    """Audit all reference files in a plugin for API coverage."""
    root = Path(plugin_root)
    all_endpoints = []

    for skill_md in root.rglob("SKILL.md"):
        all_endpoints.extend(extract_endpoints_from_skill(str(skill_md)))

    for ref_file in (root / "skills").rglob("references/*.md"):
        all_endpoints.extend(extract_endpoints_from_skill(str(ref_file)))

    return {
        "plugin": plugin_root,
        "total_endpoints": len(all_endpoints),
        "endpoints": all_endpoints,
    }
```

---

## Capability Gap Identification

### Gap Analysis Template

| API Surface Area | Total Operations | Covered in Plugin | Gap Count | Priority |
|---|---|---|---|---|
| Graph Mail | 28 | 12 | 16 | Medium |
| Graph Calendar | 22 | 8 | 14 | High |
| Graph Teams | 85 | 45 | 40 | High |
| Dataverse Web API | 150+ | 60 | 90+ | Medium |
| Power Automate | 35 | 20 | 15 | Low |
| Azure Monitor | 40 | 10 | 30 | Medium |

### Gap Prioritization Criteria

| Priority | Criteria |
|---|---|
| P1 — Critical | Core CRUD operations missing; plugin unusable without them |
| P2 — High | Common production scenarios not covered |
| P3 — Medium | Advanced features; useful for power users |
| P4 — Low | Edge cases; rarely needed in practice |

---

## Endpoint-to-Feature Mapping

### Mapping Template

```yaml
# coverage-map.yaml — canonical source of truth for a plugin's coverage
plugin: microsoft-outlook-mcp
version: 1.2.0
mapping:
  - feature: "Read inbox messages"
    endpoints:
      - method: GET
        url: /me/messages
        covered: true
        reference: skills/outlook/references/mail-operations.md
  - feature: "Send email"
    endpoints:
      - method: POST
        url: /me/sendMail
        covered: true
        reference: commands/send-email.md
  - feature: "Create email draft"
    endpoints:
      - method: POST
        url: /me/messages
        covered: false
        notes: "Only sendMail is implemented; draft creation is a gap"
  - feature: "Manage mail rules"
    endpoints:
      - method: GET
        url: /me/mailFolders/{id}/messageRules
        covered: false
        priority: P3
```

---

## Permission Coverage Matrix

### Audit Permissions Documented per Plugin

```python
import yaml
import re
from pathlib import Path

def extract_permissions_from_file(file_path: str) -> set[str]:
    """Extract OAuth permission scopes mentioned in a file."""
    content = Path(file_path).read_text(encoding="utf-8")
    # Common patterns: User.Read, Files.Read.All, etc.
    pattern = re.compile(
        r'\b([A-Z][a-zA-Z]*(?:\.[A-Z][a-zA-Z]*)+(?:\.All)?)\b'
    )
    return {
        m.group(1) for m in pattern.finditer(content)
        if "." in m.group(1) and not m.group(1).startswith("http")
    }


def build_permission_matrix(plugins_root: str) -> dict:
    """Build a matrix of which permissions each plugin uses."""
    root = Path(plugins_root)
    matrix = {}

    for plugin_dir in root.iterdir():
        if not plugin_dir.is_dir():
            continue

        all_perms: set[str] = set()
        for md_file in plugin_dir.rglob("*.md"):
            all_perms |= extract_permissions_from_file(str(md_file))

        matrix[plugin_dir.name] = sorted(all_perms)

    return matrix
```

### Permission Coverage Table (Sample)

| Permission | Plugins Using It | Admin Consent Required |
|---|---|---|
| `User.Read` | m365-admin, entra-id-security, license-optimizer | No |
| `User.ReadWrite.All` | m365-admin, entra-id-security | Yes |
| `Mail.Read` | microsoft-outlook-mcp, exchange-mailflow | No |
| `Mail.Send` | microsoft-outlook-mcp, servicedesk-runbooks | No |
| `Files.ReadWrite.All` | microsoft-sharepoint-mcp, onedrive | No |
| `AuditLog.Read.All` | purview-compliance, sharing-auditor | Yes |
| `Policy.Read.All` | azure-policy-security, entra-id-security | Yes |
| `DeviceManagementManagedDevices.ReadWrite.All` | m365-admin | Yes |

---

## SDK vs REST Coverage Comparison

| Approach | Pros | Cons | Use When |
|---|---|---|---|
| REST (direct `fetch`/`axios`) | Maximum control, no SDK overhead | Verbose; must handle pagination/retry manually | Edge cases, beta endpoints |
| Graph SDK (`@microsoft/microsoft-graph-client`) | Retry middleware, pagination helpers, type safety | SDK may lag behind beta endpoints | Standard v1.0 Graph operations |
| Azure SDK (`@azure/arm-*`) | ARM-specific resource types covered | Different auth model | Azure resource management |
| Power Platform SDK | Dataverse-specific helpers | Limited TypeScript support | Dataverse entity operations |
| CLI (`az`, `m365`, `pac`) | Easy for script-style commands | Hard to parse output programmatically | Interactive/Bash commands |

---

## Documentation Quality Scoring Rubric

Score each plugin from 0–100 using this rubric:

| Category | Max Points | Scoring |
|---|---|---|
| SKILL.md completeness | 20 | 20=all sections present; 10=missing references; 0=frontmatter only |
| Trigger phrase coverage | 10 | 10=10+ triggers; 5=5–9; 0=<5 |
| REST API tables | 20 | 20=all operations tabulated; 10=partial; 0=none |
| Code examples | 15 | 15=runnable TS/Python examples; 8=pseudocode; 0=none |
| Error code documentation | 10 | 10=complete error table; 5=partial; 0=none |
| Limits documentation | 10 | 10=complete limits table; 5=partial; 0=none |
| Progressive disclosure refs | 15 | 15=all topics covered; 8=some; 0=none |

### Quality Score Interpretation

| Score | Status | Action |
|---|---|---|
| 90–100 | Excellent | Ready for marketplace |
| 75–89 | Good | Minor improvements needed |
| 50–74 | Acceptable | Fill gaps in weaker categories |
| 25–49 | Needs work | Major documentation effort required |
| 0–24 | Insufficient | Rebuild documentation from scratch |

---

## Test Scenario Identification

### Scenario Generation Template

For each plugin, generate test scenarios by combining:
- Entity type (e.g., User, Message, Site, Pipeline)
- Operation (e.g., list, get, create, update, delete)
- Filter/scope (e.g., by date, by status, by owner)
- Error condition (e.g., not found, unauthorized, throttled)

```python
def generate_test_scenarios(plugin_coverage: dict) -> list[dict]:
    """Generate test scenarios from a plugin's endpoint coverage."""
    scenarios = []
    for feature in plugin_coverage.get("mapping", []):
        if not feature.get("covered"):
            continue
        # Happy path
        scenarios.append({
            "name": f"Happy path: {feature['feature']}",
            "type": "happy_path",
            "feature": feature["feature"],
            "expected": "Success with valid data",
        })
        # Not found
        scenarios.append({
            "name": f"Not found: {feature['feature']}",
            "type": "error",
            "feature": feature["feature"],
            "condition": "Non-existent ID",
            "expected": "404 error with helpful message",
        })
        # Unauthorized
        scenarios.append({
            "name": f"Unauthorized: {feature['feature']}",
            "type": "error",
            "feature": feature["feature"],
            "condition": "Missing required permission",
            "expected": "Clear permission error message",
        })
        # Throttled
        scenarios.append({
            "name": f"Throttled: {feature['feature']}",
            "type": "resilience",
            "feature": feature["feature"],
            "condition": "429 Too Many Requests",
            "expected": "Retry with backoff; succeed within 3 attempts",
        })
    return scenarios
```

---

## Validation Checklist

```bash
# Plugin structure validation
[ ] .claude-plugin/plugin.json exists and is valid JSON
[ ] All paths in plugin.json resolve to existing files
[ ] SKILL.md frontmatter is valid YAML
[ ] All triggers are lowercase
[ ] commands/*.md files have valid frontmatter
[ ] agents/*.md files have valid frontmatter

# Content quality validation
[ ] SKILL.md has an Overview or introduction section
[ ] At least one REST API table exists
[ ] At least one code example exists
[ ] Error codes table exists
[ ] Limits table exists
[ ] Progressive Disclosure section at bottom of SKILL.md

# Reference file validation
[ ] Each reference file is 200–500 lines
[ ] All reference files are linked from SKILL.md progressive disclosure table
[ ] Code snippets compile/run without modification
[ ] No hardcoded credentials or real tenant IDs

# Marketplace readiness
[ ] Plugin listed in .claude-plugin/marketplace.json
[ ] README.md has installation instructions
[ ] Capability graph artifact updated (artifacts/capability-graph.json)
[ ] LF line endings (not CRLF)
```

---

## Marketplace Readiness Criteria

A plugin is marketplace-ready when it meets ALL of the following:

| Criterion | Check |
|---|---|
| Documentation quality score >= 75 | Pass plugin through scoring rubric |
| All required files present | Validated by `npm run validate:all` |
| At least 1 command with examples | Enables immediate user action |
| Error handling documented | Users can self-diagnose failures |
| Permissions clearly listed | Admin can evaluate consent requirements |
| No breaking changes to existing plugins | Check capability graph for conflicts |
| README.md installation instructions complete | User can onboard in < 5 minutes |

---

## Error Codes

| Error | Meaning | Remediation |
|-------|---------|-------------|
| Validation parse error | plugin.json or SKILL.md frontmatter invalid | Fix YAML/JSON syntax; run validation |
| Missing required file | plugin.json path doesn't match actual file | Rename file or update plugin.json |
| Coverage gap (P1) | Core operation undocumented | Add endpoint table and code example |
| Coverage gap (P2) | Common operation undocumented | Add to reference file |
| Quality score < 50 | Documentation insufficient | Use scaffolding template to fill sections |
| Line ending error | CRLF detected | Convert: `dos2unix **/*.md` |
| Broken code example | Syntax error in code block | Test examples in isolated environment |

---

## Limits

| Resource | Limit | Notes |
|---|---|---|
| Plugins per marketplace.json | No hard limit | Current catalog: 50+ plugins |
| Capability graph nodes | No hard limit | Large graphs may slow validation |
| Coverage map YAML | No size limit | Recommend < 1,000 lines per plugin map |
| Quality audit run time | ~5 minutes for full catalog | Run per-plugin during development |
| Test scenario count | No limit; target 5–10 per feature | More is better for edge case coverage |
| Permission matrix entries | No hard limit | Grows linearly with API surface |
