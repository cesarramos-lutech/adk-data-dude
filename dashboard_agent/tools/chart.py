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
    tool_context: ToolContext | None = None,
) -> str:
    """Build a Vega-Lite chart from the most recent query result stored in session state.

    Args:
        chart_type_hint: One of 'bar', 'line', 'scatter', or 'auto'.
        tool_context: ADK tool context used to read query results from state.

    Returns:
        JSON string of the Vega-Lite spec so the UI can render it.
    """
    logger.debug("build_dashboard - chart_type_hint: %s", chart_type_hint)
    query_result = (tool_context.state.get("bigquery_query_result", []) if tool_context else [])
    df = _to_dataframe(query_result)
    if df.empty or len(df.columns) < 1:
        return json.dumps({"description": "No data to chart.", "data": {"values": []}})
    chart_type = (chart_type_hint or "auto").strip().lower() or "auto"
    x_col, y_col = _pick_columns(df, chart_type if chart_type != "auto" else "bar")
    if chart_type == "auto":
        chart_type = "scatter" if (y_col and pd.api.types.is_numeric_dtype(df[x_col]) and pd.api.types.is_numeric_dtype(df[y_col])) else "bar"
    # Limit rows for chart
    df_chart = df.head(500)
    data = df_chart.to_dict(orient="records")
    for row in data:
        for k, v in list(row.items()):
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()
            elif pd.isna(v):
                row[k] = None
    if chart_type == "bar":
        if y_col:
            chart = alt.Chart(alt.Data(values=data)).mark_bar().encode(
                x=alt.X(x_col, type="nominal" if not pd.api.types.is_numeric_dtype(df[x_col]) else "quantitative"),
                y=alt.Y(y_col, type="quantitative"),
            )
        else:
            chart = alt.Chart(alt.Data(values=data)).mark_bar().encode(
                x=alt.X(x_col, type="nominal"),
                y=alt.Y("count():Q", title="Count"),
            )
    elif chart_type == "line":
        if not y_col:
            # Need distinct x and y: use first two columns, or same column for y and index for x
            if len(df.columns) >= 2:
                x_col = df.columns[0]
                y_col = df.columns[1]
            else:
                # Single column: use it as y, row order as x (add index to data)
                x_col = "__index__"
                y_col = df.columns[0]
                for i, row in enumerate(data):
                    row[x_col] = i
        if x_col == y_col:
            # Fallback if both ended up the same (e.g. single column): use index for x
            x_col = "__index__"
            for i, row in enumerate(data):
                row[x_col] = i
        chart = alt.Chart(alt.Data(values=data)).mark_line().encode(
            x=alt.X(x_col, type="temporal" if "date" in str(df[x_col].dtype).lower() and x_col in df.columns else "quantitative"),
            y=alt.Y(y_col, type="quantitative"),
        )
    elif chart_type == "scatter":
        y_col = y_col or (df.columns[1] if len(df.columns) > 1 else df.columns[0])
        chart = alt.Chart(alt.Data(values=data)).mark_circle(size=60).encode(
            x=alt.X(x_col, type="quantitative"),
            y=alt.Y(y_col, type="quantitative"),
        )
    else:
        if y_col:
            chart = alt.Chart(alt.Data(values=data)).mark_bar().encode(
                x=alt.X(x_col, type="nominal"),
                y=alt.Y(y_col, type="quantitative"),
            )
        else:
            chart = alt.Chart(alt.Data(values=data)).mark_bar().encode(
                x=alt.X(x_col, type="nominal"),
                y=alt.Y("count():Q", title="Count"),
            )
    spec = chart.to_dict()
    return json.dumps(spec, default=str)
