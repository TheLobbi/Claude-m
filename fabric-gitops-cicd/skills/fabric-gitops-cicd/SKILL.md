---
name: Fabric GitOps CI/CD
description: >
  Advanced Microsoft Fabric GitOps and CI/CD patterns for workspace Git integration, branch governance, deployment pipelines, and release validation.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
triggers:
  - fabric git integration
  - fabric deployment pipeline
  - fabric cicd
  - artifact promotion fabric
  - workspace branch strategy
  - release validation fabric
  - fabric rollback
  - fabric dev test prod
  - fabric rest api
  - fabric api automation
  - item definition api
  - update item definition
  - long running operation
  - fabric throttling
  - semantic link
  - sempy
  - refresh semantic model
  - deploy semantic model
  - fabric notebook validation
---

# Fabric GitOps CI/CD

## 1. Overview

Microsoft Fabric provides two complementary mechanisms for CI/CD: **Git integration** (workspace-to-repository synchronization) and **Deployment Pipelines** (workspace-to-workspace promotion). Production GitOps workflows combine both: developers commit to Git, automated pipelines validate and deploy, and Deployment Pipelines orchestrate the final promotion across environments.

**Two CI/CD mechanisms**:
| Mechanism | What it does | Scope |
|-----------|-------------|-------|
| Git integration | Two-way sync between a Fabric workspace and a Git repo branch | Individual workspace ↔ Git branch |
| Deployment Pipelines | Promote artifacts between Dev → Test → Prod workspaces | Cross-workspace promotion |

**How they combine**:
```
Developer commits to feature branch
    │ PR review + merge to main
    ▼
Git integration → Syncs main to Dev workspace
    │ Automated validation passes
    ▼
Deployment Pipeline → Promotes Dev to Test
    │ QA validation passes
    ▼
Deployment Pipeline → Promotes Test to Production
```

---

## 2. Quick Start

### Connect a Workspace to Git

```bash
# 1. In Fabric portal: Workspace settings > Git integration
# 2. Select Azure DevOps or GitHub
# 3. Authorize connection
# 4. Select organization, project, repository, branch, and root folder
# 5. Click "Connect and sync"

# OR via REST API:
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/connect" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "gitProviderDetails": {
      "gitProviderType": "AzureDevOps",
      "organizationName": "contoso",
      "projectName": "DataPlatform",
      "repositoryName": "fabric-analytics",
      "branchName": "dev",
      "directoryName": "/workspaces/analytics-dev"
    }
  }'
```

### Create a Deployment Pipeline

```bash
curl -X POST "https://api.fabric.microsoft.com/v1/pipelines" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Analytics Platform Pipeline",
    "description": "Dev → Test → Prod promotion for Analytics workspaces"
  }'
```

---

## 3. Git Integration

### Supported Git Providers

| Provider | Authentication | Branch protection |
|----------|---------------|-------------------|
| Azure DevOps | OAuth (user) or Service Principal | Branch policies |
| GitHub | OAuth (user) or GitHub App | Branch protection rules |
| GitHub Enterprise Server | GitHub App | Branch protection rules |
| Bitbucket (preview) | OAuth | Branch permissions |

### Repository Structure

```
fabric-analytics/              (repository root)
├── workspaces/
│   ├── analytics-dev/         (Dev workspace root folder)
│   │   ├── SalesLakehouse.Lakehouse/
│   │   │   └── .platform
│   │   ├── SalesTransform.Notebook/
│   │   │   ├── notebook-content.py
│   │   │   └── .platform
│   │   ├── SalesPipeline.DataPipeline/
│   │   │   └── pipeline-content.json
│   │   └── SalesModel.SemanticModel/
│   │       ├── definition/
│   │       │   ├── database.tmdl
│   │       │   └── tables/
│   │       └── .platform
│   ├── analytics-test/        (Test workspace root folder)
│   └── analytics-prod/        (Prod workspace root folder)
├── .github/
│   └── workflows/
│       ├── validate.yml
│       └── deploy.yml
├── scripts/
│   ├── validate-artifacts.py
│   └── promote.py
└── README.md
```

### Git Sync Operations

| Operation | Direction | Description |
|-----------|-----------|-------------|
| Commit to Git | Workspace → Git | Push workspace changes to the connected branch |
| Update from Git | Git → Workspace | Pull latest Git changes to workspace |
| Undo | Git → Workspace | Revert uncommitted workspace changes |

**Commit to Git (REST API)**:
```bash
# Commit specific items to Git
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/commitToGit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "Selective",
    "workspaceHead": "<last-known-commit-hash>",
    "items": [
      {"objectId": "<notebook-id>", "itemType": "Notebook"},
      {"objectId": "<pipeline-id>", "itemType": "DataPipeline"}
    ],
    "comment": "feat: add daily refresh pipeline for SalesLakehouse"
  }'

# Update workspace from Git (pull latest)
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/updateFromGit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "remoteCommitHash": "<target-commit-hash>",
    "conflictResolution": {
      "conflictResolutionType": "Workspace",
      "conflictResolutionPolicy": "PreferRemote"
    },
    "options": {
      "allowOverrideItems": true
    }
  }'
```

### Git Status

```bash
# Get current Git sync status
curl "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/status" \
  -H "Authorization: Bearer ${TOKEN}"

# Response shows:
# - workspaceHead: current workspace commit
# - remoteCommitHash: current Git branch HEAD
# - changes: list of items that differ between workspace and Git
```

---

## 4. Branch Strategy

### Recommended Branch Model

```
main           ← Production-ready, always deployable
├── release/   ← Release candidates (optional for staged releases)
├── dev        ← Integration branch for Dev workspace
└── feature/*  ← Developer feature branches
    └── feature/add-sales-forecast-model
    └── feature/fix-revenue-calculation
    └── bugfix/refresh-pipeline-timeout
```

**Branch-to-workspace mapping**:
| Branch | Workspace | Access |
|--------|-----------|--------|
| `feature/*` | Developer's personal sandbox (optional) | Contributor (developer only) |
| `dev` | Dev workspace | Contributor (dev team) |
| `main` | Prod workspace (via deployment pipeline) | Member (lead engineers) |

### Branch Protection Rules

**Azure DevOps branch policies for `dev` and `main`**:
```yaml
# Azure DevOps branch policy (configured in portal or via REST):
# For 'main' branch:
policies:
  - type: RequireMinimumReviewers
    settings:
      minimumApproverCount: 2
      resetOnSourcePush: true

  - type: RequireMergeStrategy
    settings:
      allowSquash: true
      allowRebase: false

  - type: RequireBuildToSucceed
    settings:
      buildDefinitionId: <validation-pipeline-id>
      displayName: "Fabric Artifact Validation"

  - type: RequireCommentResolution
    settings:
      enabled: true
```

**GitHub branch protection for `main`**:
```yaml
# .github/branch-protection.yml (applied via GitHub API or terraform)
protection:
  required_status_checks:
    strict: true
    contexts:
      - "validate-fabric-artifacts"
      - "best-practice-check"
  required_pull_request_reviews:
    required_approving_review_count: 2
    dismiss_stale_reviews: true
  enforce_admins: true
  restrictions: null
```

---

## 5. Deployment Pipelines

### Pipeline Stage Configuration

A Fabric Deployment Pipeline has up to 3 stages: Development, Test, Production. Each stage is bound to a Fabric workspace.

```bash
# Assign workspace to pipeline stage
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/${STAGE_ID}/assignWorkspace" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "'${WORKSPACE_ID}'"}'

# Unassign workspace from stage
curl -X DELETE \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/${STAGE_ID}/assignWorkspace" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Pipeline REST API**:
| Method | Endpoint | Required Permissions | Key Parameters | Notes |
|--------|----------|---------------------|----------------|-------|
| GET | `/pipelines` | Workspace Viewer | — | Lists all deployment pipelines |
| GET | `/pipelines/{pId}` | Pipeline access | — | Returns pipeline details |
| POST | `/pipelines` | Fabric Capacity Admin | `displayName` | Creates pipeline |
| DELETE | `/pipelines/{pId}` | Pipeline Admin | — | Deletes pipeline |
| GET | `/pipelines/{pId}/stages` | Pipeline access | — | Lists stages |
| POST | `/pipelines/{pId}/deployAll` | Pipeline Deployer | `sourceStageOrder`, options | Deploy all items |
| POST | `/pipelines/{pId}/deploy` | Pipeline Deployer | `sourceStageOrder`, `items` | Deploy selected items |
| GET | `/pipelines/{pId}/operations/{opId}` | Pipeline access | — | Poll operation status |

```bash
# Deploy all items from Dev (stage 0) to Test (stage 1)
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/deployAll" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceStageOrder": 0,
    "isBackwardDeployment": false,
    "note": "Release 2025-03-15: Sales forecast model v2"
  }'

# Selective deploy — only specific items
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/deploy" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceStageOrder": 0,
    "items": [
      {"sourceItemId": "<notebook-id>", "itemType": "Notebook"},
      {"sourceItemId": "<pipeline-id>", "itemType": "DataPipeline"}
    ],
    "note": "Hotfix: notebook timeout increased"
  }'

# Check deployment operation status (poll)
curl "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/operations/${OP_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Deployment Rules (Environment-Specific Configuration)

Deployment rules allow item properties to differ between stages (e.g., different connection strings for dev vs prod):

```bash
# Set a deployment rule for a data source connection
curl -X PUT \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/stages/${STAGE_ID}/deploymentRules" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "itemId": "<semantic-model-id>",
        "ruleType": "DataSourceRule",
        "sourceName": "Dev-SQLServer",
        "targetServer": "prod-sql.database.windows.net",
        "targetDatabase": "SalesProd"
      }
    ]
  }'
```

---

## 6. CI/CD Pipeline Patterns

### Azure DevOps — Full CI/CD Pipeline

```yaml
# azure-pipelines.yml

trigger:
  branches:
    include: [main, dev]
  paths:
    include: ['workspaces/**']

variables:
  FABRIC_CLIENT_ID: $(FABRIC_SPN_CLIENT_ID)
  FABRIC_CLIENT_SECRET: $(FABRIC_SPN_SECRET)
  FABRIC_TENANT_ID: $(FABRIC_TENANT_ID)
  DEV_WORKSPACE_ID: $(DEV_WORKSPACE_GUID)
  PIPELINE_ID: $(DEPLOYMENT_PIPELINE_GUID)

stages:
  - stage: Validate
    displayName: 'Validate Fabric Artifacts'
    jobs:
      - job: ValidateArtifacts
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '3.11'

          - script: pip install requests pyyaml
            displayName: 'Install dependencies'

          - task: PythonScript@0
            displayName: 'Validate artifact structure'
            inputs:
              scriptPath: 'scripts/validate-artifacts.py'
              arguments: '--path workspaces/analytics-dev'

  - stage: SyncToDevWorkspace
    displayName: 'Sync to Dev Workspace'
    dependsOn: Validate
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/dev'))
    jobs:
      - deployment: SyncDev
        environment: Development
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PythonScript@0
                  displayName: 'Update Dev workspace from Git'
                  env:
                    FABRIC_CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    scriptPath: 'scripts/update-workspace-from-git.py'
                    arguments: >
                      --workspace-id $(DEV_WORKSPACE_ID)
                      --commit-hash $(Build.SourceVersion)

  - stage: PromoteToTest
    displayName: 'Promote Dev → Test'
    dependsOn: SyncToDevWorkspace
    condition: succeeded()
    jobs:
      - deployment: PromoteTest
        environment: Test
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PythonScript@0
                  displayName: 'Deploy Dev to Test via Deployment Pipeline'
                  env:
                    FABRIC_CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    scriptPath: 'scripts/promote.py'
                    arguments: >
                      --pipeline-id $(PIPELINE_ID)
                      --source-stage 0
                      --target-stage 1

  - stage: PromoteToProd
    displayName: 'Promote Test → Production'
    dependsOn: PromoteToTest
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: PromoteProd
        environment: Production   # Requires manual approval gate
        strategy:
          runOnce:
            deploy:
              steps:
                - task: PythonScript@0
                  displayName: 'Deploy Test to Prod via Deployment Pipeline'
                  env:
                    FABRIC_CLIENT_SECRET: $(FABRIC_CLIENT_SECRET)
                  inputs:
                    scriptPath: 'scripts/promote.py'
                    arguments: >
                      --pipeline-id $(PIPELINE_ID)
                      --source-stage 1
                      --target-stage 2
```

### Python Promotion Script

```python
# scripts/promote.py
import requests
import sys
import time
import argparse
from azure.identity import ClientSecretCredential

def get_fabric_token() -> str:
    import os
    cred = ClientSecretCredential(
        tenant_id=os.environ["FABRIC_TENANT_ID"],
        client_id=os.environ["FABRIC_CLIENT_ID"],
        client_secret=os.environ["FABRIC_CLIENT_SECRET"]
    )
    return cred.get_token("https://api.fabric.microsoft.com/.default").token

def promote_stage(pipeline_id: str, source_stage: int, note: str = "") -> bool:
    token = get_fabric_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Start deployment
    deploy_resp = requests.post(
        f"https://api.fabric.microsoft.com/v1/pipelines/{pipeline_id}/deployAll",
        headers=headers,
        json={
            "sourceStageOrder": source_stage,
            "isBackwardDeployment": False,
            "note": note or f"Automated promotion from stage {source_stage} to {source_stage + 1}"
        }
    )
    deploy_resp.raise_for_status()
    operation_id = deploy_resp.json().get("operationId")

    # Poll for completion
    for attempt in range(60):
        time.sleep(10)
        status_resp = requests.get(
            f"https://api.fabric.microsoft.com/v1/pipelines/{pipeline_id}/operations/{operation_id}",
            headers=headers
        )
        status = status_resp.json().get("status")
        if status == "Succeeded":
            print(f"Promotion completed successfully.")
            return True
        elif status == "Failed":
            print(f"Promotion failed: {status_resp.json()}")
            return False
        print(f"[{attempt + 1}/60] Deployment status: {status}")

    print("Timeout waiting for deployment")
    return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pipeline-id", required=True)
    parser.add_argument("--source-stage", type=int, required=True)
    parser.add_argument("--target-stage", type=int, required=True)
    args = parser.parse_args()

    success = promote_stage(args.pipeline_id, args.source_stage)
    sys.exit(0 if success else 1)
```

---

## 7. Environment-Specific Configuration

### Parameter Management for Dev/Test/Prod

Fabric notebooks and pipelines can reference environment-specific parameters via Lakehouse tables or Azure Key Vault:

```python
# In a Fabric notebook — read environment config from a config Lakehouse table
import sempy.fabric as fabric

env = spark.conf.get("spark.fabric.workspace.name", "dev")

config_df = spark.read.format("delta").load(
    f"abfss://config@onelake.dfs.fabric.microsoft.com/config-lakehouse/Tables/EnvironmentConfig"
)
env_config = config_df.filter(f"environment = '{env}'").collect()[0]

SOURCE_DB = env_config["source_database"]
REFRESH_SCHEDULE = env_config["refresh_cron"]
```

### Secret Management

```python
# In a Fabric notebook — read secrets from Azure Key Vault
from notebookutils import mssparkutils

secret_value = mssparkutils.credentials.getSecret(
    "https://contoso-keyvault.vault.azure.net/",
    "db-connection-string"
)
```

---

## 8. Rollback Strategy

### Rollback via Git

```bash
# 1. Identify the last good commit in Git
# 2. Update the workspace from the target commit hash
curl -X POST \
  "https://api.fabric.microsoft.com/v1/workspaces/${WORKSPACE_ID}/git/updateFromGit" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "remoteCommitHash": "<last-good-commit-hash>",
    "conflictResolution": {
      "conflictResolutionType": "Workspace",
      "conflictResolutionPolicy": "PreferRemote"
    },
    "options": {"allowOverrideItems": true}
  }'
```

### Rollback via Deployment Pipeline (Backward Deploy)

```bash
# Deploy backward — promote Prod back to the previous Test state
# (reverses the promotion direction)
curl -X POST \
  "https://api.fabric.microsoft.com/v1/pipelines/${PIPELINE_ID}/deployAll" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceStageOrder": 2,
    "isBackwardDeployment": true,
    "note": "ROLLBACK: reverting to pre-release state due to data quality issue"
  }'
```

**Rollback decision matrix**:
| Situation | Rollback method |
|-----------|----------------|
| Bad notebook code pushed to Dev | Git revert + update workspace from previous commit |
| Bad promotion to Test | Backward deploy from Test to Dev state |
| Bad production release | Backward deploy from Prod to Test state |
| Semantic model breaking change | Backward deploy of semantic model only (selective deploy) |
| Data pipeline producing wrong data | Selective deploy of corrected pipeline only |

---

## 9. Error Handling and Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Git connect fails: `Organization not found` | OAuth token lacks access to the ADO org | Re-authorize OAuth with the correct Azure DevOps organization access |
| `Conflict detected during sync` | Workspace and Git have divergent changes | Resolve via portal > Git integration > Manage conflicts; choose workspace or Git version per item |
| Deployment pipeline stuck in `Running` | Large semantic model refresh during promotion | Increase timeout in polling script; check Capacity Metrics for throttling |
| `403 on /pipelines/deployAll` | Service principal not assigned as Pipeline Deployer | In Fabric portal > Deployment pipeline > Manage access > Add SPN as Deployer |
| Deployment rule not applied | Rule references wrong item ID or data source name | Re-create rule with correct item ID from target stage |
| `updateFromGit: allowOverrideItems required` | Workspace has unsaved changes | Commit or discard workspace changes before updating from Git |
| Notebook in Git as `.py` not syncing back | Notebook was created in workspace, not committed yet | Commit to Git first; then it will sync bidirectionally |

---

## 10. Performance and Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Items per Deployment Pipeline | 250 per stage | |
| Stages per Deployment Pipeline | 3 | Dev / Test / Prod |
| Deployment Pipelines per capacity | No hard limit | Practical: 1 per product team |
| Git repos per workspace | 1 | One workspace ↔ one branch at a time |
| Items tracked in Git per workspace | Unlimited | Practical: < 500 items for usable UI |
| Deployment operation timeout | 2 hours | |
| Git commit size (max payload) | 100 MB | Split large binary artifacts |
| Concurrent deployment operations | 1 per pipeline | Operations queue; they do not run in parallel |

---

## Progressive Disclosure — Reference Files

| Topic | File |
|---|---|
| Git integration — REST API, sync operations, conflict resolution, workspace setup | [`references/git-integration.md`](./references/git-integration.md) |
| Deployment pipelines — stage management, promotion API, deployment rules, rollback | [`references/deployment-pipelines.md`](./references/deployment-pipelines.md) |
| CI/CD patterns — Azure DevOps / GitHub Actions YAML, validation scripts, environment configs | [`references/cicd-patterns.md`](./references/cicd-patterns.md) |
| Fabric REST API — auth, item model, item-definition (code-first ALM), long-running operations, throttling | [`references/fabric-rest-api.md`](./references/fabric-rest-api.md) |
| Semantic Link (SemPy) — notebook-based model validation, refresh, deploy, and PR-gate conformance scans | [`references/semantic-link-sempy.md`](./references/semantic-link-sempy.md) |
