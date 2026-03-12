# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Chart tool: return chart metadata + data for the frontend to render with Nivo."""

import json
import logging

import pandas as pd

from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)


def _humanize(col: str) -> str:
    """Convert snake_case column name to Title Case label."""
    return col.replace("_", " ").title()


def _to_dataframe(query_result: list) -> pd.DataFrame:
    if isinstance(query_result, list):
        return pd.DataFrame(query_result)
    raise ValueError("query_result must be a list of dicts")


def _pick_columns(df: pd.DataFrame, chart_type: str) -> tuple[str, str | None]:
    """Pick x and y column names for the chart. Prefer numeric for y."""
    numeric = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    other = [c for c in df.columns if c not in numeric]
    if chart_type == "scatter" and len(numeric) >= 2:
        return numeric[0], numeric[1]
    if numeric and other:
        return other[0], numeric[0]
    if len(other) >= 2:
        return other[0], other[1]
    if len(other) == 1:
        return other[0], None
    if len(numeric) >= 2:
        return numeric[0], numeric[1]
    if len(numeric) == 1:
        return numeric[0], None
    return df.columns[0], df.columns[1] if len(df.columns) > 1 else None


def build_dashboard(
    chart_type_hint: str = "auto",
    tool_context: ToolContext = None,
) -> str:
    """Build chart metadata from the most recent query result stored in session state.

    Args:
        chart_type_hint: One of 'bar', 'line', 'scatter', 'pie', or 'auto'.
        tool_context: ADK tool context used to read query results from state.

    Returns:
        JSON string with chart_type, columns, title, and data for the UI.
    """
    logger.debug("build_dashboard - chart_type_hint: %s", chart_type_hint)
    if tool_context is None:
        raise RuntimeError("build_dashboard requires ToolContext — ADK should inject this automatically")

    query_result = tool_context.state.get("bigquery_query_result", [])
    df = _to_dataframe(query_result)
    if df.empty or len(df.columns) < 1:
        return json.dumps({"chart_type": "table", "x_col": None, "y_col": None, "title": "No data", "data": []})

    chart_type = (chart_type_hint or "auto").strip().lower() or "auto"
    x_col, y_col = _pick_columns(df, chart_type if chart_type != "auto" else "bar")

    if chart_type == "auto":
        if y_col and pd.api.types.is_numeric_dtype(df[x_col]) and pd.api.types.is_numeric_dtype(df[y_col]):
            chart_type = "scatter"
        else:
            chart_type = "bar"

    if chart_type == "line" and not y_col:
        if len(df.columns) >= 2:
            x_col = df.columns[0]
            y_col = df.columns[1]
        else:
            df["__index__"] = range(len(df))
            x_col = "__index__"
            y_col = df.columns[0]

    if chart_type == "line" and x_col == y_col:
        df["__index__"] = range(len(df))
        x_col = "__index__"

    if chart_type == "pie":
        chart_title = f"{_humanize(y_col)} by {_humanize(x_col)}" if y_col else _humanize(x_col)
    elif chart_type == "line":
        chart_title = f"{_humanize(y_col)} over {_humanize(x_col)}" if y_col else _humanize(x_col)
    elif chart_type == "scatter":
        chart_title = f"{_humanize(y_col)} vs {_humanize(x_col)}" if y_col else _humanize(x_col)
    else:
        chart_title = f"{_humanize(y_col)} by {_humanize(x_col)}" if y_col else _humanize(x_col)

    df_chart = df.head(500)
    data = json.loads(df_chart.to_json(orient="records", default_handler=str))

    result = {
        "chart_type": chart_type,
        "x_col": x_col,
        "y_col": y_col,
        "title": chart_title,
        "data": data,
    }
    tool_context.state["chart_meta"] = result
    return json.dumps(result, default=str)
