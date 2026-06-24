# Fabric REST API fundamentals (for automation & ALM)

The Microsoft Fabric REST APIs are the automation backbone under Git integration and deployment pipelines. This reference covers the core mechanics every CI/CD script relies on: authentication, the item model, item-definition APIs (the basis of code-first ALM), long-running operations, and throttling. For pipeline-specific endpoints see `deployment-pipelines.md`; for Git endpoints see `git-integration.md`.

## Base URL and structure

- **Base:** `https://api.fabric.microsoft.com/v1`
- **Two API families:**
  - **Core APIs** — cross-workload primitives: Workspaces, Items, Git, Deployment Pipelines, Long Running Operations, Job Scheduler, Capacities.
  - **Workload APIs** — per-item-type definition + operations (Notebook, Lakehouse, Data Pipeline, Semantic Model, Warehouse, Eventhouse, Report, …).
- **Azure (ARM) APIs** are separate: the [Fabric capacity REST APIs](https://learn.microsoft.com/rest/api/microsoftfabric/) under Azure Resource Manager create/scale/pause capacities (scope `https://management.azure.com/.default`).

## Authentication

Acquire a Microsoft Entra token for the Fabric resource and send it as a bearer token.

- **Scope:** `https://api.fabric.microsoft.com/.default`
- **Service principal** (CI/CD): client credentials flow. The SPN must be added to the workspace with the right role (Admin/Member/Contributor) and the tenant setting "Service principals can use Fabric APIs" must be enabled.

```python
from azure.identity import ClientSecretCredential
import requests, os

cred = ClientSecretCredential(os.environ["FABRIC_TENANT_ID"],
                              os.environ["FABRIC_CLIENT_ID"],
                              os.environ["FABRIC_CLIENT_SECRET"])
token = cred.get_token("https://api.fabric.microsoft.com/.default").token
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
```

## The item model

Everything in a workspace (notebooks, lakehouses, pipelines, semantic models, reports) is an **item**. Generic CRUD lives under a workspace:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/workspaces/{wsId}/items` | List items (filter with `?type=Notebook`) |
| GET | `/workspaces/{wsId}/items/{itemId}` | Get item metadata |
| POST | `/workspaces/{wsId}/items` | Create an item (optionally with a `definition`) |
| PATCH | `/workspaces/{wsId}/items/{itemId}` | Rename / update metadata |
| DELETE | `/workspaces/{wsId}/items/{itemId}` | Delete an item |

## Item-definition APIs — code-first ALM

The definition APIs serialize/deserialize an item's source, which is what makes Git-free, script-driven promotion possible. Definition `parts` carry **base64-encoded** payloads (TMDL/TMSL for semantic models, `notebook-content.py` for notebooks, `pipeline-content.json` for pipelines).

| Endpoint | Purpose |
|----------|---------|
| `POST /workspaces/{wsId}/items/{itemId}/getDefinition` | Export the item's definition (parts) |
| `POST /workspaces/{wsId}/items` with `definition` | Create an item from a definition |
| `POST /workspaces/{wsId}/items/{itemId}/updateDefinition` | Overwrite an item's definition |

```python
import base64, json

def read_part(path):
    return base64.b64encode(open(path, "rb").read()).decode()

# Deploy a semantic model from a local TMDL/TMSL definition
body = {
  "displayName": "SalesModel",
  "type": "SemanticModel",
  "definition": {
    "parts": [
      {"path": "definition.pbism", "payload": read_part("SalesModel/definition.pbism"), "payloadType": "InlineBase64"},
      {"path": "model.bim",         "payload": read_part("SalesModel/model.bim"),        "payloadType": "InlineBase64"}
    ]
  }
}
r = requests.post(f"https://api.fabric.microsoft.com/v1/workspaces/{wsId}/items", headers=H, json=body)
```

> For semantic models specifically, SemPy's `deploy_semantic_model` wraps getDefinition + create/updateDefinition — see `semantic-link-sempy.md`.

## Long-running operations (LRO)

Many calls (create-from-definition, updateDefinition, git sync, pipeline deploy) are asynchronous. They return **`202 Accepted`** with a `Location` header (the operation URL) and a `Retry-After` header (seconds). Poll the operation until it reaches a terminal state.

```python
def wait_for_lro(resp):
    if resp.status_code != 202:
        resp.raise_for_status()
        return resp.json() if resp.text else None
    op_url = resp.headers["Location"]
    delay = int(resp.headers.get("Retry-After", 5))
    while True:
        time.sleep(delay)
        s = requests.get(op_url, headers=H).json()
        status = s.get("status")
        if status in ("Succeeded", "Completed"):
            # result, if any, is at /result
            res = requests.get(op_url.rstrip("/") + "/result", headers=H)
            return res.json() if res.status_code == 200 and res.text else s
        if status in ("Failed", "Undeployed"):
            raise RuntimeError(f"Operation failed: {s.get('error')}")
        delay = int(s.get("retryAfter", delay))
```

Always drive async calls through a poll loop — never assume a `202` means done.

## Throttling and retries

Fabric enforces per-principal rate limits. On **`429 Too Many Requests`** (and `503`), honor the **`Retry-After`** header and back off; never hot-loop.

```python
def call(method, url, **kw):
    for attempt in range(6):
        r = requests.request(method, url, headers=H, **kw)
        if r.status_code in (429, 503):
            time.sleep(int(r.headers.get("Retry-After", 2 ** attempt)))
            continue
        return r
    r.raise_for_status()
```

Re-acquire the token on `401` (expired). Treat `403` as a permissions problem (SPN missing the workspace role or a tenant setting disabled), not a retry case.

## Where this fits in CI/CD

- **Discovery/governance** — list items, read definitions, run best-practice checks in a PR gate.
- **Code-first promotion** — getDefinition from the source workspace, updateDefinition in the target (an alternative to Deployment Pipelines when you need full control or cross-tenant moves).
- **Post-deploy validation** — trigger refreshes and verify with SemPy (`semantic-link-sempy.md`).
- Pair with **Git integration** (commit/update endpoints) and **Deployment Pipelines** (deployAll/deploy) covered in the other references.
