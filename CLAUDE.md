# CLAUDE.md

## Project Summary

Claude-m is a Microsoft plugin marketplace for Claude Code. It provides 100+ knowledge plugins covering Azure, M365, Fabric, Dynamics 365, Power Platform, and security — all installable via the Claude Code plugin system.

**Stack:** TypeScript, Node.js (ESM), MCP SDK, Zod, Jest

## How to Work Here

- Branch from `main`; use feature branches with `claude/` prefix.
- Run `npm test` and `npm run validate:all` before committing.
- Follow conventions in `@.claude/rules/coding.md`.

## Reference Documents

### Rules
- Code conventions: `@.claude/rules/coding.md`
- Testing standards: `@.claude/rules/testing.md`
- Security rules: `@.claude/rules/security.md`
- Infrastructure: `@.claude/rules/infra.md`
- Code review checklist: `@.claude/rules/review.md`
- Product guardrails: `@.claude/rules/product.md`

### Context
- Project overview: `@docs/context/project-overview.md`
- Architecture: `@docs/context/architecture.md`
- Domain glossary: `@docs/context/domain-glossary.md`
- API contracts: `@docs/context/api-contracts.md`
- Data model: `@docs/context/data-model.md`
- Security rules: `@docs/context/security-rules.md`
- Testing strategy: `@docs/context/testing-strategy.md`
- Lessons learned: `@docs/context/lessons-learned.md`

### Skills & Templates
- Code review: `@.claude/skills/code-review/SKILL.md`
- Release notes: `@.claude/skills/release-notes/SKILL.md`
- Migration planning: `@.claude/skills/migration-planner/SKILL.md`
- Bug triage: `@.claude/skills/bug-triage/SKILL.md`
- PR template: `@.claude/templates/pr-description.md`
- Design doc: `@.claude/templates/design-doc.md`

### Read-When Triggers
- Before big refactors: read `@docs/context/architecture.md` and `@docs/context/data-model.md`.
- Before API changes: read `@docs/context/api-contracts.md` and `@docs/context/api-guidelines.md`.
- Before security work: read `@.claude/rules/security.md` and `@docs/context/security-rules.md`.
- Before releases: use the release-notes skill.

## Commands & Workflows

```bash
npm test              # Run tests
npm run lint          # Type-check
npm run build         # Build TypeScript
npm run sync          # Sync plugin descriptions into marketplace.json + CLAUDE.md
npm run setup         # Scaffold .claude + docs/context structure
npm run deploy        # Full pipeline: sync, setup, validate, build, test
```

## Quick start

```bash
# 1. Add the marketplace
/plugin marketplace add markus41/Claude-m

# 2. Install a plugin
/plugin install microsoft-azure-mcp@claude-m-microsoft-marketplace
```

## Troubleshooting: SSH auth error

If you see `git@github.com: Permission denied (publickey)` when adding the marketplace,
Git is trying SSH but no key is configured. Fix it by switching to HTTPS:

```bash
git config --global url."https://github.com/".insteadOf "git@github.com:"
```

Then re-run `/plugin marketplace add markus41/Claude-m`.

## Available plugins

| Plugin name (install slug) | Category | Description |
|---|---|---|
| `microsoft-azure-mcp` | cloud | Inspect subscriptions, resource groups, and resources via MCP. |
| `microsoft-teams-mcp` | productivity | Send messages, create meetings, and manage Teams channels via MCP. |
| `microsoft-outlook-mcp` | productivity | Send email and manage inbox/calendar tasks via MCP. |
| `microsoft-sharepoint-mcp` | productivity | Browse and transfer SharePoint files through MCP tools. |
| `sharepoint-file-intelligence` | productivity | Scan, categorize, deduplicate, and organize SharePoint and OneDrive files at scale using Microsoft Graph |
| `microsoft-excel-mcp` | productivity | Read and update workbooks, worksheets, ranges, and tables via MCP. |
| `excel-office-scripts` | productivity | Deep knowledge of Excel Office Scripts — Microsoft's TypeScript-based automation platform for Excel on the web |
| `excel-automation` | productivity | Excel data cleaning with pandas, Office Script generation, and Power Automate flow creation |
| `m365-platform-clients` | cloud | TypeScript patterns for Dataverse Web API and Microsoft Graph — auth, clients, and combined provisioning workflows |
| `m365-admin` | cloud | M365 tenant admin via Microsoft Graph — users, groups, licenses, Exchange, SharePoint, Teams, Intune, PIM, access reviews, usage reports, guest management, administrative units, Microsoft Search, and domain/federation management |
| `dataverse-schema` | cloud | Dataverse table, column, and relationship management via Web API — schema design, data seeding, and solution lifecycle |
| `powerbi-fabric` | analytics | DAX measures, DAX UDFs, calculation groups, Power Query M, TMDL model-as-code, TOM/XMLA and PowerShell automation, Power BI Embedded, deployment pipelines, PBIP scaffolding, Fabric Lakehouse, Direct Lake, performance optimization |
| `powerbi-paginated-reports` | analytics | Power BI paginated reports through Fabric — RDL authoring, VB.NET expressions, data source configuration, rendering/export, REST API automation, SSRS-to-Fabric migration, performance tuning, and troubleshooting |
| `powerbi-custom-visuals` | analytics | Build, debug, package, and certify custom Power BI visuals with the pbiviz toolchain — project scaffolding, capabilities and dataView mapping, the IVisual API, the modern format pane and formatting model, selection and cross-filtering, tooltips, unit testing, and AppSource certification |
| `powerplatform-alm` | devops | Power Platform ALM — environments, solution transport, CI/CD pipelines, PCF controls, and deployment automation |
| `onedrive` | productivity | OneDrive file management via Microsoft Graph — upload, download, share, search, and manage files and folders |
| `planner-todo` | productivity | Microsoft Planner and To Do task management via Graph API — classic plans, Premium Dataverse projects, buckets, tasks, assignments, checklists, nested plans, roster plans, sprints, goals, and Business Scenarios |
| `azure-devops` | devops | Comprehensive Azure DevOps expertise — Git repos with passwordless auth (GCM, WIF, SSH), YAML and Classic pipelines, deployment environments, agent pools, work items, boards, sprints, test plans, security namespaces, dashboards, wikis, service hooks, Analytics OData, CLI, and extensions |
| `azure-devops-orchestrator` | devops | Intelligent orchestration for Azure DevOps — ship work items with Claude Code, triage backlogs, plan sprints, coordinate releases, monitor pipelines, and balance workloads across projects. Integrates with microsoft-teams-mcp and microsoft-outlook-mcp when installed. |
| `entra-id-admin` | security | Microsoft Entra ID administration via Graph API — full user/group lifecycle, directory roles, PIM, authentication methods, admin units, B2B guest management, license assignment, named locations, and entitlement management |
| `entra-id-security` | security | Microsoft Entra ID identity governance and security — app registrations, service principals, conditional access, sign-in logs, and risk detection |
| `powerapps` | productivity | Microsoft Power Apps development — canvas app creation, model-driven app scaffolding, deployment, formulas, custom connectors, component libraries, and PCF controls |
| `azure-cost-governance` | cloud | Azure FinOps and governance workflows — query costs, monitor budgets, detect anomalies, and identify idle resources for optimization |
| `power-automate` | productivity | Design and troubleshoot Power Automate cloud flows — trigger/action patterns, run diagnostics, retries, and deployment-safe flow definitions |
| `purview-compliance` | security | Microsoft Purview compliance workflows — DLP review, retention planning, sensitivity labels, eDiscovery readiness, and guided compliance playbooks with audit-ready change logs |
| `azure-policy-security` | security | Evaluate Azure policy compliance and security posture — policy assignments, drift analysis, remediation planning, and guardrail recommendations |
| `lighthouse-health` | security | Microsoft 365 Lighthouse tenant health scorecard — green/yellow/red dashboard for security posture, MFA coverage, stale accounts, and licensing anomalies across managed tenants |
| `license-optimizer` | cloud | M365 license optimization for MSPs/CSPs — identify inactive licenses, map downgrades and upgrades, estimate savings, and generate multi-tenant Lighthouse reports for customer review meetings |
| `exchange-mailflow` | productivity | Exchange Online mail flow diagnostics and deliverability — guided 'email not received' troubleshooting, transport rules, quarantine, connectors, and SPF/DKIM/DMARC checks with client-safe explanations |
| `sharing-auditor` | security | SharePoint and OneDrive external sharing auditor — find overshared links, anonymous access, stale guest users, and auto-generate approval tasks for safe revocation |
| `teams-lifecycle` | productivity | Teams lifecycle management — create and archive teams with templates, enforce naming and ownership, apply sensitivity labels, and run expiration reviews using non-technical 'project start/end' language |
| `servicedesk-runbooks` | productivity | M365 service desk auto-runbooks — guided workflows for common tickets like shared mailbox access, MFA reset, file recovery, and password reset with pre-checks, approval gates, and end-user verification |
| `microsoft-bookings` | productivity | Microsoft Bookings — manage appointment calendars, services, staff availability, and customer bookings via Graph API |
| `microsoft-forms-surveys` | productivity | Microsoft Forms — create surveys, add questions, collect responses, and summarize results via Graph API |
| `microsoft-lists-tracker` | productivity | Microsoft Lists — create and manage lists for process tracking, issue logs, and project trackers via Graph API |
| `copilot-studio-bots` | productivity | Copilot Studio — design bot topics, author trigger phrases, configure generative AI orchestration, and publish chatbots |
| `onenote-knowledge-base` | productivity | OneNote Knowledge Base - headless-first Graph automation for advanced page architecture, styling, and task workflows |
| `microsoft-loop` | productivity | Microsoft Loop workspaces, pages, and components — create collaborative spaces, embed portable Loop components across M365 apps, manage via Graph API, and govern Loop at the tenant level. |
| `power-pages` | productivity | Microsoft Power Pages — sites, page templates, Liquid, web forms, table permissions, web roles, and Dataverse portal integration |
| `azure-web-apps` | cloud | Azure App Service — create, deploy, and manage web apps, deployment slots, custom domains, and TLS certificates via ARM REST API |
| `azure-static-web-apps` | cloud | Azure Static Web Apps — JAMstack/SPA hosting with built-in auth, API backends, PR preview environments, and staticwebapp.config.json management |
| `teams-app-dev` | devops | Custom Teams app development — manifest v1.25, M365 Agents Toolkit, Adaptive Cards, message extensions, meeting apps, Custom Engine Agents, Agent 365 blueprints, workflow bots, notification hubs, Copilot plugins, Teams SDK migration, and advanced meeting experiences with Live Share |
| `azure-storage` | cloud | Azure Storage — Blob, Queue, Table, and Files services with lifecycle policies, SAS tokens, and managed identity access |
| `azure-functions` | cloud | Azure Functions — triggers, bindings, Durable Functions, deployment, and local development with Azure Functions Core Tools |
| `azure-containers` | cloud | Azure Container Apps, Container Instances, and Container Registry — build, push, deploy, and scale containerized workloads |
| `azure-sql-database` | cloud | Azure SQL Database and Cosmos DB — provisioning, schema management, query optimization, security hardening, and backup/restore |
| `azure-key-vault` | security | Azure Key Vault — secrets, keys, and certificates management with RBAC, rotation policies, and managed identity integration |
| `azure-monitor` | cloud | Azure Monitor, Application Insights, and Log Analytics — metrics, alerts, KQL queries, dashboards, and diagnostic settings |
| `azure-networking` | cloud | Azure Networking — VNets, subnets, NSGs, Load Balancers, Application Gateway, Front Door, DNS zones, VPN gateways, ExpressRoute, Azure Firewall, Route Tables, Bastion, and Private Link |
| `fabric-data-engineering` | analytics | Microsoft Fabric Data Engineering — lakehouses, Spark notebooks, data pipelines, Delta Lake tables, lakehouse SQL endpoints, multi-notebook orchestration, workspace lifecycle management, pipeline monitoring, and advanced optimization |
| `fabric-data-warehouse` | analytics | Microsoft Fabric Data Warehouse — Synapse warehouses, T-SQL DDL/DML, cross-database queries, stored procedures, and data modeling |
| `fabric-real-time-analytics` | analytics | Microsoft Fabric Real-Time Analytics — Eventhouse, KQL databases, eventstreams, Real-Time Dashboards, and streaming ingestion |
| `fabric-data-factory` | analytics | Microsoft Fabric Data Factory — data pipelines, Dataflow Gen2, Copy activity, orchestration patterns, and scheduling |
| `fabric-data-science` | analytics | Microsoft Fabric Data Science — ML experiments, model training, MLflow tracking, PREDICT function, and semantic link integration |
| `fabric-data-activator` | analytics | Microsoft Fabric Data Activator — Reflex triggers, condition-based alerts, real-time actions, and event-driven automation on Fabric data |
| `fabric-onelake` | analytics | Microsoft Fabric OneLake — unified data lake, shortcuts, file explorer, ADLS Gen2 APIs, and cross-workspace data access |
| `fabric-semantic-models` | analytics | Microsoft Fabric Semantic Models — Direct Lake modeling, DAX governance, calculation groups, XMLA deployment, and semantic link automation |
| `fabric-gitops-cicd` | devops | Microsoft Fabric GitOps CI/CD — workspace Git integration, deployment pipelines, artifact promotion, branch strategy, and release validation |
| `fabric-capacity-ops` | analytics | Microsoft Fabric Capacity Operations — CU monitoring, throttling diagnostics, workload tuning, autoscale planning, and cost-performance optimization |
| `fabric-mirroring` | analytics | Microsoft Fabric Mirroring — source onboarding, CDC replication, latency monitoring, schema drift handling, and reconciliation workflows |
| `fabric-data-prep-jobs` | analytics | Microsoft Fabric data preparation jobs - Dataflow Gen1, Apache Airflow jobs, mounted Azure Data Factory pipelines, and dbt job governance for deterministic prep workflows. |
| `fabric-data-store` | analytics | Microsoft Fabric data store operations - Cosmos DB database, SQL database, Snowflake database links, datamarts, and Event Schema Set governance. |
| `fabric-ai-agents` | analytics | Microsoft Fabric AI and operations agents - anomaly detector, data agent, operations agent, ontology, and digital twin builder workflows with preview guardrails. |
| `fabric-graph-geo` | analytics | Microsoft Fabric graph and geospatial analytics - graph model, graph queryset, map, and exploration workflows with preview guardrails. |
| `fabric-developer-runtime` | devops | Microsoft Fabric developer runtime operations - GraphQL API, environments, user data functions, and variable library governance. |
| `fabric-distribution-apps` | productivity | Microsoft Fabric org app distribution - package, permission model, release, and adoption workflows for organizational app rollout. |
| `fabric-mirroring-azure` | analytics | Microsoft Fabric mirroring for Azure-native sources - Cosmos DB, PostgreSQL, Databricks catalog, Azure SQL Database, and SQL Managed Instance. |
| `fabric-mirroring-external` | analytics | Microsoft Fabric mirroring for external sources - generic databases, BigQuery, Oracle, SAP, Snowflake, and SQL Server with preview caveats where applicable. |
| `fabric-security-governance` | security | Microsoft Fabric Security Governance — workspace RBAC, RLS/OLS patterns, sensitivity labels, lineage controls, and audit readiness |
| `fabric-observability` | analytics | Microsoft Fabric Observability — Monitor Hub triage, notebook/pipeline reliability runbooks, SLA tracking, alert design, and incident diagnostics |
| `azure-graph-dotnet` | devops | Scaffold and build Microsoft Graph C# / .NET solutions on Azure — Functions, Container Jobs, Azure Identity, Polly resilience, and SharePoint file intelligence implementations |
| `azure-dotnet-webapp` | devops | Scaffold and build ASP.NET Core Web API and Blazor apps on Azure — Minimal API, controllers, Microsoft.Identity.Web, EF Core, SignalR, OpenAPI, App Service deployment, and Graph API integration patterns. |
| `lighthouse-operations` | security | Comprehensive Azure Lighthouse and M365 Lighthouse operations for MSPs/CSPs — Azure delegation ARM/Bicep templates, managed services marketplace offers, GDAP full lifecycle management, baseline deployment automation, cross-tenant governance, Partner Center integration, and alert management. |
| `msp-tenant-provisioning` | cloud | Full MSP/CSP new customer provisioning — Partner Center CSP tenant creation, Azure subscription and management group setup, initial M365 security baseline, domain DNS configuration, and Microsoft 365 Lighthouse onboarding. |
| `azure-tenant-assessment` | cloud | Entry-point Azure tenant assessment — subscription inventory, resource catalog, security posture snapshot, cost overview, and plugin setup recommendations |
| `marketplace-dev-tools` | devops | Research Microsoft APIs, scaffold new plugins, extend existing ones, and audit marketplace coverage |
| `microsoft-docs-mcp` | devops | Search and fetch official Microsoft documentation via the Learn MCP server |
| `process-task-mining` | analytics | Process and task mining from M365, Power Automate, and Azure Monitor logs — extract event logs, discover process models, analyze performance, and check conformance |
| `agent-foundry` | cloud | Azure AI Foundry agent lifecycle management — scaffold, deploy, test, and manage AI agents with Azure AI Foundry MCP integration |
| `defender-sentinel` | security | Microsoft Sentinel SIEM/SOAR and Defender XDR — incident triage, KQL threat hunting, analytics rules, SOAR playbooks, advanced hunting, and unified security operations center workflows |
| `azure-ai-services` | cloud | Azure AI workloads — Azure OpenAI Service deployments, AI Search indexes, AI Studio/Foundry projects, Cognitive Services provisioning, content filtering, and responsible AI governance |
| `azure-openai` | cloud | Azure OpenAI Service — model deployments, fine-tuning, content filtering, prompt engineering, batch API, and quota management with az cognitiveservices and REST API |
| `azure-document-intelligence` | cloud | Azure AI Document Intelligence — OCR, prebuilt models (invoices, receipts, IDs, tax forms), custom models, layout analysis, document classification, and batch processing |
| `azure-organization` | cloud | Azure organization and governance — management groups, subscription management, resource tagging, naming conventions, landing zones, and tenant-level hierarchy |
| `domain-business-name-finder` | productivity | Brainstorm business names and check domain availability across popular TLDs using Firecrawl, Perplexity, WHOIS, and Domain Search MCP servers |
| `dynamics-365-crm` | productivity | Dynamics 365 Sales and Customer Service via Dataverse Web API — leads, opportunities, accounts, contacts, cases, SLAs, queues, pipeline reporting, and CRM workflow automation |
| `dynamics-365-field-service` | productivity | Dynamics 365 Field Service via Dataverse Web API — work orders, bookings, resource scheduling, service accounts, assets, and IoT-triggered service events |
| `dynamics-365-project-ops` | productivity | Dynamics 365 Project Operations via Dataverse Web API — projects, WBS, time and expense tracking, resource assignments, project contracts, and billing |
| `business-central` | productivity | Microsoft Dynamics 365 Business Central ERP — finance, supply chain, and inventory management via BC OData v4 / API v2.0 REST API |
| `microsoft-intune` | security | Device lifecycle and compliance management for Microsoft Intune and Endpoint Manager - non-compliant device detection, lost device actions, compliance policy rollout, and app protection policy review. |
| `defender-endpoint` | security | Microsoft Defender for Endpoint operations - incident triage, machine isolation, live response package metadata checks, and evidence summary generation. |
| `azure-logic-apps` | cloud | Azure Logic Apps — enterprise integration workflows, Workflow Definition Language, Standard and Consumption hosting, connectors, B2B/EDI integration accounts, and CI/CD deployment |
| `azure-kubernetes` | cloud | Azure Kubernetes Service operations - cluster inventory, pod failure diagnostics, node pool scaling, and policy posture checks. |
| `azure-backup-recovery` | cloud | Azure Backup and Site Recovery operations - job health checks, restore drill readiness, recovery plan audits, and cross-region resilience checks. |
| `azure-api-management` | cloud | Azure API Management operations - API inventory, policy drift detection, key rotation workflows, and contract diff checks across revisions. |
| `azure-service-bus` | cloud | Azure messaging operations for Service Bus and event-driven workloads - lag scans, dead-letter replay planning, stale subscription cleanup, and namespace quota checks. |
| `azure-service-health` | cloud | Azure Service Health operations - active incident watchlists, impact scoring, runbook mapping, and communications-ready outage summaries. |
| `m365-meeting-intelligence` | productivity | Meeting transcript intelligence for Teams and Outlook - transcript fetch, commitment extraction, task handoff, and owner reminder workflows. |
| `entra-access-reviews` | security | Microsoft Entra access review automation - stale privileged access detection, review cycle drafting, remediation ticket generation, and status reporting. |
| `planner-orchestrator` | productivity | Intelligent orchestration for Microsoft Planner — ship tasks with Claude Code, triage backlogs, plan sprint buckets, monitor deadlines, and balance workloads across plans. Integrates with microsoft-teams-mcp, microsoft-outlook-mcp, and powerbi-fabric when installed. |
| `fluent-ui-design` | devops | Microsoft Fluent 2 design system mastery — design tokens, color system, typography, layout, components, Teams theming, Griffel styling, Next.js SSR, Web Components, charting, cross-platform (iOS/Android), form orchestration, Office Add-ins, B2C UI, accessibility auditing, v8→v9 migration, and Figma design kits |
| `notion` | productivity | Comprehensive Notion mastery — page design and styling, every block type, databases and formulas, AI features, MCP integration, REST API automation, and professional page templates |
| `graph-investigator` | security | Microsoft Graph Investigator — unified user investigation, mailbox forensics, activity timelines, device correlation, and forensic reporting across all M365 services |
| `ms-graph-omni` | cloud | Microsoft Graph + Entra + Office file ops MCP for Claude. Certificate-based app-only auth via Azure Key Vault + delegated auth with persistent token cache. Covers Outlook, Teams, SharePoint, OneDrive, Planner, ToDo, OneNote, Users, Groups, Entra admin, Excel/Word/PowerPoint/Loop file ops, Search, Sites. |

Install any plugin with:
```bash
/plugin install <plugin-name>@claude-m-microsoft-marketplace
```

## Validation

```bash
# Inside Claude
/plugin validate .

# CLI / CI
claude plugin validate .
npm run validate:all
```

## Prompt examples

- "Use `microsoft-azure-mcp` to list resource groups in subscription `<id>` and flag idle resources."
- "Use `microsoft-teams-mcp` to draft and send a standup update to channel `<channel-id>`."
- "Use `microsoft-outlook-mcp` to summarize unread inbox messages and schedule a follow-up."
- "Use `azure-cost-governance` to find resources with no activity in the last 30 days and estimate savings."
- "Use `entra-id-security` to report service principals with excessive permissions."
- "Use `license-optimizer` to identify inactive M365 licenses and produce a savings report."

## Opinionated flows

1. **Microsoft collaboration stack**
   Install: `microsoft-teams-mcp` + `microsoft-outlook-mcp` + `microsoft-sharepoint-mcp`
   Prompt: "Audit communication and file handoff risks for this week and produce actions."

2. **Azure governance review**
   Install: `microsoft-azure-mcp` + `azure-cost-governance` + `azure-policy-security`
   Prompt: "List subscriptions/resource groups/resources, flag policy drift, and estimate cost waste."

3. **Entra security sweep**
   Install: `entra-id-security` + `purview-compliance` + `sharing-auditor`
   Prompt: "Review conditional access gaps, overshared files, and DLP policy coverage."

4. **MSP multi-tenant health**
   Install: `lighthouse-health` + `license-optimizer` + `servicedesk-runbooks`
   Prompt: "Score all tenants for security posture and generate a monthly customer-ready report."
