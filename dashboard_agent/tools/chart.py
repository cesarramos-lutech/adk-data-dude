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

"""Chart tool: build Vega-Lite dashboard from query results using Altair."""

import json
import logging
from typing import Any

import altair as alt
import pandas as pd

from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)


def _to_dataframe(query_result: list) -> pd.DataFrame:
    """Convert list of rows to DataFrame."""
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
    """Build a Vega-Lite chart from the most recent query result stored in session state.

    Args:
        chart_type_hint: One of 'bar', 'line', 'scatter', or 'auto'.
        tool_context: ADK tool context used to read query results from state.
            ADK injects this automatically; None means misconfigured wiring.

    Returns:
        JSON string of the Vega-Lite spec so the UI can render it.
    """
    logger.debug("build_dashboard - chart_type_hint: %s", chart_type_hint)
    if tool_context is None:
        raise RuntimeError("build_dashboard requires ToolContext — ADK should inject this automatically")
    query_result = tool_context.state.get("bigquery_query_result", [])
    df = _to_dataframe(query_result)
    if df.empty or len(df.columns) < 1:
        return json.dumps({"description": "No data to chart.", "data": {"values": []}})
    chart_type = (chart_type_hint or "auto").strip().lower() or "auto"
    x_col, y_col = _pick_columns(df, chart_type if chart_type != "auto" else "bar")
    if chart_type == "auto":
        chart_type = "scatter" if (y_col and pd.api.types.is_numeric_dtype(df[x_col]) and pd.api.types.is_numeric_dtype(df[y_col])) else "bar"
    # Limit rows and use DataFrame directly so Altair infers types for tooltips
    df_chart = df.head(500).copy()
    chart_title = f"{y_col} by {x_col}" if y_col else x_col

    def _x_type(col: str) -> str:
        if pd.api.types.is_datetime64_any_dtype(df_chart[col]):
            return "temporal"
        if pd.api.types.is_numeric_dtype(df_chart[col]):
            return "quantitative"
        return "nominal"

    if chart_type == "bar":
        if y_col:
            chart = (
                alt.Chart(df_chart)
                .mark_bar()
                .encode(
                    x=alt.X(x_col, type=_x_type(x_col), title=x_col),
                    y=alt.Y(y_col, type="quantitative", title=y_col),
                    tooltip=[x_col, y_col],
                )
                .properties(title=chart_title)
            )
        else:
            chart = (
                alt.Chart(df_chart)
                .mark_bar()
                .encode(
                    x=alt.X(x_col, type="nominal", title=x_col),
                    y=alt.Y("count():Q", title="Count"),
                    tooltip=[x_col, "count():Q"],
                )
                .properties(title=chart_title)
            )
    elif chart_type == "line":
        if not y_col:
            if len(df_chart.columns) >= 2:
                x_col = df_chart.columns[0]
                y_col = df_chart.columns[1]
            else:
                df_chart["__index__"] = range(len(df_chart))
                x_col = "__index__"
                y_col = df_chart.columns[0]
        if x_col == y_col:
            df_chart["__index__"] = range(len(df_chart))
            x_col = "__index__"
        chart_title = f"{y_col} over {x_col}"
        x_type = "temporal" if (x_col in df_chart.columns and pd.api.types.is_datetime64_any_dtype(df_chart[x_col])) else "quantitative"
        chart = (
            alt.Chart(df_chart)
            .mark_line(point=True)
            .encode(
                x=alt.X(x_col, type=x_type, title=x_col),
                y=alt.Y(y_col, type="quantitative", title=y_col),
                tooltip=[x_col, y_col],
            )
            .properties(title=chart_title)
        )
    elif chart_type == "scatter":
        y_col = y_col or (df_chart.columns[1] if len(df_chart.columns) > 1 else df_chart.columns[0])
        chart_title = f"{y_col} vs {x_col}"
        chart = (
            alt.Chart(df_chart)
            .mark_circle(size=60)
            .encode(
                x=alt.X(x_col, type="quantitative", title=x_col),
                y=alt.Y(y_col, type="quantitative", title=y_col),
                tooltip=[x_col, y_col],
            )
            .properties(title=chart_title)
        )
    else:
        if y_col:
            chart = (
                alt.Chart(df_chart)
                .mark_bar()
                .encode(
                    x=alt.X(x_col, type="nominal", title=x_col),
                    y=alt.Y(y_col, type="quantitative", title=y_col),
                    tooltip=[x_col, y_col],
                )
                .properties(title=chart_title)
            )
        else:
            chart = (
                alt.Chart(df_chart)
                .mark_bar()
                .encode(
                    x=alt.X(x_col, type="nominal", title=x_col),
                    y=alt.Y("count():Q", title="Count"),
                )
                .properties(title=chart_title)
            )
    spec = chart.to_dict()
    # Add responsive sizing so the chart fills its container in the UI
    spec["width"] = "container"
    spec["height"] = 320
    tool_context.state["vega_lite_spec"] = spec
    return json.dumps(spec, default=str)
