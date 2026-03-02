'use client';

import { useRef, useEffect } from 'react';
import { Send, Bot, User, RotateCcw } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { sendChat } from '@/src/services/chatApi';
import { MiniCard } from './MiniCard';

const phaseLabels: Record<string, string> = {
  thinking: 'Understanding request',
  querying: 'Running data query',
  visualizing: 'Preparing insight view',
  finalizing: 'Finalizing response',
};

const responseTypeLabels: Record<string, string> = {
  message_only: 'Message only',
  insight_partial: 'Partial insight',
  insight_ready: 'Insight ready',
  error: 'Error',
};

export function ChatPane() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    chatHistory,
    isSending,
    addUserMessage,
    setAgentMessage,
    startRequest,
    applyResponseState,
    failRequest,
    clearError,
    setCurrentInsight,
    setMainMode,
    statusPhase,
    phaseTrace,
    lastError,
    lastPrompt,
    lastResponseType,
  } = useCopilotStore();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatHistory, isSending]);

  const sendPrompt = async (prompt: string) => {
    if (!prompt.trim() || isSending) return;
    clearError();
    addUserMessage(prompt);
    startRequest(prompt);
    setAgentMessage('', 'loading');

    try {
      const res = await sendChat(prompt, chatHistory);
      setAgentMessage(res.agent_message, 'done', res.insight ?? null);
      applyResponseState({
        responseType: res.response_type,
        statusPhase: res.status_phase,
        phaseTrace: res.phase_trace,
        uiHints: res.ui_hints,
        meta: res.meta,
        insight: res.insight ?? null,
      });
      if (res.insight) {
        setCurrentInsight(res.insight);
      }
      if (res.response_type === 'insight_ready' && res.ui_hints.auto_open_insight) {
        setMainMode('insight');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setAgentMessage(msg, 'done', null);
      failRequest(msg);
    }
  };

  const handleSend = async () => {
    const input = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    const text = input?.value?.trim();
    if (!text || isSending) return;
    if (input) input.value = '';
    await sendPrompt(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCardClick = (insight: NonNullable<typeof chatHistory[0]['insightData']>) => {
    setCurrentInsight(insight);
    setMainMode('insight');
  };

  const handleRetry = async () => {
    if (!lastPrompt) return;
    await sendPrompt(lastPrompt);
  };

  const currentPhaseLabel = statusPhase ? phaseLabels[statusPhase] ?? statusPhase : null;
  const currentResponseLabel = lastResponseType
    ? responseTypeLabels[lastResponseType] ?? lastResponseType
    : null;

  return (
    <>
      <header className="shrink-0 px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-[var(--text)]">Chat</h1>
          <div className="flex items-center gap-2">
            {statusPhase && (
              <span className="text-xs rounded-full bg-white/10 px-2 py-1 text-[var(--text-muted)] capitalize">
                {currentPhaseLabel}
              </span>
            )}
            {lastResponseType && lastResponseType !== 'error' && (
              <span className="text-xs rounded-full bg-white/5 px-2 py-1 text-[var(--text-muted)]">
                {currentResponseLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {chatHistory.length === 0 && (
          <p className="text-[var(--text-muted)] text-sm pt-8 text-center">
            Ask a question about your data
          </p>
        )}
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user'
                  ? 'bg-[var(--user-bubble)]'
                  : 'bg-[var(--agent-bubble)]'
              }`}
            >
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-[var(--user-bubble)] text-white'
                  : 'bg-[var(--agent-bubble)] text-[var(--text)]'
              }`}
            >
              {msg.status === 'loading' && !msg.content ? (
                <span className="text-sm text-[var(--text-muted)]">
                  {currentPhaseLabel ?? 'Working on your request...'}
                </span>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.role === 'agent' && msg.insightData && msg.status === 'done' && (
                <MiniCard
                  insight={msg.insightData}
                  onClick={() => handleCardClick(msg.insightData!)}
                />
              )}
            </div>
          </div>
        ))}
        {isSending && chatHistory[chatHistory.length - 1]?.role !== 'agent' && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--agent-bubble)] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-[var(--agent-bubble)] text-sm text-[var(--text-muted)]">
              {currentPhaseLabel ?? 'Working on your request...'}
            </div>
          </div>
        )}
        {phaseTrace.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {phaseTrace.map((phase, idx) => (
              <span
                key={`${phase}-${idx}`}
                className="text-[11px] rounded-full bg-white/5 px-2 py-1 text-[var(--text-muted)] capitalize"
              >
                {phaseLabels[phase] ?? phase}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 border-t border-[var(--border)]">
        {lastError && (
          <div className="mb-2 rounded-md border border-red-900/40 bg-red-900/20 px-3 py-2 text-xs text-red-200 flex items-center justify-between gap-2">
            <span className="truncate">Request failed: {lastError}</span>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isSending || !lastPrompt}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-red-700/40 hover:bg-red-700/60 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            id="chat-input"
            placeholder="Ask about your data…"
            disabled={isSending}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 min-h-[40px] max-h-32 resize-y rounded-lg border border-[var(--border)] bg-[var(--canvas-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="shrink-0 h-10 w-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-white"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {isSending && (
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Complex questions may take up to a minute while the agent runs tools.
          </p>
        )}
      </div>
    </>
  );
}
