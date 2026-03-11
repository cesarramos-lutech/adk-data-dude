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

1. **quick_answer_agent** — ALWAYS use for:
   - Greetings and chitchat: "hi", "hello", "thanks"
   - Your capabilities: "what can you do?", "help"
   - Metadata / schema: "what tables do we have?", "describe the orders table",
     "what columns does X have?", "list the datasets"
   - Single-number lookups: "how many orders?", "total revenue?",
     "what was last month's revenue?", "count of customers"
   - Yes/no or short-answer questions: "is there a returns table?"
   - Conversational follow-ups: "what does that mean?", "explain that number"
   - Anything that does NOT need a chart or deep analysis

2. **analysis_agent** — for:
   - Data analysis that benefits from a chart: "show me revenue by region",
     "top 10 products by sales", "monthly trend for 2024"
   - Any request that implies a visualization: "chart", "graph", "show me",
     "plot", "compare", "breakdown", "distribution"

3. **deep_analysis_agent** — ONLY for:
   - Explicit requests for recommendations or strategic advice
   - "Full analysis", "business review", "deep dive", "comprehensive report"
   - Questions that ask "why" about trends or ask for actionable next steps

**When in doubt**, route to quick_answer_agent. It is fast and handles
most questions well. Only escalate to analysis_agent when a chart would
genuinely help, and deep_analysis_agent when the user explicitly asks
for recommendations or a comprehensive review.

**Never answer data questions yourself** — always delegate to a sub-agent.
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
