import { NextRequest, NextResponse } from 'next/server';
import type {
  ApiInsight,
  ResponseMeta,
  ResponseType,
  SqlStatus,
  StatusPhase,
  UiHints,
} from '@/src/types/insight';

export const runtime = 'nodejs';

type HistoryItem = { role?: string; content?: string };
type ChatRequest = { prompt?: string; history?: HistoryItem[] };
type SessionState = { appName: string; sessionId: string; updatedAt: number };
type CandidateSource = 'tool_response' | 'state_delta';
type InsightCandidate = {
  source: CandidateSource;
  payload: unknown;
};

type TitleCandidates = {
  explicit: string;
  structured: string;
};

interface AdkFunctionCall {
  name: string;
  args: unknown;
}

interface AdkFunctionResponse {
  name: string;
  response: unknown;
}

interface AdkPart {
  text?: string;
  functionCall?: AdkFunctionCall;
  functionResponse?: AdkFunctionResponse;
}

interface AdkEventContent {
  parts?: AdkPart[];
}

interface AdkActions {
  stateDelta?: Record<string, unknown>;
}

interface AdkEvent {
  content?: AdkEventContent;
  actions?: AdkActions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isAdkPart(value: unknown): value is AdkPart {
  return isRecord(value);
}

function asAdkEvent(value: unknown): AdkEvent | null {
  if (!isRecord(value)) return null;
  return value as AdkEvent;
}

const sessionsByBrowser = new Map<string, SessionState>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const BROWSER_COOKIE = 'copilot_browser_id';
const USER_ID = 'user';
const PINNED_APP_NAME = process.env.ADK_APP_NAME?.trim();

const ADK_BASE_URL = (
  process.env.ADK_API_BASE_URL ??
  process.env.NEXT_PUBLIC_ADK_API_BASE_URL ??
  'http://localhost:8081'
).replace(/\/+$/, '');

function getTextFromParts(container: unknown): string[] {
  if (!isRecord(container)) return [];
  const content = container as AdkEventContent;
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const out: string[] = [];
  for (const part of parts) {
    if (!isAdkPart(part)) continue;
    if (typeof part.text === 'string' && part.text.trim()) out.push(part.text.trim());
    if (part.functionCall && typeof part.functionCall.args === 'string' && part.functionCall.args.trim()) {
      out.push(part.functionCall.args.trim());
    }
  }
  return out;
}

function parseJsonStringMaybe(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeEvents(raw: unknown): AdkEvent[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is AdkEvent => isRecord(v));
  }
  if (isRecord(raw)) return [raw as AdkEvent];
  return [];
}

function extractAgentText(events: AdkEvent[]): string {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const texts = getTextFromParts(events[i].content);
    if (texts.length > 0) return texts.join('\n').trim();
  }
  return 'The agent responded without readable text.';
}

function extractSql(text: string): string {
  const fenced = text.match(/```sql\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const queryLike = text.match(/\bselect\b[\s\S]*?(?:;|$)/i);
  if (queryLike?.[0]) return queryLike[0].trim();
  return '';
}

function isScalar(value: unknown): boolean {
  return value == null || ['string', 'number', 'boolean'].includes(typeof value);
}

function normalizeRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (!value.every((item) => isRecord(item))) return [];
  const rows = value as Record<string, unknown>[];
  const allScalar = rows.every((row) => Object.values(row).every(isScalar));
  return allScalar ? rows : [];
}

function extractRowsFromPayload(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];

  const directRows = normalizeRows(payload.rows);
  if (directRows.length > 0) return directRows;

  const dataRows = normalizeRows(payload.data);
  if (dataRows.length > 0) return dataRows;

  const queryRows = normalizeRows(payload.query_result);
  if (queryRows.length > 0) return queryRows;

  const bqRows = normalizeRows(payload.bigquery_query_result);
  if (bqRows.length > 0) return bqRows;

  return normalizeRows(payload);
}

function extractSqlFromPayload(payload: unknown): string {
  if (!isRecord(payload)) return '';
  const value = payload.sql_query ?? payload.sql ?? payload.query ?? payload.generated_sql;
  return typeof value === 'string' ? value.trim() : '';
}

function extractColumnsFromPayload(payload: unknown): string[] {
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.columns) && payload.columns.every((c) => typeof c === 'string')) {
    return payload.columns as string[];
  }
  return [];
}

function extractCandidates(events: AdkEvent[]): InsightCandidate[] {
  const candidates: InsightCandidate[] = [];
  for (const event of events) {
    const parts = event.content?.parts ?? [];
    for (const part of parts) {
      if (!isAdkPart(part)) continue;
      const fr = part.functionResponse;
      if (fr?.response !== undefined) {
        candidates.push({
          source: 'tool_response',
          payload: parseJsonStringMaybe(fr.response),
        });
      }
    }

    const delta = event.actions?.stateDelta;
    if (!delta || typeof delta !== 'object') continue;

    const knownKeys = [
      'bigquery_query_result',
      'query_result',
      'insight',
      'insight_data',
      'dashboard_data',
      'dashboard_result',
      'result_rows',
    ];
    for (const key of knownKeys) {
      if (delta[key] !== undefined) {
        candidates.push({
          source: 'state_delta',
          payload: parseJsonStringMaybe(delta[key]),
        });
      }
    }

    const sqlKeys = ['sql_query', 'generated_sql', 'sql'];
    for (const key of sqlKeys) {
      const val = delta[key];
      if (typeof val === 'string' && val.trim()) {
        candidates.push({
          source: 'state_delta',
          payload: { sql_query: val.trim() },
        });
      }
    }
  }
  return candidates;
}

function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const idx = clean.search(/[.!?](\s|$)/);
  if (idx > 0) return clean.slice(0, idx + 1).trim();
  return clean.slice(0, 120).trim();
}

function sanitizeTitle(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  const stripped = compact
    .replace(/^here are (the )?(key )?(insights|findings)[:\s-]*/i, '')
    .replace(/^here'?s (a )?(quick )?(summary|overview)[:\s-]*/i, '')
    .replace(/^based on your question[:,\s-]*/i, '')
    .replace(/^for your question[:,\s-]*/i, '')
    .replace(/^answer[:\s-]*/i, '')
    .replace(/^insight[:\s-]*/i, '')
    .replace(/^analysis[:\s-]*/i, '')
    .trim();
  if (!stripped) return '';
  const dequoted = stripped.replace(/^["'`]+|["'`]+$/g, '').trim();
  if (!dequoted) return '';
  return dequoted.length > 80 ? `${dequoted.slice(0, 77).trim()}...` : dequoted;
}

function normalizeCompare(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPromptEcho(candidate: string, prompt: string): boolean {
  if (!candidate || !prompt) return false;
  return normalizeCompare(candidate) === normalizeCompare(prompt);
}

function deriveTitleFromRows(columns: string[], rows: Record<string, unknown>[]): string {
  const categorical = columns.find((col) => rows.some((r) => typeof r[col] === 'string'));
  const numeric = columns.find((col) => rows.some((r) => typeof r[col] === 'number'));
  if (categorical && numeric) return sanitizeTitle(`${numeric} by ${categorical}`) || 'Business insight';
  if (numeric) return sanitizeTitle(`${numeric} trend`) || 'Business insight';
  if (columns.length > 0) return sanitizeTitle(`${columns[0]} overview`) || 'Business insight';
  return 'Business insight';
}

function extractTitleCandidates(payload: unknown): TitleCandidates {
  if (!isRecord(payload)) return { explicit: '', structured: '' };
  const explicitRaw = payload.insight_title ?? payload.title;
  const structuredRaw = payload.summary_title ?? payload.headline ?? payload.card_title;
  return {
    explicit: typeof explicitRaw === 'string' ? sanitizeTitle(explicitRaw) : '',
    structured: typeof structuredRaw === 'string' ? sanitizeTitle(structuredRaw) : '',
  };
}

function chooseCanonicalTitle(args: {
  prompt: string;
  text: string;
  rows: Record<string, unknown>[];
  columns: string[];
  titleCandidates: TitleCandidates;
}): string {
  const { prompt, text, rows, columns, titleCandidates } = args;
  const fallbackTextTitle = sanitizeTitle(firstSentence(text));
  const fallbackMetricTitle = deriveTitleFromRows(columns, rows);
  const ordered = [
    titleCandidates.explicit,
    titleCandidates.structured,
    fallbackTextTitle,
    fallbackMetricTitle,
    'Business insight',
  ];
  for (const title of ordered) {
    const clean = sanitizeTitle(title);
    if (!clean) continue;
    if (isPromptEcho(clean, prompt)) continue;
    return clean;
  }
  return 'Business insight';
}

function extractNarrativeFromPayload(payload: unknown): {
  insight_summary?: string;
  key_points?: string[];
  recommended_actions?: string[];
} {
  if (!isRecord(payload)) return {};

  const summaryRaw = payload.insight_summary ?? payload.summary ?? payload.narrative ?? payload.analysis;
  const insight_summary = typeof summaryRaw === 'string' ? summaryRaw.trim() : undefined;

  const toStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const list = value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  };

  const key_points =
    toStringArray(payload.key_points) ??
    toStringArray(payload.takeaways) ??
    toStringArray(payload.findings);

  const recommended_actions =
    toStringArray(payload.recommended_actions) ??
    toStringArray(payload.next_actions) ??
    toStringArray(payload.recommendations);

  return { insight_summary, key_points, recommended_actions };
}

function isSqlRedacted(payload: unknown, sql: string): boolean {
  if (/\[redacted\]/i.test(sql)) return true;
  if (!isRecord(payload)) return false;
  if (payload.sql_redacted === true) return true;
  if (typeof payload.sql_status === 'string' && payload.sql_status.toLowerCase() === 'redacted') return true;
  return false;
}

function resolveSqlStatus(payload: unknown, payloadSql: string, fallbackSql: string): {
  sql: string;
  status: SqlStatus;
  reason: string;
} {
  if (isSqlRedacted(payload, payloadSql || fallbackSql)) {
    return {
      sql: '',
      status: 'redacted',
      reason: 'SQL was redacted by backend policy.',
    };
  }
  if (payloadSql) {
    return {
      sql: payloadSql,
      status: 'available',
      reason: 'SQL was returned directly by backend.',
    };
  }
  if (fallbackSql) {
    return {
      sql: fallbackSql,
      status: 'derived_from_text',
      reason: 'SQL was inferred from agent response text.',
    };
  }
  return {
    sql: '',
    status: 'missing_backend',
    reason: 'Backend did not provide SQL for this response.',
  };
}

const TEMPORAL_HINTS = /^(date|time|month|year|week|period|quarter|day)/i;

function inferChartType(columns: string[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'table';
  const numericCols = columns.filter((c) => rows.some((r) => typeof r[c] === 'number'));
  if (numericCols.length === 0) return 'table';
  const temporalCols = columns.filter((c) => TEMPORAL_HINTS.test(c));
  if (temporalCols.length > 0 && numericCols.length > 0) return 'line';
  if (numericCols.length >= 2 && temporalCols.length === 0) return 'scatter';
  return 'bar';
}

function inferAxes(columns: string[], rows: Record<string, unknown>[]): { x?: string; y?: string } {
  if (columns.length === 0) return {};
  const temporal = columns.find((c) => TEMPORAL_HINTS.test(c));
  const numeric = columns.find((c) => rows.some((r) => typeof r[c] === 'number'));
  const categorical = columns.find((c) => rows.some((r) => typeof r[c] === 'string'));
  return {
    x: temporal ?? categorical ?? columns[0],
    y: numeric ?? columns.find((c) => c !== (temporal ?? categorical)) ?? columns[0],
  };
}

function buildInsightFromCandidate(
  prompt: string,
  text: string,
  candidate: InsightCandidate | null,
  globalSql: string = ''
): { insight: ApiInsight | null; confidence: UiHints['confidence'] } {
  const fallbackSql = globalSql || extractSql(text);

  if (!candidate) {
    if (!fallbackSql) return { insight: null, confidence: 'low' };
    const { sql, status: sql_status, reason: sql_status_reason } = resolveSqlStatus(
      null,
      '',
      fallbackSql
    );
    const fallbackTitle = chooseCanonicalTitle({
      prompt,
      text,
      rows: [],
      columns: [],
      titleCandidates: { explicit: '', structured: '' },
    });
    return {
      insight: {
        title: fallbackTitle,
        sql_query: sql,
        sql_status,
        sql_status_reason,
        columns: [],
        rows: [],
        suggested_chart_type: 'table',
        insight_summary: text.trim() || undefined,
        visualization_mode: 'narrative',
      },
      confidence: 'low',
    };
  }

  const rows = extractRowsFromPayload(candidate.payload);
  const payloadColumns = extractColumnsFromPayload(candidate.payload);
  const columns = payloadColumns.length > 0 ? payloadColumns : Object.keys(rows[0] ?? {});
  const payloadSql = extractSqlFromPayload(candidate.payload) || globalSql;
  const { sql, status: sql_status, reason: sql_status_reason } = resolveSqlStatus(
    candidate.payload,
    payloadSql,
    fallbackSql
  );
  const titleCandidates = extractTitleCandidates(candidate.payload);
  const narrative = extractNarrativeFromPayload(candidate.payload);
  const axes = inferAxes(columns, rows);
  const confidence: UiHints['confidence'] =
    candidate.source === 'tool_response' ? 'high' : 'medium';
  const title = chooseCanonicalTitle({
    prompt,
    text,
    rows,
    columns,
    titleCandidates,
  });
  const hasNarrative = !!narrative.insight_summary || !!text.trim();
  const visualization_mode = rows.length === 0 && hasNarrative ? 'narrative' : 'chart';

  return {
    insight: {
      title,
      sql_query: sql,
      sql_status,
      sql_status_reason,
      columns,
      rows,
      suggested_chart_type: inferChartType(columns, rows),
      x_axis_key: axes.x,
      y_axis_key: axes.y,
      insight_summary: narrative.insight_summary ?? (text.trim() ? text.trim().slice(0, 500) : undefined),
      key_points: narrative.key_points,
      recommended_actions: narrative.recommended_actions,
      visualization_mode,
    },
    confidence,
  };
}

function scoreCandidate(candidate: InsightCandidate): number {
  const rows = extractRowsFromPayload(candidate.payload);
  const sql = extractSqlFromPayload(candidate.payload);
  return (rows.length > 0 ? 10 : 0) + (sql ? 2 : 0) + (candidate.source === 'tool_response' ? 3 : 1);
}

function extractSqlFromAllEvents(events: AdkEvent[]): string {
  for (const event of events) {
    const delta = event.actions?.stateDelta;
    if (delta && typeof delta === 'object') {
      for (const key of ['sql_query', 'generated_sql', 'sql']) {
        const val = delta[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
      }
    }
    for (const part of event.content?.parts ?? []) {
      if (!isAdkPart(part)) continue;
      const fc = part.functionCall;
      if (fc && (fc.name === 'execute_sql' || fc.name === 'bigquery_nl2sql')) {
        const args = fc.args;
        if (isRecord(args)) {
          const q = args.query ?? args.sql;
          if (typeof q === 'string' && q.trim()) return q.trim();
        }
      }
      const fr = part.functionResponse;
      if (fr && fr.name === 'bigquery_nl2sql') {
        const resp = fr.response;
        if (isRecord(resp)) {
          const r = resp.result ?? resp.sql ?? resp.query;
          if (typeof r === 'string' && r.trim()) return r.trim();
        }
      }
    }
  }
  return '';
}

function selectBestCandidate(candidates: InsightCandidate[]): InsightCandidate | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = scoreCandidate(best);
  for (const candidate of candidates.slice(1)) {
    const score = scoreCandidate(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function extractVegaSpec(events: AdkEvent[]): Record<string, unknown> | null {
  for (const event of events) {
    const delta = event.actions?.stateDelta;
    if (delta?.vega_lite_spec) {
      const spec = parseJsonStringMaybe(delta.vega_lite_spec);
      if (isRecord(spec)) return spec;
    }
  }
  for (const event of events) {
    const parts = event.content?.parts ?? [];
    for (const part of parts) {
      if (!isAdkPart(part)) continue;
      const fr = part.functionResponse;
      if (fr?.name === 'build_dashboard' && fr.response !== undefined) {
        const spec = parseJsonStringMaybe(fr.response);
        if (isRecord(spec)) return spec;
      }
    }
  }
  return null;
}

function phaseFromTool(toolName: string): StatusPhase {
  const lower = toolName.toLowerCase();
  if (lower.includes('sql') || lower.includes('query') || lower.includes('bigquery')) return 'querying';
  if (lower.includes('chart') || lower.includes('dashboard') || lower.includes('visual')) return 'visualizing';
  return 'thinking';
}

function extractPhaseTrace(events: AdkEvent[]): StatusPhase[] {
  const phases: StatusPhase[] = [];
  const pushUnique = (phase: StatusPhase) => {
    if (phases[phases.length - 1] !== phase) phases.push(phase);
  };

  pushUnique('thinking');
  for (const event of events) {
    const parts = event.content?.parts ?? [];
    for (const part of parts) {
      if (!isAdkPart(part)) continue;
      if (part.functionCall?.name) pushUnique(phaseFromTool(part.functionCall.name));
    }
  }
  pushUnique('finalizing');
  return phases;
}

function buildUiHints(
  responseType: ResponseType,
  confidence: UiHints['confidence'],
  narrativeSqlValidated = false
): UiHints {
  return {
    auto_open_insight: responseType === 'insight_ready' && confidence !== 'low',
    pin_allowed: responseType === 'insight_ready',
    confidence,
    narrative_sql_validated: narrativeSqlValidated,
  };
}

async function parseAdkResponse(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    const dataLines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    const parsed = dataLines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    // Return ALL events so extractCandidates can find tool responses + state deltas
    // from intermediate events (e.g. build_dashboard's vega spec).
    return parsed.length > 0 ? parsed : [{}];
  }
  const text = await res.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
}

async function adkFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${ADK_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream, text/plain, */*',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}

async function getDefaultAppName(): Promise<string> {
  if (PINNED_APP_NAME) return PINNED_APP_NAME;
  const listRes = await adkFetch('/list-apps', { method: 'GET' });
  if (!listRes.ok) return 'dashboard_agent';
  const payload = await parseAdkResponse(listRes);
  if (Array.isArray(payload)) {
    const names = payload.filter((v): v is string => typeof v === 'string');
    if (names.includes('dashboard_agent')) return 'dashboard_agent';
    if (names.length > 0) return names[0];
  }
  return 'dashboard_agent';
}

function extractSessionId(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (!isRecord(data)) return null;
  for (const key of ['id', 'session_id', 'sessionId']) {
    const val = data[key];
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (typeof val === 'number') return String(val);
  }
  return null;
}

function evictStaleSessions(): void {
  const now = Date.now();
  for (const [key, state] of sessionsByBrowser) {
    if (now - state.updatedAt > SESSION_TTL_MS) {
      sessionsByBrowser.delete(key);
    }
  }
}

async function createSession(appName: string): Promise<string> {
  const sessionRes = await adkFetch(`/apps/${appName}/users/${USER_ID}/sessions`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!sessionRes.ok) {
    const detail = await sessionRes.text();
    throw new Error(`Failed to create ADK session: ${detail || sessionRes.status}`);
  }
  const data = await parseAdkResponse(sessionRes);
  const sessionId = extractSessionId(data);
  if (!sessionId) {
    throw new Error(
      `ADK session response missing "id". Got: ${JSON.stringify(data).slice(0, 200)}`
    );
  }
  return sessionId;
}

async function getOrCreateSession(browserId: string): Promise<SessionState> {
  evictStaleSessions();
  const cached = sessionsByBrowser.get(browserId);
  if (cached) {
    cached.updatedAt = Date.now();
    return cached;
  }
  const appName = await getDefaultAppName();
  const sessionId = await createSession(appName);
  const state: SessionState = { appName, sessionId, updatedAt: Date.now() };
  sessionsByBrowser.set(browserId, state);
  return state;
}

export async function POST(request: NextRequest) {
  let createdBrowserId: string | null = null;
  const requestId = crypto.randomUUID();
  const start = Date.now();
  try {
    const body = (await request.json()) as ChatRequest;
    const prompt = (body.prompt ?? '').trim();
    if (!prompt) {
      return NextResponse.json(
        {
          status: 'error',
          response_type: 'error',
          error: 'Prompt is required.',
          status_phase: 'finalizing',
          phase_trace: ['thinking', 'finalizing'],
          ui_hints: {
            auto_open_insight: false,
            pin_allowed: false,
            confidence: 'low',
          },
          meta: {
            request_id: requestId,
            elapsed_ms: Date.now() - start,
            app_name: PINNED_APP_NAME ?? 'dashboard_agent',
            session_id: '',
          },
        },
        { status: 400 }
      );
    }

    let browserId = request.cookies.get(BROWSER_COOKIE)?.value;
    if (!browserId) {
      browserId = crypto.randomUUID();
      createdBrowserId = browserId;
    }

    let session: SessionState;
    try {
      session = await getOrCreateSession(browserId);
    } catch (sessionErr) {
      sessionsByBrowser.delete(browserId);
      console.error('Session creation failed:', sessionErr);
      const errMsg = sessionErr instanceof Error ? sessionErr.message : 'Backend unavailable';
      return NextResponse.json(
        {
          status: 'error',
          response_type: 'error',
          error: errMsg,
          status_phase: 'finalizing',
          phase_trace: ['thinking', 'finalizing'],
          ui_hints: { auto_open_insight: false, pin_allowed: false, confidence: 'low' as const },
          meta: {
            request_id: requestId,
            elapsed_ms: Date.now() - start,
            app_name: PINNED_APP_NAME ?? 'dashboard_agent',
            session_id: '',
          },
        },
        { status: 503 }
      );
    }

    const payload = {
      appName: session.appName,
      userId: USER_ID,
      sessionId: session.sessionId,
      newMessage: {
        role: 'user',
        parts: [{ text: prompt }],
      },
      // Keep false for simpler response handling in this compatibility route.
      streaming: false,
      stateDelta: null,
      history: body.history ?? [],
    };

    const runRes = await adkFetch('/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!runRes.ok) {
      const detail = await runRes.text();
      throw new Error(detail || `ADK request failed (${runRes.status})`);
    }

    const adkPayload = await parseAdkResponse(runRes);
    const events = normalizeEvents(adkPayload);
    const phaseTrace = extractPhaseTrace(events);
    const agentMessage = extractAgentText(events);
    const globalSql = extractSqlFromAllEvents(events);
    const bestCandidate = selectBestCandidate(extractCandidates(events));
    const { insight, confidence } = buildInsightFromCandidate(prompt, agentMessage, bestCandidate, globalSql);
    // Attach vega spec from build_dashboard if present
    if (insight) {
      const vegaSpec = extractVegaSpec(events);
      if (vegaSpec) insight.vega_spec = vegaSpec;
    }
    const hasNarrative = !!insight?.insight_summary || (insight?.key_points?.length ?? 0) > 0;
    const hasChartCapableData = (insight?.rows.length ?? 0) > 0 && (insight?.columns.length ?? 0) > 0;
    const hasValidatedSql =
      insight?.sql_status === 'available' || insight?.sql_status === 'derived_from_text';
    const narrativeSqlValidated = !hasChartCapableData && hasNarrative && hasValidatedSql;
    const responseType: ResponseType =
      !insight
        ? 'message_only'
        : hasChartCapableData || narrativeSqlValidated
          ? 'insight_ready'
          : 'insight_partial';
    const uiHints = buildUiHints(responseType, confidence, narrativeSqlValidated);
    const meta: ResponseMeta = {
      request_id: requestId,
      elapsed_ms: Date.now() - start,
      app_name: session.appName,
      session_id: session.sessionId,
    };

    const response = NextResponse.json({
      status: 'success',
      response_type: responseType,
      agent_message: agentMessage,
      insight,
      status_phase: phaseTrace[phaseTrace.length - 1] ?? 'finalizing',
      phase_trace: phaseTrace,
      ui_hints: uiHints,
      meta,
    });
    if (createdBrowserId) {
      response.cookies.set(BROWSER_COOKIE, createdBrowserId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return response;
  } catch (err) {
    console.error('POST /api/chat error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const response = NextResponse.json(
      {
        status: 'error',
        response_type: 'error',
        error: message,
        status_phase: 'finalizing',
        phase_trace: ['thinking', 'finalizing'],
        ui_hints: {
          auto_open_insight: false,
          pin_allowed: false,
          confidence: 'low',
        },
        meta: {
          request_id: requestId,
          elapsed_ms: Date.now() - start,
          app_name: PINNED_APP_NAME ?? 'dashboard_agent',
          session_id: '',
        },
      },
      { status: 500 }
    );
    if (createdBrowserId) {
      response.cookies.set(BROWSER_COOKIE, createdBrowserId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return response;
  }
}
