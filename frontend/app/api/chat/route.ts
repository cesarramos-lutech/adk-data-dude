import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ApiInsight,
  ChartMeta,
  QueryAudit,
  QueryErrorCategory,
  ResponseMeta,
  ResponseType,
  SqlStatus,
  StatusPhase,
  UiHints,
} from '@/src/types/insight';

export const runtime = 'nodejs';

type HistoryItem = { role?: string; content?: string };
type ChatRequest = { prompt?: string; history?: HistoryItem[] };
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

import {
  sessionsByBrowser,
  SESSION_TTL_MS,
  BROWSER_COOKIE,
  USER_ID,
  PINNED_APP_NAME,
  ADK_BASE_URL,
  adkFetch as sharedAdkFetch,
} from './_shared';
import type { SessionState } from './_shared';

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

function stripLeakedJson(text: string): string {
  let result = text;
  const jsonStarts: number[] = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i] === '{' && (i === 0 || /[\s\n]/.test(result[i - 1]))) {
      jsonStarts.push(i);
    }
  }
  const removals: [number, number][] = [];
  for (const start of jsonStarts) {
    let depth = 0;
    let end = -1;
    for (let i = start; i < result.length; i++) {
      if (result[i] === '{') depth++;
      else if (result[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end === -1) continue;
    const block = result.slice(start, end);
    if (block.length < 200) continue;
    try {
      const parsed = JSON.parse(block);
      if (isRecord(parsed) && ('$schema' in parsed || 'datasets' in parsed || 'config' in parsed || 'chart_type' in parsed)) {
        removals.push([start, end]);
      }
    } catch { /* not valid JSON, skip */ }
  }
  for (let i = removals.length - 1; i >= 0; i--) {
    result = result.slice(0, removals[i][0]) + result.slice(removals[i][1]);
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function extractAgentText(events: AdkEvent[]): string {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const texts = getTextFromParts(events[i].content);
    if (texts.length > 0) return stripLeakedJson(texts.join('\n').trim());
  }
  return 'The agent responded without readable text.';
}

function extractAgentTextFromEvents(events: AdkEvent[]): string {
  const allTexts: string[] = [];
  for (const event of events) {
    const texts = getTextFromParts(event.content);
    for (const t of texts) {
      if (t && !t.startsWith('{')) allTexts.push(t);
    }
  }
  return allTexts.join('\n').trim();
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

function extractQueryAuditFromPayload(payload: unknown): QueryAudit | undefined {
  if (!isRecord(payload)) return undefined;
  const audit = payload.query_audit;
  return isRecord(audit) ? audit as QueryAudit : undefined;
}

function extractQueryAuditFromEvents(events: AdkEvent[]): QueryAudit | undefined {
  let latest: QueryAudit | undefined;
  for (const event of events) {
    const delta = event.actions?.stateDelta;
    if (delta && isRecord(delta.query_audit)) {
      latest = delta.query_audit as QueryAudit;
    }
    for (const part of event.content?.parts ?? []) {
      if (!isAdkPart(part)) continue;
      const audit = extractQueryAuditFromPayload(parseJsonStringMaybe(part.functionResponse?.response));
      if (audit) latest = audit;
    }
  }
  return latest;
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

function extractBestNarrative(candidates: InsightCandidate[]): ReturnType<typeof extractNarrativeFromPayload> {
  const narratives = candidates.map((candidate) => extractNarrativeFromPayload(candidate.payload));
  return narratives.reduce<ReturnType<typeof extractNarrativeFromPayload>>((best, current) => {
    const bestScore = (best.key_points?.length ?? 0) + (best.recommended_actions?.length ?? 0) + (best.insight_summary ? 1 : 0);
    const currentScore = (current.key_points?.length ?? 0) + (current.recommended_actions?.length ?? 0) + (current.insight_summary ? 1 : 0);
    return currentScore > bestScore ? current : best;
  }, {});
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
  globalSql: string = '',
  globalAudit?: QueryAudit,
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
        query_audit: globalAudit,
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
  const query_audit = extractQueryAuditFromPayload(candidate.payload) ?? globalAudit;
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
      query_audit,
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

function isNarrativeWorthy(text: string): boolean {
  if (text.length < 200) return false;
  const bullets = text.match(/^[\s]*(?:[-*]|\d+[.)]\s)\s*.+/gm) ?? [];
  const headings = [
    ...(text.match(/^#{1,4}\s+.+/gm) ?? []),
    ...(text.match(/^\s*\*\*[^*]+:\*\*/gm) ?? []),
  ];
  return bullets.length >= 2 || headings.length > 0;
}

async function summarizeWithGemini(prompt: string, text: string): Promise<ApiInsight | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text:
        `You are a business analyst. The user asked: "${prompt}"

The AI agent responded with the following analysis:
---
${text.slice(0, 2000)}
---

Produce a JSON object with this exact structure (no markdown fences, only valid JSON):
{
  "insight_summary": "<1-2 sentence executive summary of the key finding>",
  "key_points": ["<concise point 1, max 80 chars>", "<concise point 2, max 80 chars>", "<concise point 3, max 80 chars>"],
  "recommended_actions": ["<action 1, max 80 chars>", "<action 2, max 80 chars>"]
}

Rules:
- insight_summary must be 1-2 sentences, max 150 characters
- Each key_point must be a SHORT headline-style phrase, max 80 characters
- recommended_actions can be empty [] if no actions are mentioned
- Do NOT copy the original text verbatim — summarize and condense`
      }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    });

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    const title = prompt.length > 80 ? prompt.slice(0, 77) + '...' : prompt;

    return {
      title,
      sql_query: '',
      sql_status: 'missing_backend',
      columns: [],
      rows: [],
      suggested_chart_type: 'table',
      insight_summary: typeof parsed.insight_summary === 'string' ? parsed.insight_summary : undefined,
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points.filter((p: unknown) => typeof p === 'string').slice(0, 4) : [],
      recommended_actions: Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions.filter((a: unknown) => typeof a === 'string').slice(0, 3) : [],
      visualization_mode: 'narrative',
    };
  } catch (err) {
    console.error('summarizeWithGemini failed:', err);
    return null;
  }
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

function toChartMeta(parsed: Record<string, unknown>): ChartMeta | null {
  if (typeof parsed.chart_type !== 'string') return null;
  return {
    chart_type: parsed.chart_type as ChartMeta['chart_type'],
    x_col: typeof parsed.x_col === 'string' ? parsed.x_col : undefined,
    y_col: typeof parsed.y_col === 'string' ? parsed.y_col : undefined,
    title: typeof parsed.title === 'string' ? parsed.title : undefined,
    data: Array.isArray(parsed.data) ? parsed.data : undefined,
  };
}

function extractChartMeta(events: AdkEvent[]): ChartMeta | null {
  for (const event of events) {
    const delta = event.actions?.stateDelta;
    if (delta?.chart_meta) {
      const meta = parseJsonStringMaybe(delta.chart_meta);
      if (isRecord(meta)) {
        const cm = toChartMeta(meta as Record<string, unknown>);
        if (cm) return cm;
      }
    }
  }
  for (const event of events) {
    const parts = event.content?.parts ?? [];
    for (const part of parts) {
      if (!isAdkPart(part)) continue;
      const fr = part.functionResponse;
      if (fr?.name === 'build_dashboard' && fr.response !== undefined) {
        let raw: unknown = fr.response;
        if (isRecord(raw) && typeof (raw as Record<string, unknown>).result === 'string') {
          raw = (raw as Record<string, unknown>).result;
        }
        const meta = parseJsonStringMaybe(raw);
        if (isRecord(meta)) {
          const cm = toChartMeta(meta as Record<string, unknown>);
          if (cm) return cm;
        }
      }
    }
  }
  return null;
}

function phaseFromTool(toolName: string): StatusPhase {
  const lower = toolName.toLowerCase();
  if (lower.includes('recommend') || lower.includes('summary') || lower.includes('summar')) return 'finalizing';
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

function extractToolsCalled(events: AdkEvent[]): Set<string> {
  const tools = new Set<string>();
  for (const event of events) {
    for (const part of event.content?.parts ?? []) {
      if (!isAdkPart(part)) continue;
      if (part.functionCall?.name) tools.add(part.functionCall.name);
      if (part.functionResponse?.name) tools.add(part.functionResponse.name);
    }
  }
  return tools;
}

function classifyResponseType(
  insight: ApiInsight | null,
  hasChartCapableData: boolean,
  narrativeSqlValidated: boolean,
  events: AdkEvent[],
): ResponseType {
  if (!insight) return 'message_only';

  const tools = extractToolsCalled(events);
  const hasVisualization = tools.has('build_dashboard') || !!insight.chart_meta;

  if (hasVisualization) return 'insight_ready';

  const hasRichNarrative = (insight.key_points?.length ?? 0) >= 2
    || (insight.recommended_actions?.length ?? 0) >= 1;

  if (hasRichNarrative && insight.visualization_mode === 'narrative') return 'insight_partial';

  const isMetadataQuery = insight.sql_query?.toLowerCase().includes('information_schema');
  const isSimpleLookup = (insight.rows?.length ?? 0) <= 3 && !hasVisualization;

  if ((isMetadataQuery || isSimpleLookup) && !hasRichNarrative) return 'answer';

  if (hasChartCapableData || narrativeSqlValidated) return 'insight_ready';

  return 'insight_partial';
}

function buildUiHints(
  responseType: ResponseType,
  confidence: UiHints['confidence'],
  narrativeSqlValidated = false,
  insight?: ApiInsight | null,
): UiHints {
  const isInsight = responseType === 'insight_ready';
  const isNarrativePartial = responseType === 'insight_partial';
  const hasSaveableSummary = !!insight?.insight_summary?.trim();
  const isSaveableResponse = responseType !== 'answer' && responseType !== 'message_only';
  const pinAllowed = isInsight || isNarrativePartial || (hasSaveableSummary && isSaveableResponse);
  const suggestPin = pinAllowed && !!(
    insight?.insight_summary?.trim() ||
    (insight?.key_points?.length ?? 0) >= 2 ||
    (insight?.recommended_actions?.length ?? 0) >= 1
  );
  return {
    auto_open_insight: isInsight && confidence !== 'low',
    pin_allowed: pinAllowed,
    confidence,
    narrative_sql_validated: narrativeSqlValidated,
    suggest_pin: suggestPin,
  };
}

function classifyErrorMessage(message: string): QueryErrorCategory {
  const lower = (message || '').toLowerCase();
  if (lower.includes('syntax error') || lower.includes('invalid query') || lower.includes('parse error')) return 'sql_syntax';
  if (lower.includes('not found') || lower.includes('404')) return 'not_found';
  if (lower.includes('permission') || lower.includes('access denied') || lower.includes('403')) return 'permission';
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) return 'timeout';
  if (lower.includes('missing') || lower.includes('environment variable') || lower.includes('credentials')) return 'config';
  if (lower.includes('unavailable') || lower.includes('failed to create adk session') || lower.includes('503')) return 'backend_unavailable';
  return 'unknown';
}

function userFriendlyError(message: string): { message: string; category: QueryErrorCategory } {
  const category = classifyErrorMessage(message);
  const friendly: Record<QueryErrorCategory, string> = {
    sql_syntax: 'The generated SQL failed. Review the query or ask me to simplify it.',
    not_found: 'I could not find one of the requested tables or fields. Try asking what data is available.',
    permission: 'I do not have permission to access the required data.',
    timeout: 'This took longer than expected. Try again with a narrower question.',
    empty_result: 'No rows matched those filters. Try a wider date range or broader criteria.',
    backend_unavailable: 'I could not reach the data agent. Try again in a moment.',
    config: 'The data agent is missing required configuration.',
    unknown: 'I could not complete this request. Try again or simplify the question.',
  };
  return { message: friendly[category], category };
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
    // from intermediate events (e.g. build_dashboard's chart metadata).
    return parsed.length > 0 ? parsed : [{}];
  }
  const text = await res.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
}

const adkFetch = sharedAdkFetch;

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
      const rawErrMsg = sessionErr instanceof Error ? sessionErr.message : 'Backend unavailable';
      const friendly = userFriendlyError(rawErrMsg);
      return NextResponse.json(
        {
          status: 'error',
          response_type: 'error',
          error: friendly.message,
          status_phase: 'finalizing',
          phase_trace: ['thinking', 'finalizing'],
          ui_hints: { auto_open_insight: false, pin_allowed: false, confidence: 'low' as const },
          meta: {
            request_id: requestId,
            elapsed_ms: Date.now() - start,
            app_name: PINNED_APP_NAME ?? 'dashboard_agent',
            session_id: '',
            error_category: friendly.category,
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
      streaming: true,
      stateDelta: null,
      history: body.history ?? [],
    };

    const runRes = await adkFetch('/run_sse', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!runRes.ok) {
      const detail = await runRes.text();
      throw new Error(detail || `ADK request failed (${runRes.status})`);
    }

    const cookieHeader = createdBrowserId
      ? `${BROWSER_COOKIE}=${createdBrowserId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`
      : '';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const allEvents: AdkEvent[] = [];
          let lastTextSent = '';
          const reader = runRes.body?.getReader();
          if (!reader) throw new Error('No response body from ADK');
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.slice(5).trim();
              if (!jsonStr) continue;
              let parsed: unknown;
              try { parsed = JSON.parse(jsonStr); } catch { continue; }
              const event = asAdkEvent(parsed);
              if (!event) continue;
              allEvents.push(event);

              const textParts = getTextFromParts(event);
              if (textParts.length > 0) {
                const currentText = extractAgentTextFromEvents(allEvents);
                if (currentText.length > lastTextSent.length) {
                  sendSSE({ type: 'text_delta', text: currentText });
                  lastTextSent = currentText;
                }
              }

              const parts = event.content?.parts ?? [];
              for (const part of parts) {
                if (!isAdkPart(part)) continue;
                if (part.functionCall?.name) {
                  sendSSE({ type: 'phase', phase: phaseFromTool(part.functionCall.name) });
                }
              }
            }
          }

          const events = allEvents;
          const phaseTrace = extractPhaseTrace(events);
          const agentMessage = extractAgentText(events);
          const globalSql = extractSqlFromAllEvents(events);
          const candidates = extractCandidates(events);
          const bestCandidate = selectBestCandidate(candidates);
          const globalAudit = extractQueryAuditFromEvents(events);
          let { insight, confidence } = buildInsightFromCandidate(prompt, agentMessage, bestCandidate, globalSql, globalAudit);
          if (insight) {
            const bestNarrative = extractBestNarrative(candidates);
            insight.insight_summary = bestNarrative.insight_summary ?? insight.insight_summary;
            insight.key_points = bestNarrative.key_points ?? insight.key_points;
            insight.recommended_actions = bestNarrative.recommended_actions ?? insight.recommended_actions;
            const chartMeta = extractChartMeta(events);
            if (chartMeta) {
              insight.chart_meta = chartMeta;
              if (insight.rows.length === 0 && chartMeta.data?.length) {
                insight.rows = chartMeta.data;
                insight.columns = Object.keys(chartMeta.data[0] ?? {});
              }
            }
          }
          if (!insight && isNarrativeWorthy(agentMessage)) {
            const narrativeInsight = await summarizeWithGemini(prompt, agentMessage);
            if (narrativeInsight) {
              insight = narrativeInsight;
              confidence = 'medium';
            }
          }
          const hasNarrative = !!insight?.insight_summary || (insight?.key_points?.length ?? 0) > 0;
          const hasChartCapableData = (insight?.rows.length ?? 0) > 0 && (insight?.columns.length ?? 0) > 0;
          const hasValidatedSql =
            insight?.sql_status === 'available' || insight?.sql_status === 'derived_from_text';
          const narrativeSqlValidated = !hasChartCapableData && hasNarrative && hasValidatedSql;
          const responseType = classifyResponseType(insight, hasChartCapableData, narrativeSqlValidated, events);
          const uiHints = buildUiHints(responseType, confidence, narrativeSqlValidated, insight);
          const meta: ResponseMeta = {
            request_id: requestId,
            elapsed_ms: Date.now() - start,
            app_name: session.appName,
            session_id: session.sessionId,
          };

          sendSSE({
            type: 'done',
            status: 'success',
            response_type: responseType,
            agent_message: agentMessage,
            insight,
            status_phase: phaseTrace[phaseTrace.length - 1] ?? 'finalizing',
            phase_trace: phaseTrace,
            ui_hints: uiHints,
            meta,
          });
        } catch (streamErr) {
          const rawMessage = streamErr instanceof Error ? streamErr.message : 'Stream error';
          const friendly = userFriendlyError(rawMessage);
          sendSSE({
            type: 'done',
            status: 'error',
            response_type: 'error',
            error: friendly.message,
            status_phase: 'finalizing',
            phase_trace: ['thinking', 'finalizing'],
            ui_hints: { auto_open_insight: false, pin_allowed: false, confidence: 'low', suggest_pin: false },
            meta: { request_id: requestId, elapsed_ms: Date.now() - start, app_name: session.appName, session_id: session.sessionId, error_category: friendly.category },
          });
        } finally {
          controller.close();
        }
      },
    });

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    };
    if (cookieHeader) headers['Set-Cookie'] = cookieHeader;

    return new Response(stream, { headers });
  } catch (err) {
    console.error('POST /api/chat error:', err);
    const rawMessage = err instanceof Error ? err.message : 'Internal server error';
    const friendly = userFriendlyError(rawMessage);
    const response = NextResponse.json(
      {
        status: 'error',
        response_type: 'error',
        error: friendly.message,
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
          error_category: friendly.category,
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
