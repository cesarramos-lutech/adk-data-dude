import { NextRequest, NextResponse } from 'next/server';
import {
  sessionsByBrowser,
  BROWSER_COOKIE,
  USER_ID,
  PINNED_APP_NAME,
  adkFetch,
} from '../_shared';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

interface ChatMsg {
  role: 'user' | 'agent';
  content: string;
  status: 'done';
}

function extractMessagesFromSession(session: unknown): ChatMsg[] {
  if (!isRecord(session)) return [];
  const events = Array.isArray(session.events) ? session.events : [];
  const messages: ChatMsg[] = [];

  for (const event of events) {
    if (!isRecord(event)) continue;
    const content = event.content;
    if (!isRecord(content)) continue;
    const parts = Array.isArray(content.parts) ? content.parts : [];

    for (const part of parts) {
      if (!isRecord(part) || typeof part.text !== 'string' || !part.text.trim()) continue;
      if (part.functionCall || part.functionResponse) continue;

      const author = typeof event.author === 'string' ? event.author : '';
      const role: 'user' | 'agent' = author === 'user' ? 'user' : 'agent';
      if (role === 'agent' && (author === 'dashboard_agent' || author === '')) continue;

      messages.push({ role, content: part.text.trim(), status: 'done' });
    }
  }
  return messages;
}

async function getDefaultAppName(): Promise<string> {
  if (PINNED_APP_NAME) return PINNED_APP_NAME;
  const listRes = await adkFetch('/list-apps', { method: 'GET' });
  if (!listRes.ok) return 'dashboard_agent';
  try {
    const payload = await listRes.json();
    if (Array.isArray(payload)) {
      const names = payload.filter((v): v is string => typeof v === 'string');
      if (names.includes('dashboard_agent')) return 'dashboard_agent';
      if (names.length > 0) return names[0];
    }
  } catch { /* ignore */ }
  return 'dashboard_agent';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;
    const sessionId = body.sessionId as string | undefined;

    const browserId = request.cookies.get(BROWSER_COOKIE)?.value;
    if (!browserId) {
      return NextResponse.json({ error: 'No browser session' }, { status: 400 });
    }

    if (action === 'new') {
      sessionsByBrowser.delete(browserId);
      return NextResponse.json({ status: 'ok' });
    }

    if (action === 'switch' && sessionId) {
      const appName = await getDefaultAppName();

      const sessionRes = await adkFetch(
        `/apps/${appName}/users/${USER_ID}/sessions/${sessionId}`,
        { method: 'GET' }
      );
      if (!sessionRes.ok) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      const session = await sessionRes.json();
      const messages = extractMessagesFromSession(session);

      sessionsByBrowser.set(browserId, {
        appName,
        sessionId,
        updatedAt: Date.now(),
      });

      return NextResponse.json({ status: 'ok', messages });
    }

    if (action === 'load' && sessionId) {
      const appName = await getDefaultAppName();
      const sessionRes = await adkFetch(
        `/apps/${appName}/users/${USER_ID}/sessions/${sessionId}`,
        { method: 'GET' }
      );
      if (!sessionRes.ok) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      const session = await sessionRes.json();
      const messages = extractMessagesFromSession(session);
      return NextResponse.json({ status: 'ok', messages });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/chat/session error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
