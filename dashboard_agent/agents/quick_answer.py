"""Quick answer agent: handles metadata, schema, and simple factual lookups."""

import os

from google.adk.agents import LlmAgent
from google.adk.tools.bigquery import BigQueryToolset
from google.adk.tools.bigquery.config import BigQueryToolConfig, WriteMode
from google.genai import types

from dashboard_agent.tools.bigquery import USER_AGENT
from dashboard_agent.callbacks import store_results_in_context

bigquery_toolset = BigQueryToolset(
    tool_filter=["execute_sql"],
    bigquery_tool_config=BigQueryToolConfig(
        write_mode=WriteMode.BLOCKED,
        application_name=USER_AGENT,
    ),
)


def _instructions() -> str:
    data_project = os.getenv("BQ_DATA_PROJECT_ID", "")
    dataset_id = os.getenv("BQ_DATASET_ID", "")
    project_id = os.getenv("BQ_COMPUTE_PROJECT_ID", "")

    return f"""You are a helpful data assistant that answers quick factual questions.

**Data scope:** `{data_project}.{dataset_id}` — never reference any other project or dataset.

**When to use tools:**
- If the user asks about tables, schema, or metadata, run a simple SQL like
  SELECT table_name FROM `{data_project}.{dataset_id}.INFORMATION_SCHEMA.TABLES`
  or describe a table. Use execute_sql with project_id={project_id!r}.
- If the user asks a simple factual question (counts, single numbers, yes/no), write
  a concise SQL and use `execute_sql` to retrieve the answer.
- Keep SQL minimal: use the fewest tables needed, avoid JOINs unless necessary,
  select only required columns, and add a conservative LIMIT for list-style answers.

**Response style:**
- Be conversational and concise. Answer in 1-3 sentences.
- Present numbers clearly. For a single number, just state it naturally:
  "The orders table has 142,857 rows."
- If the result is a list, use bullet points.
- Do NOT generate charts or recommendations — that is not your job.
- End with a brief follow-up suggestion when appropriate:
  "Want me to explore any of these tables?" or "Should I dig deeper?"
"""


quick_answer_agent = LlmAgent(
    model=os.getenv("QUICK_ANSWER_MODEL", "gemini-2.5-flash"),
    name="quick_answer_agent",
    description="Handles simple factual questions, metadata queries, schema exploration, and conversational follow-ups that don't need charts or deep analysis.",
    instruction=_instructions(),
    tools=[bigquery_toolset],
    after_tool_callback=store_results_in_context,
    generate_content_config=types.GenerateContentConfig(temperature=0.2),
)
