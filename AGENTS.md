---
description: 
alwaysApply: true
---

# AGENTS.md — adk-data-dude

## ADK source of truth

- Use `https://google.github.io/adk-docs/llms.txt` (or `https://adk.dev/llms.txt`) before architecture or lifecycle changes.
- Follow `agents-cli` workflow guidance for build/eval/deploy decisions.

## Local ports (fixed for this repo)

- Backend: `8081`
- Frontend: `3000`

When both repos run together:

- Keep this repo on `8081` + `3000`.
- Keep `ADK_DYNAMIC_DASHBOARD` on `8080` + `3001`.

Always run backend with explicit port:

```bash
uv run adk web --port 8081
```

## Port checks

```bash
lsof -nP -iTCP:3000 -iTCP:8081 -sTCP:LISTEN
```

## ADK implementation guardrails

- Keep LLM-facing tool signatures JSON-serializable.
- Avoid `pd.DataFrame` and complex unions in tool parameters.
- Use state handoff (`after_tool_callback -> tool_context.state -> next tool`).
- Ensure package `__init__.py` exports `root_agent`.

## Built-in tools and multi-agent routing

- Before using built-in ADK tools inside `sub_agents`, confirm current ADK docs support the exact pattern.
- Prefer documented root-level composition patterns for mixed tool orchestration.
