"""Dashboard agent: query BigQuery, build charts, give recommendations. All config from env."""

import logging
import os
from typing import Any

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import BaseTool, ToolContext
from google.adk.tools.bigquery import BigQueryToolset
from google.adk.tools.bigquery.config import BigQueryToolConfig, WriteMode
from google.genai import types

from dashboard_agent.prompts import return_instructions
from dashboard_agent.tools.bigquery import USER_AGENT, bigquery_nl2sql, get_database_settings
from dashboard_agent.tools.chart import build_dashboard
from dashboard_agent.tools.recommend import get_recommendations

logger = logging.getLogger(__name__)

ADK_BUILTIN_BQ_EXECUTE_SQL_TOOL = "execute_sql"


def setup_before_agent_call(callback_context: CallbackContext) -> None:
    """Inject database_settings into session state before the agent runs.

    This makes the schema and dataset coordinates available to both
    bigquery_nl2sql (for SQL generation) and execute_sql (for query execution).
    Runs once per session thanks to the 'not in state' guard.
    """
    if "database_settings" not in callback_context.state:
        callback_context.state["database_settings"] = {
            "bigquery": get_database_settings(),
        }


def store_results_in_context(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
    tool_response: dict,
) -> dict | None:
    """After execute_sql succeeds, save rows into state for build_dashboard.

    build_dashboard reads from state instead of accepting rows as a parameter,
    which avoids passing large data through the LLM.
    """
    if tool.name == ADK_BUILTIN_BQ_EXECUTE_SQL_TOOL:
        if tool_response.get("status") == "SUCCESS":
            tool_context.state["bigquery_query_result"] = tool_response.get("rows", [])
    return None


# BigQueryToolset exposes only execute_sql (read-only via WriteMode.BLOCKED).
bigquery_toolset = BigQueryToolset(
    tool_filter=[ADK_BUILTIN_BQ_EXECUTE_SQL_TOOL],
    bigquery_tool_config=BigQueryToolConfig(
        write_mode=WriteMode.BLOCKED,
        application_name=USER_AGENT,
    ),
)

dashboard_agent = LlmAgent(
    model=os.getenv("ROOT_AGENT_MODEL", "gemini-2.5-pro"),
    name="dashboard_agent",
    instruction=return_instructions(),
    tools=[
        bigquery_nl2sql,    # step 1: NL → SQL (restricted to BQ_DATASET_ID)
        bigquery_toolset,   # step 2: execute the SQL
        build_dashboard,    # step 3: visualise results
        get_recommendations,# step 4: business recommendations
    ],
    before_agent_callback=setup_before_agent_call,
    after_tool_callback=store_results_in_context,
    generate_content_config=types.GenerateContentConfig(temperature=0.2),
)
