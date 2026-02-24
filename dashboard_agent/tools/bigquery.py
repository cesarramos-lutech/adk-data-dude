"""BigQuery tools: schema discovery and NL-to-SQL. All config from env vars."""

import logging
import os

from google.adk.tools import ToolContext
from google.adk.tools.bigquery.client import get_bigquery_client
from google.cloud import bigquery
from google.genai import Client
from google.genai.types import HttpOptions

USER_AGENT = "playground-dashboard-agent"
MAX_NUM_ROWS = 10000

logger = logging.getLogger(__name__)


def _require(var: str) -> str:
    """Return env var value or raise a clear error — no API keys in code."""
    value = os.environ.get(var)
    if not value:
        raise ValueError(f"Missing required environment variable: {var}")
    return value


# ---------------------------------------------------------------------------
# Schema loading
# ---------------------------------------------------------------------------

# Module-level cache so we only fetch the BigQuery schema once per process.
_database_settings: dict | None = None


def get_database_settings() -> dict:
    """Return schema + project/dataset config, loaded once from env and BigQuery.

    Returns a dict with keys: schema, data_project_id, dataset_id, compute_project_id.
    Called by before_agent_callback so it is available in session state.
    """
    global _database_settings
    if _database_settings is not None:
        return _database_settings

    compute_project = _require("BQ_COMPUTE_PROJECT_ID")
    data_project    = _require("BQ_DATA_PROJECT_ID")
    dataset_id      = _require("BQ_DATASET_ID")

    logger.info("Loading BigQuery schema from %s.%s", data_project, dataset_id)

    client = get_bigquery_client(
        project=compute_project,
        credentials=None,
        user_agent=USER_AGENT,
    )

    dataset_ref = bigquery.DatasetReference(data_project, dataset_id)
    schema: dict = {}

    for table in client.list_tables(dataset_ref):
        table_info = client.get_table(bigquery.TableReference(dataset_ref, table.table_id))
        table_ref_str = str(dataset_ref.table(table.table_id))
        schema[table_ref_str] = {
            "table_schema": [(f.name, f.field_type) for f in table_info.schema],
            "example_values": [],
        }

    _database_settings = {
        "schema":            schema,
        "data_project_id":   data_project,
        "dataset_id":        dataset_id,
        "compute_project_id": compute_project,
    }
    return _database_settings


# ---------------------------------------------------------------------------
# NL-to-SQL tool
# ---------------------------------------------------------------------------

def bigquery_nl2sql(question: str, tool_context: ToolContext) -> str:
    """Generate a BigQuery SQL statement from a natural language question.

    Reads the schema and dataset coordinates from session state (populated by
    before_agent_callback) and passes them to Gemini with an explicit constraint
    so the model only references the configured dataset — never any other.
    """
    # Pull db settings injected by before_agent_callback
    db           = tool_context.state.get("database_settings", {}).get("bigquery", {})
    schema       = db.get("schema", {})
    data_project = db.get("data_project_id", "")
    dataset_id   = db.get("dataset_id", "")

    vertex_project = _require("GOOGLE_CLOUD_PROJECT")
    location       = _require("GOOGLE_CLOUD_LOCATION")
    model_name     = os.getenv("BASELINE_NL2SQL_MODEL", "gemini-2.5-pro")

    client = Client(
        vertexai=True,
        project=vertex_project,
        location=location,
        http_options=HttpOptions(headers={"user-agent": USER_AGENT}),
    )

    prompt = f"""You are a BigQuery SQL expert. Generate a single BigQuery SQL statement (Google SQL dialect).

CONSTRAINT: ONLY use tables from `{data_project}.{dataset_id}`. Never reference any other dataset or project.
Use fully-qualified table names in backticks, e.g. `{data_project}.{dataset_id}.table_name`.
Limit result rows to at most {MAX_NUM_ROWS}.

Schema:
{schema}

Question: {question}

Return only the SQL — no markdown fences, no explanation."""

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config={"temperature": 0.1},
    )

    sql = (response.text or "").replace("```sql", "").replace("```", "").strip()
    logger.debug("bigquery_nl2sql generated SQL: %s", sql[:200])

    # Store in state so the agent can pass it to execute_sql
    tool_context.state["sql_query"] = sql
    return sql
