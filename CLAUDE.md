# CLAUDE.md — Lessons Learned: Data Dude Agent

## ADK Tool Signature Rules

**No complex Union types in tool parameters.**
ADK introspects function signatures to generate a JSON schema for the LLM. Types it cannot serialize will silently break tool calling.

- BAD: `query_result: list[dict[str, Any]] | pd.DataFrame`
- GOOD: `query_result: list[dict[str, Any]]` (or remove the param entirely — see below)

**No pandas DataFrames as LLM-facing parameters.**
`pd.DataFrame` has no JSON schema representation. Never put it in a tool's public signature.

**Keep parameter types simple:** `str`, `int`, `float`, `bool`, `list[str]`, `list[dict]`, `dict` are all safe.

---

## State-Passing Pattern (after_tool_callback → tool_context.state → next tool)

The LLM cannot read session state directly. It cannot "pass rows from context." The correct pattern:

1. **Tool A** (e.g. `execute_sql`) returns its result to the LLM as a string summary.
2. **`after_tool_callback`** in `agent.py` intercepts the raw result and writes it to `tool_context.state`:
   ```python
   tool_context.state["bigquery_query_result"] = result_rows
   ```
3. **Tool B** (e.g. `build_dashboard`) reads from state internally, not from LLM-supplied arguments:
   ```python
   query_result = tool_context.state.get("bigquery_query_result", [])
   ```

This means Tool B needs **no data parameter** in its signature — the LLM calls it with only lightweight hints (e.g. `chart_type_hint`).

---

## root_agent Exposure Requirement

ADK's web UI discovers agents by importing `root_agent` from the package's `__init__.py`. If `root_agent` is missing or not exported, the agent won't appear in the UI.

```python
# dashboard_agent/__init__.py
from .agent import root_agent
```

---

## .env Setup

The agent needs these variables in `.env`:

```
BQ_COMPUTE_PROJECT_ID=your-gcp-project
GOOGLE_CLOUD_PROJECT=your-gcp-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json  # or use ADC
```

Run `adk web` from the `adk-data-dude/` directory so it picks up `.env` automatically.

---

## Port Conflict Note

If `adk web` fails with "address already in use":

```bash
lsof -ti:8080 | xargs kill -9
adk web --port 8080
```

Or use a different port: `adk web --port 8081`.
