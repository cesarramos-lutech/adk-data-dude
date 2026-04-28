"""Analysis agent: NL2SQL -> execute -> visualize for analytical questions."""

import os

from google.adk.agents import LlmAgent
from google.adk.tools.bigquery import BigQueryToolset
from google.adk.tools.bigquery.config import BigQueryToolConfig, WriteMode
from google.genai import types

from dashboard_agent.tools.bigquery import USER_AGENT, bigquery_nl2sql
from dashboard_agent.tools.chart import build_dashboard
from dashboard_agent.callbacks import store_results_in_context

bigquery_toolset = BigQueryToolset(
    tool_filter=["execute_sql"],
    bigquery_tool_config=BigQueryToolConfig(
        write_mode=WriteMode.BLOCKED,
        application_name=USER_AGENT,
    ),
)


def _instructions() -> str:
    data_project = os.getenv("BQ_DATA_PROJECT_ID", "")
    dataset_id = os.getenv("BQ_DATASET_ID", "")
    project_id = os.getenv("BQ_COMPUTE_PROJECT_ID", "")

    return f"""You are a senior data analyst. You turn business questions into SQL,
execute them, and create compelling visualizations.

**Data scope:** `{data_project}.{dataset_id}` only.

**Workflow — follow in order:**
1. Call `bigquery_nl2sql` to translate the question into SQL.
2. Call `execute_sql` with project_id={project_id!r} to run it.
   If it fails, report the error and stop — do NOT call build_dashboard.
3. Call `build_dashboard` to create a chart. Choose chart_type_hint:
   - "line" for trends over time
   - "bar" for category comparisons
   - "scatter" for correlations between two numeric variables
   - "pie" for parts-of-whole distributions (market share, composition)
   If the user explicitly requests a specific chart type, use that.

**Response style:**
- Lead with the insight, then support with data.
- Contextualize numbers: include % changes, comparisons, rankings.
- Flag notable patterns: outliers, spikes, missing data.
- Be concise — 2-4 sentences of analysis, not a full report.
- Prefer simple, auditable explanations. Mention key filters or groupings when
  they help the user trust the result, but do not dump SQL.
- Suggest a natural follow-up question at the end.

**CRITICAL — tool output handling:**
- The UI renders charts and tables automatically from tool results.
- NEVER paste raw JSON, chart specs, SQL results, or data arrays in your text response.
- NEVER reproduce the output of build_dashboard or execute_sql in your message.
- Just describe what the data shows in natural language.
"""


analysis_agent = LlmAgent(
    model=os.getenv("ROOT_AGENT_MODEL", "gemini-2.5-pro"),
    name="analysis_agent",
    description="Handles analytical questions that require SQL queries and data visualization — revenue trends, top-N rankings, comparisons, breakdowns by dimension.",
    instruction=_instructions(),
    tools=[
        bigquery_nl2sql,
        bigquery_toolset,
        build_dashboard,
    ],
    after_tool_callback=store_results_in_context,
    generate_content_config=types.GenerateContentConfig(temperature=0.2),
)
