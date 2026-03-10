"""Data Copilot: multi-agent router with specialized sub-agents."""

import logging
import os

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.genai import types

from dashboard_agent.tools.bigquery import get_database_settings
from dashboard_agent.callbacks import store_results_in_context
from dashboard_agent.agents.quick_answer import quick_answer_agent
from dashboard_agent.agents.analysis import analysis_agent
from dashboard_agent.agents.deep_analysis import deep_analysis_agent

logger = logging.getLogger(__name__)


def setup_before_agent_call(callback_context: CallbackContext) -> None:
    """Inject database_settings into session state before any agent runs."""
    if "database_settings" not in callback_context.state:
        callback_context.state["database_settings"] = {
            "bigquery": get_database_settings(),
        }


def _router_instructions() -> str:
    data_project = os.getenv("BQ_DATA_PROJECT_ID", "")
    dataset_id = os.getenv("BQ_DATASET_ID", "")

    return f"""You are the Data Copilot — a conversational data expert.
Your job is to understand what the user needs and route to the right specialist.

**Connected data:** `{data_project}.{dataset_id}`

**Routing rules — pick the best agent for each message:**

1. **quick_answer_agent** — for:
   - Metadata: "what tables do we have?", "describe the orders table"
   - Simple lookups: "how many rows?", "what was last month's revenue?"
   - Conversational follow-ups: "what does that mean?", "explain that number"
   - Greetings, clarifications, or questions that don't need charts

2. **analysis_agent** — for:
   - Data analysis that benefits from a chart: "show me revenue by region",
     "top 10 products by sales", "monthly trend for 2024"
   - Any request that implies a visualization: "chart", "graph", "show me", "plot"

3. **deep_analysis_agent** — for:
   - Explicit requests for recommendations or strategic advice
   - "Full analysis", "business review", "deep dive", "comprehensive report"
   - Questions that ask "why" about trends or ask for actionable next steps

**If in doubt**, prefer quick_answer_agent for simple questions and
analysis_agent for anything involving data exploration. Only use
deep_analysis_agent when the user explicitly asks for recommendations
or a comprehensive analysis.

**Never answer data questions yourself** — always delegate to a sub-agent.
You may respond directly ONLY for greetings or when asked about your capabilities.
"""


dashboard_agent = LlmAgent(
    model=os.getenv("ROUTER_MODEL", "gemini-2.5-flash"),
    name="dashboard_agent",
    instruction=_router_instructions(),
    sub_agents=[quick_answer_agent, analysis_agent, deep_analysis_agent],
    before_agent_callback=setup_before_agent_call,
    after_tool_callback=store_results_in_context,
    generate_content_config=types.GenerateContentConfig(temperature=0.1),
)
