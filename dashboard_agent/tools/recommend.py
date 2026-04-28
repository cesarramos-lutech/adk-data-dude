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

"""Recommendation tool: call Gemini to return 2–3 bullet recommendations for the business user."""

import json
import logging
import os
import re

from google.adk.tools import ToolContext
from google.genai import Client
from google.genai.types import HttpOptions

USER_AGENT = "playground-dashboard-agent"
logger = logging.getLogger(__name__)


def _get_env_var(var_name: str) -> str:
    value = os.environ.get(var_name)
    if not value:
        raise ValueError(f"Missing environment variable: {var_name}")
    return value


def get_recommendations(
    question: str,
    tool_context: ToolContext | None = None,
) -> str:
    """Return 2–3 bullet business recommendations based on rows stored in session state.

    Uses Vertex Gemini (same project/location as agent). All config from env.
    """
    logger.debug("get_recommendations - question: %s", question[:80] if question else "")
    if tool_context is None:
        raise RuntimeError("get_recommendations requires ToolContext — ADK should inject this automatically")

    rows = tool_context.state.get("bigquery_query_result", [])
    error = tool_context.state.get("bigquery_query_error", "")
    if not isinstance(rows, list):
        rows = []

    capped_rows = rows[:50]
    data_summary = {
        "row_count": len(rows),
        "sample_rows": capped_rows,
        "query_error": error,
    }

    if error or not rows:
        fallback = {
            "insight_summary": "No grounded recommendations are available because the query returned no usable rows.",
            "key_points": ["No usable query rows were available."],
            "recommended_actions": ["Broaden the question or check the query audit."],
        }
        return json.dumps(fallback)

    vertex_project = _get_env_var("GOOGLE_CLOUD_PROJECT")
    location = _get_env_var("GOOGLE_CLOUD_LOCATION")
    model_name = os.getenv("ROOT_AGENT_MODEL", "gemini-2.5-pro")
    client = Client(
        vertexai=True,
        project=vertex_project,
        location=location,
        http_options=HttpOptions(headers={"user-agent": USER_AGENT}),
    )
    prompt = f"""You are a business analyst. Based on the user question and the data summary below, return a JSON object with the following structure. Respond with ONLY valid JSON, no markdown fences.

{{
  "insight_summary": "<1-2 sentence summary of the key finding>",
  "key_points": ["<bullet 1>", "<bullet 2>", "<bullet 3>"],
  "recommended_actions": ["<action 1>", "<action 2>", "<action 3>"]
}}

**User question:** {question}

**Data rows summary:** {json.dumps(data_summary, default=str)}"""
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config={"temperature": 0.3},
        )
        raw_text = (response.text or "").strip()
    except Exception as exc:
        logger.error("Gemini API call failed in get_recommendations: %s", exc)
        raw_text = ""

    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    fallback = {
        "insight_summary": raw_text or "No recommendations available.",
        "key_points": [],
        "recommended_actions": [],
    }

    if not cleaned:
        return json.dumps(fallback)

    try:
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        logger.warning("get_recommendations: Gemini returned non-JSON, using fallback")
        return json.dumps(fallback)

    if not isinstance(parsed, dict):
        return json.dumps(fallback)

    validated = {
        "insight_summary": parsed.get("insight_summary") or fallback["insight_summary"],
        "key_points": parsed.get("key_points") if isinstance(parsed.get("key_points"), list) else [],
        "recommended_actions": parsed.get("recommended_actions") if isinstance(parsed.get("recommended_actions"), list) else [],
    }
    return json.dumps(validated)
