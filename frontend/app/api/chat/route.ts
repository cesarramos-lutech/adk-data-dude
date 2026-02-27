import { NextRequest, NextResponse } from 'next/server';
import type { ApiInsight } from '@/src/types/insight';

export const runtime = 'nodejs';

type HistoryItem = { role?: string; content?: string };
type ChatRequest = { prompt?: string; history?: HistoryItem[] };
type SessionState = { appName: string; sessionId: string; updatedAt: number };

const sessionsByBrowser = new Map<string, SessionState>();
const BROWSER_COOKIE = 'copilot_browser_id';
const USER_ID = 'user';

const ADK_BASE_URL = (
  process.env.ADK_API_BASE_URL ??
  process.env.NEXT_PUBLIC_ADK_API_BASE_URL ??
  'http://localhost:8081'
).replace(/\/+$/, '');

function getTextFromParts(container: unknown): string[] {
  if (!container || typeof container !== 'object') return [];
  const rec = container as Record<string, unknown>;
  const parts = Array.isArray(rec.parts) ? rec.parts : [];
  const out: string[] = [];
  for (const part of parts) {
    if (part && typeof part === 'object') {
      const p = part as Record<string, unknown>;
      if (typeof p.text === 'string' && p.text.trim()) out.push(p.text.trim());
      if (p.functionCall && typeof p.functionCall === 'object') {
        const fc = p.functionCall as Record<string, unknown>;
        if (typeof fc.args === 'string' && fc.args.trim()) out.push(fc.args.trim());
      }
    }
  }
  return out;
}

function walkJson(root: unknown, visit: (node: unknown) => void): void {
  const stack: unknown[] = [root];
  const seen = new Set<unknown>();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node == null || seen.has(node)) continue;
    seen.add(node);
    visit(node);
    if (Array.isArray(node)) {
      for (const v of node) stack.push(v);
    } else if (typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) stack.push(v);
    }
  }
}

function extractAgentText(raw: unknown): string {
  const chunks: string[] = [];
  walkJson(raw, (node) => {
    chunks.push(...getTextFromParts(node));
  });
  const joined = chunks.join('\n').trim();
  return joined || 'The agent responded without readable text.';
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

function extractRows(raw: unknown): Record<string, unknown>[] {
  let best: Record<string, unknown>[] = [];
  walkJson(raw, (node) => {
    if (!Array.isArray(node) || node.length === 0) return;
    const array = node as unknown[];
    if (!array.every((item) => item && typeof item === 'object' && !Array.isArray(item))) return;
    const typed = array as Record<string, unknown>[];
    const keys = Object.keys(typed[0] ?? {});
    if (keys.length === 0) return;
    // Ignore chat-like arrays [{role,content}]
    if (keys.length <= 2 && keys.includes('role') && keys.includes('content')) return;
    const allScalar = typed.every((row) => Object.values(row).every(isScalar));
    if (!allScalar) return;
    if (typed.length > best.length) best = typed;
  });
  return best;
}

function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const idx = clean.search(/[.!?](\s|$)/);
  if (idx > 0) return clean.slice(0, idx + 1).trim();
  return clean.slice(0, 80).trim();
}

function inferChartType(columns: string[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'table';
  const numericCols = columns.filter((col) => rows.some((r) => typeof r[col] === 'number'));
  if (numericCols.length === 0) return 'table';
  return 'bar';
}

function inferAxes(columns: string[], rows: Record<string, unknown>[]): { x?: string; y?: string } {
  if (columns.length === 0) return {};
  const numeric = columns.find((c) => rows.some((r) => typeof r[c] === 'number'));
  const categorical = columns.find((c) => rows.some((r) => typeof r[c] === 'string'));
  return {
    x: categorical ?? columns[0],
    y: numeric ?? columns.find((c) => c !== categorical) ?? columns[0],
  };
}

function buildInsight(prompt: string, text: string, raw: unknown): ApiInsight {
  const rows = extractRows(raw);
  const columns = rows.length > 0
    ? Object.keys(rows[0] ?? {})
    : ['label', 'value'];
  const axes = inferAxes(columns, rows);
  const sql = extractSql(text);

  return {
    title: firstSentence(text) || `Insight for: ${prompt.slice(0, 48)}`,
    sql_query: sql,
    columns,
    rows,
    suggested_chart_type: inferChartType(columns, rows),
    x_axis_key: axes.x,
    y_axis_key: axes.y,
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
    return parsed.length > 0 ? parsed[parsed.length - 1] : {};
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
  const listRes = await adkFetch('/list-apps', { method: 'GET' });
  if (!listRes.ok) return 'dashboard_agent';
  const payload = await parseAdkResponse(listRes);
  if (Array.isArray(payload) && typeof payload[0] === 'string') return payload[0];
  return 'dashboard_agent';
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
  const data = (await parseAdkResponse(sessionRes)) as { id?: string };
  if (!data.id) throw new Error('ADK session response missing "id".');
  return data.id;
}

async function getOrCreateSession(browserId: string): Promise<SessionState> {
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
  try {
    const body = (await request.json()) as ChatRequest;
    const prompt = (body.prompt ?? '').trim();
    if (!prompt) {
      return NextResponse.json(
        { status: 'error', error: 'Prompt is required.' },
        { status: 400 }
      );
    }

    let browserId = request.cookies.get(BROWSER_COOKIE)?.value;
    if (!browserId) {
      browserId = crypto.randomUUID();
      createdBrowserId = browserId;
    }

    const session = await getOrCreateSession(browserId);
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
    const agentMessage = extractAgentText(adkPayload);
    const insight = buildInsight(prompt, agentMessage, adkPayload);

    const response = NextResponse.json({
      status: 'success',
      agent_message: agentMessage,
      insight,
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
      { status: 'error', error: message },
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
