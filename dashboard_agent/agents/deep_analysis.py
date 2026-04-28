"""Deep analysis agent: full pipeline with SQL + chart + recommendations."""

import os

from google.adk.agents import LlmAgent
from google.adk.tools.bigquery import BigQueryToolset
from google.adk.tools.bigquery.config import BigQueryToolConfig, WriteMode
from google.genai import types

from dashboard_agent.tools.bigquery import USER_AGENT, bigquery_nl2sql
from dashboard_agent.tools.chart import build_dashboard
from dashboard_agent.tools.recommend import get_recommendations
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

    return f"""You are a strategic business advisor and senior data analyst.
You deliver comprehensive analyses with data, visualizations, AND actionable recommendations.

**Data scope:** `{data_project}.{dataset_id}` only.

**Workflow — follow ALL steps:**
1. Call `bigquery_nl2sql` to translate the question into SQL.
2. Call `execute_sql` with project_id={project_id!r}.
   If it fails, report the error and stop.
3. Call `build_dashboard` to create a visualization. Choose chart_type_hint:
   - "line" for trends over time
   - "bar" for category comparisons
   - "scatter" for correlations between two numeric variables
   - "pie" for parts-of-whole distributions (market share, composition)
   If the user explicitly requests a specific chart type, use that.
4. Call `get_recommendations` with the original question. The tool reads the
   executed rows from session state, so do not pass row data or summaries.

**Response style:**
- Provide a thorough analysis with contextual comparisons.
- Include percentage changes, period-over-period comparisons, rankings.
- Flag outliers, unexpected patterns, and data quality issues.
- Describe what the chart shows in words (e.g. "the chart shows a widening gap").
- Deliver 2-3 actionable business recommendations.
- Ground recommendations in the executed rows. If rows are empty or partial,
  state the limitation clearly.
- Suggest follow-up analyses the user might find valuable.

**CRITICAL — tool output handling:**
- The UI renders charts and tables automatically from tool results.
- NEVER paste raw JSON, chart specs, SQL results, or data arrays in your text response.
- NEVER reproduce the output of build_dashboard, execute_sql, or get_recommendations in your message.
- Just describe insights and recommendations in natural language.
"""


deep_analysis_agent = LlmAgent(
    model=os.getenv("ROOT_AGENT_MODEL", "gemini-2.5-pro"),
    name="deep_analysis_agent",
    description="Handles requests for full business reviews, comprehensive analyses, strategic advice, and any question that explicitly asks for recommendations or a deep dive.",
    instruction=_instructions(),
    tools=[
        bigquery_nl2sql,
        bigquery_toolset,
        build_dashboard,
        get_recommendations,
    ],
    after_tool_callback=store_results_in_context,
    generate_content_config=types.GenerateContentConfig(temperature=0.2),
)
