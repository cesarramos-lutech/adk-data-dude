# Refactor PRD — GCP Data Agents Playground

**Document version:** 1.0
**Date:** 2026-03-06
**Author:** Claude Code (UAT + code review)
**Audience:** External contractor

---

## 1. Executive Summary

This document describes a targeted refactor of the `gcp-data-agents/playground` codebase — a Google ADK backend paired with a Next.js 15 frontend that lets users query BigQuery via natural language and visualise results as interactive Vega-Lite charts on a drag-and-drop dashboard. UAT (code review + live browser test at `localhost:3000`) revealed one blocking 500 error that prevents end-to-end usage, five high-severity functional gaps, six medium code-quality issues, and four low-priority cleanup items. This PRD specifies 12 refactoring tasks that must be completed before the product is production-ready.

---

## 2. Context & Problem Statement

### 2.1 Stack

| Layer | Technology |
|---|---|
| Agent backend | Google Agent Development Kit (`adk web`), Python 3.11, Gemini 2.5 Pro via Vertex AI |
| Data | BigQuery (read-only via `BigQueryToolset` with `WriteMode.BLOCKED`) |
| Charting | Altair / Vega-Lite (backend spec), vega-embed v6 (frontend render), Recharts (fallback) |
| Frontend | Next.js 15, Zustand, Tailwind CSS, react-grid-layout v2 |
| Run | `adk web` on `:8081`; `npm run dev` on `:3000` |

### 2.2 UAT methodology

- **Code review:** All source files under `playground/` read and analysed for correctness, type safety, ADK contract compliance, and dead code.
- **Live browser test:** Application loaded at `http://localhost:3000`. A sample natural-language query was submitted. The browser console and network tab were inspected.
- **Tools tested:** `bigquery_nl2sql`, `execute_sql` (ADK built-in), `build_dashboard`, `get_recommendations`.

### 2.3 Current state

The live browser test produced an immediate **500 error** from `POST /api/chat`, blocking any end-to-end query. Code review uncovered the root cause (session creation failure — see F-001) plus 14 additional issues across reliability, type safety, and code hygiene.

---

## 3. UAT Findings

Severity levels: **CRITICAL** → **HIGH** → **MEDIUM** → **LOW**

---

### CRITICAL — Blocking

#### F-001 · `/api/chat` returns 500 — E2E pipeline blocked

**Files:** `frontend/app/api/chat/route.ts:592–603`
**Observed:** Browser console shows `POST /api/chat 500` immediately on first query. UI enters "Retry" state.
**Root cause:** `createSession` calls `GET /list-apps` and then `POST /apps/{appName}/users/user/sessions`. When ADK is running on `:8081` but the session POST response body does not contain `"id"` (e.g. ADK returned a different shape), `route.ts:602` throws `'ADK session response missing "id".'` — this propagates as an uncaught server error.

Additionally, `sessionsByBrowser` is a module-level `Map` that is **never evicted**. In production (serverless) this state is lost on cold start, causing every cold-start request to attempt a fresh session create. If ADK returns a 4xx at that point (e.g. app not yet loaded), the entire route throws and returns 500.

```ts
// route.ts:601-602 — throws if ADK response shape differs
const data = (await parseAdkResponse(sessionRes)) as { id?: string };
if (!data.id) throw new Error('ADK session response missing "id".');
```

**Impact:** All users are blocked. No query can reach the agent.

---

### HIGH — Functional

#### F-002 · `after_tool_callback` silently swallows SQL failures

**Files:** `dashboard_agent/agent.py:48–51`
**Issue:** The callback only writes to state when `status == "SUCCESS"`. On a BigQuery error, state key `"bigquery_query_result"` is never set (or keeps its previous value). `build_dashboard` then reads an empty list (or stale data) and either renders an empty spec or a misleading chart from a prior query.

```python
# agent.py:49–51 — no handling for status != "SUCCESS"
if tool_response.get("status") == "SUCCESS":
    tool_context.state["bigquery_query_result"] = tool_response.get("rows", [])
```

There is no error propagation: the LLM receives no signal that SQL execution failed, and the agent may call `build_dashboard` anyway.

#### F-003 · `get_recommendations` returns raw Gemini text without JSON validation

**Files:** `dashboard_agent/tools/recommend.py:65–70`
**Issue:** The tool instructs Gemini to return only JSON, but returns `response.text.strip()` directly with no `json.loads()` validation. When Gemini wraps output in markdown fences (```json ... ```) or returns a partial response, the frontend receives a string that fails `JSON.parse()` inside `extractNarrativeFromPayload`, causing an unhandled exception in the API route.

```python
# recommend.py:70 — no JSON validation before return
return (response.text or "").strip()
```

#### F-004 · `build_dashboard` dtype detection misses `datetime64[ns, UTC]` and similar

**Files:** `dashboard_agent/tools/chart.py:125`
**Issue:** Temporal axis type is detected via `"date" in str(df[x_col].dtype).lower()`. This matches `"date"` but misses common pandas temporal dtypes such as `datetime64[ns, UTC]`, `datetime64[us]`, `timedelta64`, and BigQuery `TIMESTAMP` columns (which Pandas typically reads as `datetime64[ns]` — dtype string is `"datetime64[ns]"`, which does NOT contain the substring `"date"`).

```python
# chart.py:125 — fragile string match
x_type = "temporal" if "date" in str(df[x_col].dtype).lower() and x_col in df.columns else "quantitative"
```

Time-series queries will render with a `quantitative` (numeric) x-axis instead of a `temporal` one, breaking date formatting and tick spacing.

#### F-005 · `inferChartType` in `route.ts` always returns `'bar'` — line/scatter never chosen

**Files:** `frontend/app/api/chat/route.ts:350–355`
**Issue:** The function returns `'table'` when no numeric columns exist, and `'bar'` otherwise. It never infers `'line'` or `'scatter'`, so `suggested_chart_type` is always `'bar'` for any data that has numerics — ignoring temporal columns (line) or dual-numeric data (scatter).

```ts
// route.ts:350–355
function inferChartType(columns: string[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'table';
  const numericCols = columns.filter((col) => rows.some((r) => typeof r[col] === 'number'));
  if (numericCols.length === 0) return 'table';
  return 'bar';   // ← line/scatter never returned
}
```

The `suggested_chart_type` field feeds the Recharts fallback path, so fallback charts for time-series data render as bar charts.

#### F-006 · Unguarded `columns[0]` / `columns[1]` array access in chart fallback paths

**Files:**
- `frontend/src/components/copilot/InsightChart.tsx:64–65`
- `frontend/src/components/dashboard/ChartPanel.tsx:39–40`
**Issue:** Both fallback Recharts paths access `insight.columns[0]` and `insight.columns[1]` without checking array length. When `columns` is empty (e.g. `insight_partial` response), this produces `undefined` keys. `String(r[undefined] ?? '')` evaluates silently but `Number(r[undefined])` returns `NaN`, producing an invisible chart with no data points.

```tsx
// InsightChart.tsx:64–65 — no bounds check
const xKey = x_axis_key || insight.columns[0];
const yKey = y_axis_key || insight.columns[1] || insight.columns[0];
```

---

### MEDIUM — Code Quality

#### F-007 · Pervasive unsafe `as Record<string, unknown>` casts in `route.ts`

**Files:** `frontend/app/api/chat/route.ts` — approximately 18 instances
**Issue:** Almost every object extracted from ADK events is cast with `as Record<string, unknown>` after a `typeof === 'object'` check, but never narrowed further. This defeats TypeScript's type safety: accessing `.rows`, `.parts`, `.functionResponse`, etc. on these casts is unchecked. A shape change in the ADK response format will produce silent `undefined` values rather than compile-time errors.

Representative examples: lines 40–46, 106–120, 142–147, 160–177, 471–475.

#### F-008 · Silent `catch {}` blocks discard all errors

**Files:**
- `frontend/src/components/dashboard/DashboardGrid.tsx:17–19` (`loadLayout`)
- `frontend/src/components/dashboard/DashboardGrid.tsx:24–27` (`saveLayout`)
- `frontend/src/store/copilotStore.ts:88–91` (`loadPinned`)
- `frontend/src/store/copilotStore.ts:96–99` (`savePinned`)

```ts
// DashboardGrid.tsx:17–19 — error silently swallowed
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
} catch {
  return {};
}
```

A `localStorage` quota error, a malformed persisted spec, or a SecurityError in a sandboxed iframe is silently ignored. The user sees stale/missing data with no feedback.

#### F-009 · `vega-embed` cleanup race condition — `finalize` may be `undefined` on unmount

**Files:**
- `frontend/src/components/copilot/InsightChart.tsx:27–44`
- `frontend/src/components/dashboard/ChartPanel.tsx:13–31`

```ts
// InsightChart.tsx:27–44
let finalize: (() => void) | undefined;
import('vega-embed').then(({ default: embed }) => {
  embed(container, spec, options)
    .then((result) => { finalize = () => result.finalize(); })
    .catch(console.error);
});
return () => finalize?.();   // ← may run before .then() resolves
```

The cleanup function runs synchronously when React unmounts the component. If the component unmounts before `embed().then()` resolves (rapid navigation, Strict Mode double-invoke), `finalize` is still `undefined`, the Vega view is never finalised, and its canvas/workers are leaked. Under React Strict Mode (default in Next.js dev) this is nearly guaranteed to trigger.

#### F-010 · Chart height inconsistency between copilot panel and dashboard panel

**Files:**
- `frontend/src/components/copilot/InsightChart.tsx:29, 53` — `height: 320` (hardcoded), `minHeight: 340`
- `frontend/src/components/dashboard/ChartPanel.tsx:16` — `height: 'container'`

`InsightChart` passes `height: 320` to vega-embed, while `ChartPanel` passes `height: 'container'`. The copilot panel is clipped at 320 px regardless of available space. The dashboard panel may render with zero height if the grid row height is not computed before embed. There is no shared constant for this value.

#### F-011 · Inconsistent env var naming between tools

**Files:**
- `dashboard_agent/tools/bigquery.py:95` — uses `BASELINE_NL2SQL_MODEL`
- `dashboard_agent/tools/recommend.py:47` — uses `ROOT_AGENT_MODEL`
- `dashboard_agent/agent.py:64` — uses `ROOT_AGENT_MODEL`

`bigquery_nl2sql` reads its model from `BASELINE_NL2SQL_MODEL` while all other agent components read from `ROOT_AGENT_MODEL`. There is no documentation that two different env vars control potentially two different models. Operators setting only `ROOT_AGENT_MODEL` will get the hardcoded `"gemini-2.5-pro"` default for NL2SQL but a custom model for the agent and recommendations, leading to unexpected inconsistency.

#### F-012 · `get_recommendations` breaks the state-passing pattern

**Files:** `dashboard_agent/tools/recommend.py:35–38`
**Issue:** `get_recommendations` accepts `query_result_summary: str` as an LLM-supplied parameter, meaning the LLM must summarize the query result and pass it as a string argument. This contradicts the ADK state-passing pattern documented in `CLAUDE.md` and used by `build_dashboard`: tools that depend on prior tool output should read from `tool_context.state`, not accept LLM-synthesized parameters.

The current design means: (a) the LLM must faithfully summarize potentially large result sets, (b) the summary is unconstrained in length, and (c) the tool cannot verify that the summary corresponds to the actual query result.

---

### LOW — Cleanup

#### F-013 · Dead code: unused frontend files and `_archive/` directory

**Unused files (confirmed — no import found in active source tree):**
- `frontend/src/context/StoryContext.tsx`
- `frontend/src/components/DialogBox.tsx`
- `frontend/src/services/clientService.tsx`
- `frontend/src/components/copilot/BoardCard.tsx`
- `frontend/src/components/copilot/MiniCard.tsx`

**Entire directory:**
- `frontend/_archive/vite-mui-original/` — 19 files from the original Vite + MUI prototype, no longer referenced from anywhere in the Next.js tree.

These files add noise during code review and increase the risk of accidentally importing stale logic.

#### F-014 · Hardcoded non-configurable limits

| Location | Hardcoded value | Issue |
|---|---|---|
| `bigquery.py:13` | `MAX_NUM_ROWS = 10000` | Not exposed as env var; cannot tune for large/small datasets |
| `chart.py:78` | `df.head(500)` | Silent truncation with no warning in tool return value |
| `chart.py:174` | `spec["height"] = 320` | Duplicates `InsightChart.tsx` hardcode; creates two sources of truth |

#### F-015 · `ToolContext | None` union type in `build_dashboard` violates CLAUDE.md rules

**Files:** `dashboard_agent/tools/chart.py:57`

```python
def build_dashboard(
    chart_type_hint: str = "auto",
    tool_context: ToolContext | None = None,   # ← Union type
) -> str:
```

`CLAUDE.md` explicitly states: "No complex Union types in tool parameters. ADK introspects function signatures to generate a JSON schema for the LLM. Types it cannot serialize will silently break tool calling." The `ToolContext | None` union is a special ADK injection type; while ADK handles it internally, a `None` fallback at line 69 means a misconfigured call silently reads no data and returns an empty chart spec — masking the underlying wiring issue.

---

## 4. Refactoring Specifications

### R-001 · Fix session creation robustness (resolves F-001)

**Priority:** CRITICAL
**Files:** `frontend/app/api/chat/route.ts:592–617`

**Description:**
1. Add a fallback for when the ADK session response does not contain `"id"` — inspect the full response shape and try alternative keys (`session_id`, numeric `id`, top-level string) before throwing.
2. Add session TTL eviction from `sessionsByBrowser` (e.g. evict sessions older than 30 minutes on each request to avoid stale session IDs being reused after ADK restarts).
3. Wrap `getOrCreateSession` errors gracefully: log the error and return a structured `{ status: 'error', error: '...' }` JSON with HTTP 503 instead of 500, so the frontend can show a user-friendly "Backend unavailable" message rather than a generic retry.

**Acceptance criteria:**
- `POST /api/chat` with ADK running on `:8081` returns `{ status: 'success' }` for a valid prompt.
- `POST /api/chat` with ADK not running returns `{ status: 'error', error: 'Backend unavailable' }` with HTTP 503 (not 500).
- Cold-start requests (no cached session) succeed without 500.

---

### R-002 · Propagate SQL execution errors through the agent (resolves F-002)

**Priority:** HIGH
**Files:** `dashboard_agent/agent.py:37–51`

**Description:**
In `store_results_in_context`, handle the `status != "SUCCESS"` branch:
1. Write a structured error marker to state: `tool_context.state["bigquery_query_error"] = tool_response.get("error", "Unknown SQL error")`.
2. Clear any stale `bigquery_query_result` from state so `build_dashboard` does not use rows from a previous query: `tool_context.state["bigquery_query_result"] = []`.
3. Return the error marker as a dict so the LLM receives it: `return {"status": "error", "error": tool_context.state["bigquery_query_error"]}`.

Update `dashboard_agent/prompts.py` to instruct the agent: "If execute_sql returns an error status, report the error to the user and do not call build_dashboard."

**Acceptance criteria:**
- A deliberately malformed SQL query causes the agent to return an error message, not an empty chart.
- `build_dashboard` is not called when `execute_sql` fails.
- Stale rows from a prior successful query are not used after a subsequent failure.

---

### R-003 · Validate and sanitise `get_recommendations` JSON output (resolves F-003)

**Priority:** HIGH
**Files:** `dashboard_agent/tools/recommend.py:65–70`

**Description:**
1. After calling `client.models.generate_content`, strip markdown fences from the response text (same pattern as `bigquery_nl2sql:123`).
2. Attempt `json.loads()` on the cleaned text. On failure, fall back to a default structured response:
   ```python
   {
     "insight_summary": response_text,
     "key_points": [],
     "recommended_actions": []
   }
   ```
3. Validate that the parsed object has the required keys before returning; fill missing keys with empty defaults.
4. Return `json.dumps(validated_obj)` so the caller always receives valid JSON.

**Acceptance criteria:**
- Tool returns valid JSON regardless of whether Gemini wraps output in markdown fences.
- Frontend `extractNarrativeFromPayload` successfully parses the result.
- A Gemini API timeout returns the fallback object, not an exception.

---

### R-004 · Fix temporal dtype detection in `build_dashboard` (resolves F-004)

**Priority:** HIGH
**Files:** `dashboard_agent/tools/chart.py:125`

**Description:**
Replace the fragile string match with `pd.api.types.is_datetime64_any_dtype()`:

```python
# Replace:
x_type = "temporal" if "date" in str(df[x_col].dtype).lower() and x_col in df.columns else "quantitative"

# With:
import pandas as pd
x_type = "temporal" if (x_col in df.columns and pd.api.types.is_datetime64_any_dtype(df[x_col])) else "quantitative"
```

**Acceptance criteria:**
- A BigQuery query returning a `TIMESTAMP` column produces a Vega-Lite spec with `"type": "temporal"` for that axis.
- A query returning an integer `year` column produces `"type": "quantitative"`.
- Existing bar/scatter chart tests are unaffected.

---

### R-005 · Improve `inferChartType` to detect line and scatter (resolves F-005)

**Priority:** HIGH
**Files:** `frontend/app/api/chat/route.ts:350–355`

**Description:**
Extend `inferChartType` to inspect column names and types:
1. If any column name matches a temporal heuristic (`date`, `time`, `month`, `year`, `week`, `period`, `quarter`) and there is at least one numeric column → return `'line'`.
2. If there are two or more numeric columns and no temporal columns → return `'scatter'`.
3. Otherwise → return `'bar'` (existing behaviour).

Also update `inferAxes` to set `x` to the temporal column when chart type is `line`.

**Acceptance criteria:**
- A query result with columns `['month', 'revenue']` produces `suggested_chart_type: 'line'`.
- A query result with columns `['price', 'volume']` (both numeric) produces `suggested_chart_type: 'scatter'`.
- A query result with columns `['region', 'sales']` produces `suggested_chart_type: 'bar'` (unchanged).

---

### R-006 · Add null/bounds guards in chart fallback paths (resolves F-006)

**Priority:** HIGH
**Files:**
- `frontend/src/components/copilot/InsightChart.tsx:57–70`
- `frontend/src/components/dashboard/ChartPanel.tsx:39–44`

**Description:**
1. Before accessing `columns[0]` or `columns[1]`, check `columns.length`.
2. If columns are empty and no `x_axis_key`/`y_axis_key`, render `<p>No chart data.</p>` instead of proceeding.
3. In `InsightChart`, the `Number(r[yKey]) ?? 0` expression is incorrect: `Number(undefined)` returns `NaN`, and `NaN ?? 0` is `NaN` (nullish coalescing does not catch NaN). Replace with `Number(r[yKey]) || 0`.

**Acceptance criteria:**
- An `ApiInsight` with empty `columns: []` renders the fallback "No data" message in both components.
- No runtime warning about `undefined` keys in `BarChart`.

---

### R-007 · Replace `as Record<string, unknown>` casts with typed ADK response interfaces (resolves F-007)

**Priority:** MEDIUM
**Files:** `frontend/app/api/chat/route.ts`

**Description:**
1. Define TypeScript interfaces for the expected ADK event shapes:
   ```ts
   interface AdkEventContent { parts: AdkPart[] }
   interface AdkPart { text?: string; functionCall?: { name: string; args: unknown }; functionResponse?: { name: string; response: unknown } }
   interface AdkEvent { content?: AdkEventContent; actions?: { stateDelta?: Record<string, unknown> } }
   ```
2. Replace `as Record<string, unknown>` casts in `extractCandidates`, `extractVegaSpec`, `extractAgentText`, `extractPhaseTrace`, and `getTextFromParts` with typed narrowing against these interfaces.
3. Use discriminated union or `satisfies` where appropriate to keep narrowing safe at compile time.

**Acceptance criteria:**
- TypeScript compilation passes with `strict: true` and zero `as Record<string, unknown>` casts in the listed functions.
- Accessing `.parts`, `.functionResponse`, `.stateDelta` is type-checked.

---

### R-008 · Surface `localStorage` errors to the user (resolves F-008)

**Priority:** MEDIUM
**Files:**
- `frontend/src/components/dashboard/DashboardGrid.tsx:12–27`
- `frontend/src/store/copilotStore.ts:82–99`

**Description:**
1. In `saveLayout` and `savePinned`, catch the `QuotaExceededError` specifically and call a toast/notification mechanism (the project has `GlobalToast.tsx`). Log other errors to `console.error` at minimum.
2. In `loadLayout` and `loadPinned`, if `JSON.parse` fails, log `console.error` with the raw string for debuggability before returning the default. Do not silently return `{}` / `[]`.

**Acceptance criteria:**
- Filling `localStorage` to quota causes a visible toast to the user.
- A corrupted layout key logs the raw string to console and returns the default — confirmed via unit test or manual test.

---

### R-009 · Fix vega-embed cleanup race condition (resolves F-009)

**Priority:** MEDIUM
**Files:**
- `frontend/src/components/copilot/InsightChart.tsx:23–45`
- `frontend/src/components/dashboard/ChartPanel.tsx:10–32`

**Description:**
Use a cancellation flag to handle unmount-before-resolve:

```ts
useEffect(() => {
  if (!vega_spec || !vegaRef.current) return;
  let cancelled = false;
  let finalizeView: (() => void) | undefined;

  import('vega-embed').then(({ default: embed }) => {
    if (cancelled || !vegaRef.current) return;
    embed(vegaRef.current, spec, options)
      .then((result) => {
        if (cancelled) { result.finalize(); return; }
        finalizeView = () => result.finalize();
      })
      .catch((err) => console.error('vega-embed error:', err));
  });

  return () => {
    cancelled = true;
    finalizeView?.();
  };
}, [vega_spec]);
```

Extract to a shared `useVegaEmbed` hook to avoid duplicating this logic in both components.

**Acceptance criteria:**
- Under React Strict Mode (double-invoke), no "Cannot read property of undefined" error on unmount.
- Memory leak test: mount/unmount `InsightChart` 10 times; browser memory does not grow unboundedly.
- Both `InsightChart` and `ChartPanel` use the shared hook.

---

### R-010 · Standardise chart height and extract shared constant (resolves F-010)

**Priority:** MEDIUM
**Files:**
- `dashboard_agent/tools/chart.py:174`
- `frontend/src/components/copilot/InsightChart.tsx:29, 53`
- `frontend/src/components/dashboard/ChartPanel.tsx:16`

**Description:**
1. Create a shared frontend constant: `frontend/src/lib/chartConstants.ts` → `export const COPILOT_CHART_HEIGHT = 320`.
2. `InsightChart` uses `COPILOT_CHART_HEIGHT` for both vega-embed `height` and the container `minHeight`.
3. `ChartPanel` should use `height: 'container'` for vega-embed (dashboard panels are resizable) but add a `minHeight` guard of `120` to prevent zero-height renders.
4. Document in the constant file that the backend (`chart.py:174`) hardcodes `320` to match the copilot panel default.

**Acceptance criteria:**
- Changing `COPILOT_CHART_HEIGHT` in one place updates the copilot panel render.
- Dashboard panel never renders with zero height.
- Both components compile without referencing literal `320` for chart height.

---

### R-011 · Unify env var naming for model selection (resolves F-011)

**Priority:** MEDIUM
**Files:**
- `dashboard_agent/tools/bigquery.py:95`
- `dashboard_agent/tools/recommend.py:47`
- `.env.example` (create if missing)

**Description:**
1. Rename `BASELINE_NL2SQL_MODEL` to `ROOT_AGENT_MODEL` in `bigquery.py` so all three tool files use the same variable.
2. If different models for NL2SQL and recommendations are desired, document this explicitly with two distinct vars (`NL2SQL_MODEL`, `RECOMMENDATIONS_MODEL`) and update all three files.
   **Recommendation:** Use a single `ROOT_AGENT_MODEL` for all three; introduce specialised vars only if the product owner explicitly requests model separation.
3. Add (or update) `.env.example` documenting all required and optional env vars.

**Acceptance criteria:**
- Setting only `ROOT_AGENT_MODEL=gemini-2.0-flash` causes all three tools to use that model.
- `.env.example` lists every env var referenced in the codebase with a one-line description.

---

### R-012 · Remove dead code and archive directory (resolves F-013, F-015 partial)

**Priority:** LOW
**Files to delete:**
- `frontend/src/context/StoryContext.tsx`
- `frontend/src/components/DialogBox.tsx`
- `frontend/src/services/clientService.tsx`
- `frontend/src/components/copilot/BoardCard.tsx`
- `frontend/src/components/copilot/MiniCard.tsx`
- `frontend/_archive/` (entire directory)

**Additional cleanup:**
- In `dashboard_agent/tools/chart.py:57`, remove the `| None` from `tool_context: ToolContext | None` and remove the `if tool_context else []` guard at line 69. The `None` fallback masks misconfigured wiring; the tool should fail fast if context is missing. (ADK injects `ToolContext` automatically; `None` is only possible in unit tests — address that in test fixtures instead.)

**Acceptance criteria:**
- `npm run build` passes with zero TypeScript errors after deletion.
- No existing component imports the deleted files (verify with `grep -r "StoryContext\|DialogBox\|clientService\|BoardCard\|MiniCard" frontend/src/`).
- `build_dashboard` still works correctly when called through ADK (context is always injected).

---

## 5. Key Files Reference

| File | Issues addressed |
|---|---|
| `dashboard_agent/agent.py` | F-002 (R-002) |
| `dashboard_agent/tools/chart.py` | F-004 (R-004), F-014 (R-010), F-015 (R-012) |
| `dashboard_agent/tools/recommend.py` | F-003 (R-003), F-011 (R-011), F-012 |
| `dashboard_agent/tools/bigquery.py` | F-011 (R-011) |
| `dashboard_agent/prompts.py` | R-002 (prompt update) |
| `frontend/app/api/chat/route.ts` | F-001 (R-001), F-005 (R-005), F-007 (R-007) |
| `frontend/src/components/copilot/InsightChart.tsx` | F-006 (R-006), F-009 (R-009), F-010 (R-010) |
| `frontend/src/components/dashboard/ChartPanel.tsx` | F-006 (R-006), F-009 (R-009), F-010 (R-010) |
| `frontend/src/components/dashboard/DashboardGrid.tsx` | F-008 (R-008) |
| `frontend/src/store/copilotStore.ts` | F-008 (R-008) |

---

## 6. Verification Protocol

After completing all tasks, run the following E2E tests against a live environment (`adk web` on `:8081`, `npm run dev` on `:3000`, BigQuery accessible).

### 6.1 Sample prompts (happy path)

| # | Prompt | Expected result |
|---|---|---|
| P-01 | "Show me total sales by region for the last quarter" | Chart renders (bar or line), SQL visible, no 500 error |
| P-02 | "What were the top 10 products by revenue last month?" | Bar chart with 10 bars, `columns` and `rows` populated, "Add to Dashboard" enabled |
| P-03 | "Show monthly revenue trend for 2024" | Line chart (temporal x-axis), x-axis labels are dates not integers |
| P-04 | "Give me recommendations based on the current data" | Narrative panel with `insight_summary`, `key_points`, `recommended_actions` all populated |

### 6.2 Edge cases

| # | Scenario | Expected result |
|---|---|---|
| E-01 | Submit a query that references a non-existent table | Agent returns error message; `build_dashboard` is NOT called; no empty chart |
| E-02 | Pin an insight, refresh the page | Dashboard panel re-hydrates from `localStorage`; no console errors |

### 6.3 Regression checks

- `adk web` not running → `/api/chat` returns HTTP 503 with `{ status: 'error', error: 'Backend unavailable' }` (not 500).
- Empty prompt submitted → HTTP 400 with `{ status: 'error', error: 'Prompt is required.' }`.
- Rapid mount/unmount of `InsightChart` (e.g. quickly switch tabs) → no "Cannot read" console errors.

---

## 7. Out of Scope

The following are **not** part of this refactor contract:

- Adding new agent tools or BigQuery datasets.
- Changing the Vega-Lite chart aesthetic (colours, fonts, themes).
- Authentication / multi-user session management.
- Deployment to Google Cloud Run or any production environment.
- Performance optimisation of BigQuery queries.
- Adding automated unit tests (tests are mentioned in acceptance criteria as verification guidance only; the contractor is not required to write a test suite unless explicitly agreed).
- React Server Components migration or Next.js 15 App Router refactoring beyond what is needed to fix F-001.
