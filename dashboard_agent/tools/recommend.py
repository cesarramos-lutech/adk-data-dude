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

import logging
import os

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
    query_result_summary: str,
    tool_context: ToolContext | None = None,
) -> str:
    """Return 2–3 bullet business recommendations based on the user question and query result summary.

    Uses Vertex Gemini (same project/location as agent). All config from env.
    """
    logger.debug("get_recommendations - question: %s", question[:80] if question else "")
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

**Data summary:** {query_result_summary}"""
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config={"temperature": 0.3},
    )
    return (response.text or "").strip()
