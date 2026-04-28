"""Shared ADK callbacks for all agents in the Data Copilot."""

import logging
from typing import Any

from google.adk.tools import BaseTool, ToolContext

from dashboard_agent.tools.query_audit import (
    build_query_audit,
    classify_error,
    merge_execution_result,
)

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
        existing_audit = tool_context.state.get("query_audit")
        if not isinstance(existing_audit, dict):
            sql = args.get("query") or args.get("sql") or tool_context.state.get("sql_query", "")
            compute_project = (
                tool_context.state.get("database_settings", {})
                .get("bigquery", {})
                .get("compute_project_id", "")
            )
            existing_audit = build_query_audit(str(sql or ""), compute_project_id=compute_project)
            tool_context.state["query_audit"] = existing_audit

        if tool_response.get("status") == "SUCCESS":
            rows = tool_response.get("rows", [])
            tool_context.state["bigquery_query_result"] = rows
            tool_context.state["bigquery_query_error"] = ""
            tool_context.state["last_query_error_category"] = ""
            tool_context.state["query_audit"] = merge_execution_result(
                existing_audit,
                rows=rows,
                job_id=str(tool_response.get("job_id", "") or ""),
            )
        else:
            tool_context.state["bigquery_query_result"] = []
            error_msg = tool_response.get("error", "Unknown SQL error")
            tool_context.state["bigquery_query_error"] = error_msg
            tool_context.state["last_query_error_category"] = classify_error(error_msg)
            tool_context.state["query_audit"] = merge_execution_result(
                existing_audit,
                error_message=error_msg,
                job_id=str(tool_response.get("job_id", "") or ""),
            )
            logger.warning("execute_sql failed: %s", error_msg)
            return {"status": "error", "error": error_msg}
    return None
