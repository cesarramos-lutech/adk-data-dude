import type { ApiInsight } from '@/src/types/insight';
import type { ChatMessage } from '@/src/store/copilotStore';

export interface ChatResponse {
  status: string;
  agent_message: string;
  insight?: ApiInsight | null;
}

/** Build history for API from store messages (optional context). */
export function buildHistory(messages: ChatMessage[]): { role: string; content: string }[] {
  return messages
    .filter((m) => m.role && m.content && m.status === 'done')
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function sendChat(
  prompt: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      history: buildHistory(history),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `Request failed: ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.error || json.message) msg = json.error || json.message;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }

  const data: ChatResponse = await res.json();
  if (data.status !== 'success') {
    throw new Error(data.agent_message || 'Unknown error');
  }
  return data;
}
