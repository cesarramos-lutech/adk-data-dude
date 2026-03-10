type SessionState = { appName: string; sessionId: string; updatedAt: number };

export const sessionsByBrowser = new Map<string, SessionState>();
export const SESSION_TTL_MS = 30 * 60 * 1000;
export const BROWSER_COOKIE = 'copilot_browser_id';
export const USER_ID = 'user';
export const PINNED_APP_NAME = process.env.ADK_APP_NAME?.trim();

export const ADK_BASE_URL = (
  process.env.ADK_API_BASE_URL ??
  process.env.NEXT_PUBLIC_ADK_API_BASE_URL ??
  'http://localhost:8081'
).replace(/\/+$/, '');

export function adkFetch(path: string, init?: RequestInit): Promise<Response> {
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

export type { SessionState };
