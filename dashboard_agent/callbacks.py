"""Shared ADK callbacks for all agents in the Data Copilot."""

import logging
from typing import Any

from google.adk.tools import BaseTool, ToolContext

logger = logging.getLogger(__name__)

ADK_BUILTIN_BQ_EXECUTE_SQL_TOOL = "execute_sql"


def store_results_in_context(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
    tool_response: dict,
) -> dict | None:
    """After execute_sql, save rows (or error) into state for downstream tools."""
    if tool.name == ADK_BUILTIN_BQ_EXECUTE_SQL_TOOL:
        if tool_response.get("status") == "SUCCESS":
            tool_context.state["bigquery_query_result"] = tool_response.get("rows", [])
            tool_context.state["bigquery_query_error"] = ""
        else:
            tool_context.state["bigquery_query_result"] = []
            error_msg = tool_response.get("error", "Unknown SQL error")
            tool_context.state["bigquery_query_error"] = error_msg
            logger.warning("execute_sql failed: %s", error_msg)
            return {"status": "error", "error": error_msg}
    return None
