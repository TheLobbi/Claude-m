# Semantic Link (SemPy) for CI validation and deployment

Semantic Link's Python library **SemPy** (`sempy.fabric`) runs inside Fabric notebooks and wraps the Power BI / Fabric REST APIs with a friendly, pandas-native interface. In a GitOps pipeline it is the cleanest way to **validate semantic models, refresh after deployment, deploy model definitions, and gate releases** — all from a notebook step you can call from Azure DevOps or GitHub Actions.

## Install / availability

Semantic Link ships in the default Fabric runtime for Spark 3.4+ (no install). For older runtimes or the latest version:

```python
%pip install -U semantic-link-sempy
import sempy.fabric as fabric
```

## Core functions

| Function | Purpose |
|----------|---------|
| `fabric.list_workspaces()` / `list_datasets(workspace=...)` | Enumerate workspaces / semantic models |
| `fabric.list_measures(dataset, workspace=...)` | List a model's measures (validate expected measures exist) |
| `fabric.list_tables(dataset)` / `list_relationships(dataset)` | Inspect model structure |
| `fabric.evaluate_measure(dataset, measure, groupby_columns=, filters=)` | Compute one or more measures (smoke-test outputs) |
| `fabric.evaluate_dax(dataset, dax_string)` | Run an arbitrary DAX query |
| `fabric.refresh_semantic_model(dataset, refresh_type=, tables=, partitions=, workspace=)` | Refresh a model (wraps enhanced refresh; `refresh_type`: full/automatic/dataOnly/calculate/clearValues/defragment) |
| `fabric.get_refresh_execution_details(dataset, refresh_request_id)` | Poll a refresh's status |
| `fabric.deploy_semantic_model(source_dataset, source_workspace, target_dataset, target_workspace, refresh_target_dataset=, overwrite=)` | Copy a model definition between workspaces (wraps getDefinition + create/updateDefinition) |
| `fabric.update_direct_lake_model_lakehouse_connection(dataset, lakehouse=, lakehouse_workspace=)` | Remap a Direct Lake model to a new lakehouse after promotion |

`FabricRestClient` / `PowerBIRestClient` give raw, authenticated REST access for anything without a wrapper:

```python
client = fabric.FabricRestClient()
resp = client.get(f"/v1/workspaces/{ws_id}/items?type=SemanticModel")
```

## CI/CD patterns

### 1. Validation gate — required measures exist and compute

```python
import sempy.fabric as fabric

DATASET, WS = "SalesModel", "analytics-test"

measures = set(fabric.list_measures(DATASET, workspace=WS)["Measure Name"])
required = {"Total Sales", "Total Sales YTD", "Gross Margin %"}
missing = required - measures
assert not missing, f"Missing required measures: {missing}"

# smoke-test that key measures evaluate without error and are sane
df = fabric.evaluate_measure(DATASET, ["Total Sales", "Gross Margin %"], workspace=WS)
assert df["Total Sales"].iloc[0] > 0, "Total Sales returned non-positive"
print("Validation passed:", df.to_dict("records"))
```

### 2. Refresh after deployment and verify

```python
det = fabric.refresh_semantic_model("SalesModel", refresh_type="full", workspace="analytics-prod")
# refresh_semantic_model is synchronous by default; raises on failure.
# For async control, capture the request id and poll:
# fabric.get_refresh_execution_details("SalesModel", request_id, workspace="analytics-prod")
print("Refresh complete")
```

### 3. Code-first model promotion (alternative to Deployment Pipelines)

```python
fabric.deploy_semantic_model(
    source_dataset="SalesModel", source_workspace="analytics-dev",
    target_dataset="SalesModel",  target_workspace="analytics-test",
    overwrite=True, refresh_target_dataset=True,
)
# For Direct Lake models, repoint to the target environment's lakehouse:
fabric.update_direct_lake_model_lakehouse_connection(
    "SalesModel", workspace="analytics-test",
    lakehouse="SalesLakehouse", lakehouse_workspace="analytics-test")
```

### 4. Conformance / best-practice scan in a PR gate

```python
for ds in fabric.list_datasets(workspace="analytics-dev")["Dataset Name"]:
    rels = fabric.list_relationships(ds, workspace="analytics-dev")
    bidi = rels[rels["Cross Filtering Behavior"] == "BothDirections"]
    if len(bidi):
        print(f"WARN {ds}: {len(bidi)} bi-directional relationships (ambiguity risk)")
```

## Calling SemPy notebooks from a pipeline

Run the validation notebook as a job and fail the stage on a non-zero result. Trigger via the **Job Scheduler REST API** (`POST /workspaces/{wsId}/items/{notebookId}/jobs/instances?jobType=RunNotebook`) and poll the job instance, or use the `notebookutils`/`%run` mechanisms inside an orchestrator notebook. Surface assertion failures so the CI stage (Azure DevOps / GitHub Actions in `cicd-patterns.md`) marks the build red.

## Notes and limits

- SemPy authenticates as the notebook's identity (user or the pipeline's service principal); ensure that principal has access to the target workspaces.
- `refresh_semantic_model` requires data source credentials to already be configured on the model (set via the service or REST) — a refresh can't supply them.
- Keep validation deterministic: assert on measure existence and bounded/expected values, not exact figures that drift with data.
- SemPy complements, but does not replace, the REST/Git/Deployment-Pipeline ALM in the other references — use it for the *model-aware* validation and refresh steps of the pipeline.
