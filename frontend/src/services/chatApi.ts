import type {
  ApiInsight,
  ResponseMeta,
  ResponseType,
  StatusPhase,
  UiHints,
} from '@/src/types/insight';
import type { ChatMessage } from '@/src/store/copilotStore';

export interface ChatSuccessResponse {
  status: 'success';
  response_type: ResponseType;
  agent_message: string;
  insight?: ApiInsight | null;
  status_phase?: StatusPhase;
  phase_trace?: StatusPhase[];
  ui_hints: UiHints;
  meta: ResponseMeta;
}

export interface ChatErrorResponse {
  status: 'error';
  response_type: 'error';
  error?: string;
  agent_message?: string;
  status_phase?: StatusPhase;
  phase_trace?: StatusPhase[];
  ui_hints?: UiHints;
  meta?: Partial<ResponseMeta>;
}

export type ChatResponse = ChatSuccessResponse | ChatErrorResponse;

export function buildHistory(messages: ChatMessage[]): { role: string; content: string }[] {
  return messages
    .filter((m) => m.role && m.content && m.status === 'done')
    .map((m) => ({ role: m.role, content: m.content }));
}

export interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onPhase: (phase: StatusPhase) => void;
  onDone: (response: ChatSuccessResponse) => void;
  onError: (error: string) => void;
}

export async function sendChatStream(
  prompt: string,
  history: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, history: buildHistory(history) }),
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
    callbacks.onError(msg);
    return;
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    const data: ChatResponse = await res.json();
    if (data.status !== 'success') {
      callbacks.onError(data.error || data.agent_message || 'Unknown error');
      return;
    }
    callbacks.onDone(data);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }

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
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(jsonStr); } catch { continue; }

      if (parsed.type === 'text_delta' && typeof parsed.text === 'string') {
        callbacks.onTextDelta(parsed.text);
      } else if (parsed.type === 'phase' && typeof parsed.phase === 'string') {
        callbacks.onPhase(parsed.phase as StatusPhase);
      } else if (parsed.type === 'done') {
        if (parsed.status === 'success') {
          callbacks.onDone(parsed as unknown as ChatSuccessResponse);
        } else {
          callbacks.onError(
            (parsed.error as string) || (parsed.agent_message as string) || 'Unknown error',
          );
        }
      }
    }
  }
}

export async function sendChat(
  prompt: string,
  history: ChatMessage[] = []
): Promise<ChatSuccessResponse> {
  return new Promise((resolve, reject) => {
    sendChatStream(prompt, history, {
      onTextDelta: () => {},
      onPhase: () => {},
      onDone: resolve,
      onError: (msg) => reject(new Error(msg)),
    });
  });
}
