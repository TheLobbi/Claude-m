---
name: Marketplace Research
description: >
  Reference knowledge for researching Microsoft Graph APIs, scaffolding Claude Code plugins,
  and auditing marketplace coverage. Contains curated doc URLs, API structure guides,
  research output schemas, plugin templates, and the M365 services catalog.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebFetch
  - WebSearch
triggers:
  - research service
  - scaffold plugin
  - extend plugin
  - audit coverage
  - marketplace dev
  - plugin scaffold
  - graph api research
  - microsoft learn
---

# Marketplace Research

## Microsoft Graph API Documentation Index

### Core Productivity
| Service | API Reference URL |
|---------|-------------------|
| Mail | https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview?view=graph-rest-1.0 |
| Calendar | https://learn.microsoft.com/en-us/graph/api/resources/calendar?view=graph-rest-1.0 |
| Contacts | https://learn.microsoft.com/en-us/graph/api/resources/contact?view=graph-rest-1.0 |
| OneDrive | https://learn.microsoft.com/en-us/graph/api/resources/onedrive?view=graph-rest-1.0 |
| OneNote | https://learn.microsoft.com/en-us/graph/api/resources/onenote-api-overview?view=graph-rest-1.0 |
| To Do | https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0 |
| Planner | https://learn.microsoft.com/en-us/graph/api/resources/planner-overview?view=graph-rest-1.0 |

### Collaboration
| Service | API Reference URL |
|---------|-------------------|
| Teams | https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0 |
| SharePoint | https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0 |
| Outlook Groups | https://learn.microsoft.com/en-us/graph/api/resources/groups-overview?view=graph-rest-1.0 |
| Bookings | https://learn.microsoft.com/en-us/graph/api/resources/booking-api-overview?view=graph-rest-1.0 |
| Forms | https://learn.microsoft.com/en-us/graph/api/resources/forms-overview?view=graph-rest-beta |
| Lists | https://learn.microsoft.com/en-us/graph/api/resources/list?view=graph-rest-1.0 |

### Identity & Access
| Service | API Reference URL |
|---------|-------------------|
| Users | https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0 |
| Groups | https://learn.microsoft.com/en-us/graph/api/resources/group?view=graph-rest-1.0 |
| Applications | https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0 |
| Service Principals | https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal?view=graph-rest-1.0 |
| Conditional Access | https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy?view=graph-rest-1.0 |
| Identity Protection | https://learn.microsoft.com/en-us/graph/api/resources/identityprotection-overview?view=graph-rest-1.0 |

### Security & Compliance
| Service | API Reference URL |
|---------|-------------------|
| Security Alerts | https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview?view=graph-rest-1.0 |
| Compliance | https://learn.microsoft.com/en-us/graph/api/resources/complianceapioverview?view=graph-rest-1.0 |
| eDiscovery | https://learn.microsoft.com/en-us/graph/api/resources/ediscovery-ediscoveryapioverview?view=graph-rest-1.0 |
| Information Protection | https://learn.microsoft.com/en-us/graph/api/resources/informationprotection-overview?view=graph-rest-1.0 |

### Device Management
| Service | API Reference URL |
|---------|-------------------|
| Intune | https://learn.microsoft.com/en-us/graph/api/resources/intune-graph-overview?view=graph-rest-1.0 |
| Cloud PC | https://learn.microsoft.com/en-us/graph/api/resources/cloudpc-api-overview?view=graph-rest-1.0 |

### Analytics & Reports
| Service | API Reference URL |
|---------|-------------------|
| Reports | https://learn.microsoft.com/en-us/graph/api/resources/report?view=graph-rest-1.0 |
| Usage Analytics | https://learn.microsoft.com/en-us/graph/api/resources/microsoft-365-usage-reports-overview?view=graph-rest-1.0 |

### Developer & Platform
| Service | API Reference URL |
|---------|-------------------|
| Webhooks | https://learn.microsoft.com/en-us/graph/api/resources/webhooks?view=graph-rest-1.0 |
| Batch Requests | https://learn.microsoft.com/en-us/graph/json-batching |
| Delta Queries | https://learn.microsoft.com/en-us/graph/delta-query-overview |
| Pagination | https://learn.microsoft.com/en-us/graph/paging |
| Permissions Reference | https://learn.microsoft.com/en-us/graph/permissions-reference |

---

## Graph API Structure Guide

### URL Patterns
- **v1.0 (stable)**: `https://graph.microsoft.com/v1.0/{resource}`
- **Beta (preview)**: `https://graph.microsoft.com/beta/{resource}`

### Common Endpoint Patterns
```
GET    /{resources}                    # List resources
GET    /{resources}/{id}               # Get a specific resource
POST   /{resources}                    # Create a resource
PATCH  /{resources}/{id}               # Update a resource
DELETE /{resources}/{id}               # Delete a resource
POST   /{resources}/{id}/{action}      # Perform an action
```

### Permission Extraction
When reading a Microsoft Learn API reference page, permissions are listed in a table:
- **Delegated (work or school account)**: permissions for signed-in user context
- **Delegated (personal Microsoft account)**: usually "Not supported"
- **Application**: permissions for daemon/service context

Always extract both delegated and application permissions.

### OData Query Parameters
| Parameter | Purpose | Example |
|-----------|---------|---------|
| `$select` | Choose specific fields | `?$select=displayName,mail` |
| `$filter` | Filter results | `?$filter=startsWith(displayName,'A')` |
| `$expand` | Include related resources | `?$expand=members` |
| `$top` | Limit result count | `?$top=10` |
| `$orderby` | Sort results | `?$orderby=displayName desc` |
| `$count` | Include total count | `?$count=true` |
| `$search` | Full-text search | `?$search="marketing"` |

### Pagination
Responses with more results include `@odata.nextLink`. Follow this URL to get the next page.
Delta queries use `@odata.deltaLink` for incremental sync.

### Error Handling
Graph API returns standard HTTP status codes with an error body:
```json
{
  "error": {
    "code": "Request_ResourceNotFound",
    "message": "Resource not found.",
    "innerError": { "request-id": "...", "date": "..." }
  }
}
```

Common codes: 400 (bad request), 401 (unauthenticated), 403 (forbidden), 404 (not found), 429 (throttled).

### Throttling
- Per-app, per-tenant limits vary by service
- 429 responses include `Retry-After` header (seconds)
- Best practice: implement exponential backoff

---

## Research Output JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["service", "displayName", "description", "apiVersions", "baseUrl", "areas"],
  "properties": {
    "service": { "type": "string", "description": "Lowercase service identifier" },
    "displayName": { "type": "string", "description": "Human-readable service name" },
    "description": { "type": "string", "description": "One-line service description" },
    "apiVersions": {
      "type": "array",
      "items": { "enum": ["v1.0", "beta"] }
    },
    "baseUrl": { "type": "string", "format": "uri" },
    "docUrls": {
      "type": "array",
      "items": { "type": "string", "format": "uri" }
    },
    "areas": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "endpoints"],
        "properties": {
          "name": { "type": "string" },
          "endpoints": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["method", "path", "description", "permissions"],
              "properties": {
                "method": { "enum": ["GET", "POST", "PATCH", "PUT", "DELETE"] },
                "path": { "type": "string" },
                "description": { "type": "string" },
                "apiVersion": { "enum": ["v1.0", "beta"] },
                "permissions": {
                  "type": "object",
                  "properties": {
                    "delegated": { "type": "array", "items": { "type": "string" } },
                    "application": { "type": "array", "items": { "type": "string" } }
                  }
                },
                "requestBody": {},
                "responseSchema": {},
                "queryParams": { "type": "array", "items": { "type": "string" } },
                "pagination": { "type": "boolean" }
              }
            }
          }
        }
      }
    },
    "patterns": {
      "type": "array",
      "items": { "type": "string" }
    },
    "notes": { "type": "string" }
  }
}
```

---

## Plugin Scaffold Templates

### plugin.json Template
```json
{
  "name": "{plugin-name}",
  "version": "1.0.0",
  "description": "{description}",
  "author": { "name": "Markus Ahling" },
  "keywords": ["{keyword1}", "{keyword2}"],
  "skills": ["./skills/{plugin-name}/SKILL.md"],
  "agents": ["./agents/{service}-reviewer.md"],
  "commands": ["./commands/{cmd1}.md", "./commands/setup.md"]
}
```

### Command Frontmatter Template
```yaml
---
name: {command-name}
description: {one-line description}
argument-hint: "{usage pattern}"
allowed-tools:
  - Read
  - Write
  - Bash
---
```

### Agent Frontmatter Template
```yaml
---
name: {Service} Reviewer
description: >
  Reviews {service} integration code for correct API usage,
  permission handling, and security best practices.
model: inherit
color: orange
tools:
  - Read
  - Grep
  - Glob
---
```

### SKILL.md Frontmatter Template
```yaml
---
name: {Service Display Name}
description: >
  Deep expertise in {service} via Microsoft Graph API — {capabilities summary}.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - {trigger1}
  - {trigger2}
---
```

---

## Known M365 Services Catalog

This catalog lists Microsoft 365 and Azure services for coverage auditing.
Status: `covered` = plugin exists, `partial` = some coverage, `uncovered` = no plugin.

| Service | Graph API | Category | Impact | Complexity | Friction |
|---------|-----------|----------|--------|------------|----------|
| Mail / Outlook | v1.0 | productivity | 5 | 3 | 2 |
| Calendar | v1.0 | productivity | 5 | 3 | 2 |
| OneDrive / Files | v1.0 | productivity | 5 | 3 | 2 |
| Teams | v1.0 | productivity | 5 | 4 | 3 |
| SharePoint | v1.0 | productivity | 4 | 4 | 3 |
| Planner | v1.0 | productivity | 4 | 2 | 2 |
| To Do | v1.0 | productivity | 3 | 2 | 1 |
| OneNote | v1.0 | productivity | 3 | 2 | 2 |
| Bookings | v1.0 | productivity | 2 | 2 | 2 |
| Forms | beta | productivity | 3 | 2 | 2 |
| Lists | v1.0 | productivity | 3 | 2 | 2 |
| Excel | v1.0 | productivity | 4 | 3 | 2 |
| Power Automate | REST | productivity | 4 | 3 | 3 |
| Power Apps | REST | productivity | 3 | 4 | 3 |
| Copilot Studio | REST | productivity | 3 | 3 | 3 |
| Users | v1.0 | cloud | 5 | 2 | 2 |
| Groups | v1.0 | cloud | 4 | 3 | 3 |
| Applications | v1.0 | security | 4 | 3 | 4 |
| Service Principals | v1.0 | security | 3 | 3 | 4 |
| Conditional Access | v1.0 | security | 4 | 3 | 4 |
| Identity Protection | v1.0 | security | 3 | 3 | 4 |
| Intune / Device Mgmt | v1.0 | cloud | 4 | 5 | 4 |
| Cloud PC | beta | cloud | 2 | 3 | 4 |
| Security Alerts | v1.0 | security | 4 | 3 | 4 |
| eDiscovery | v1.0 | security | 3 | 4 | 5 |
| Information Protection | v1.0 | security | 3 | 3 | 4 |
| Reports / Usage | v1.0 | analytics | 3 | 2 | 3 |
| Azure Subscriptions | ARM | cloud | 5 | 3 | 3 |
| Azure Resource Groups | ARM | cloud | 5 | 2 | 3 |
| Azure Policy | ARM | security | 4 | 3 | 3 |
| Azure Cost Management | ARM | cloud | 4 | 3 | 3 |
| Azure DevOps | REST | devops | 4 | 4 | 2 |
| Power BI / Fabric | REST | analytics | 4 | 4 | 3 |
| Dataverse | REST | cloud | 3 | 4 | 3 |
| Exchange Admin | v1.0 | productivity | 3 | 3 | 4 |
| Purview / Compliance | v1.0 | security | 3 | 4 | 5 |
| Lighthouse | v1.0 | security | 2 | 3 | 4 |
| Viva Insights | beta | analytics | 2 | 3 | 4 |
| Viva Learning | beta | productivity | 2 | 3 | 3 |
| Viva Engage (Yammer) | REST | productivity | 2 | 3 | 3 |
| Loop | beta | productivity | 2 | 3 | 3 |
| Clipchamp | n/a | productivity | 1 | 4 | 3 |
| Stream | beta | productivity | 2 | 3 | 3 |
| Sway | n/a | productivity | 1 | 2 | 2 |
| Whiteboard | beta | productivity | 2 | 2 | 3 |
| Kaizala | deprecated | productivity | 1 | 3 | 5 |
| StaffHub | deprecated | productivity | 1 | 3 | 5 |

---

## Marketplace Registration Checklist

When adding a new plugin to the marketplace:

1. **Plugin structure** — verify all files exist:
   - `.claude-plugin/plugin.json` with valid JSON
   - `skills/{name}/SKILL.md` with frontmatter
   - `commands/*.md` with frontmatter
   - `agents/*.md` with frontmatter
   - `README.md`

2. **Marketplace entry** — add to `.claude-plugin/marketplace.json`:
   ```json
   {
     "name": "{plugin-name}",
     "source": "./{plugin-name}",
     "description": "{description}",
     "category": "{category}",
     "tags": ["microsoft", "{tag1}", "{tag2}"],
     "strict": true
   }
   ```

3. **Validation** — run:
   ```bash
   npm run validate:all
   ```

4. **Commit** — stage all new/modified files and commit

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Graph Explorer, changelog tracking, permission discovery, SDK patterns, throttling | [`references/api-research-patterns.md`](./references/api-research-patterns.md) |
| Plugin directory structure, manifest schema, SKILL.md template, command/agent frontmatter | [`references/plugin-scaffolding.md`](./references/plugin-scaffolding.md) |
| Coverage analysis methodology, gap identification, quality scoring, marketplace readiness | [`references/coverage-audit.md`](./references/coverage-audit.md) |
