'use client';

import { useRef, useEffect } from 'react';
import { Send, Bot, User, RotateCcw, Database, ArrowRight } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { sendChatStream } from '@/src/services/chatApi';
import { InlineArtifact } from './InlineArtifact';
import { InsightRecommendation } from './InsightRecommendation';
import { TypingIndicator } from './TypingIndicator';

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
    lastError,
    lastPrompt,
    trackSession,
    activeSessionId,
    uiHints,
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

    await sendChatStream(prompt, chatHistory, {
      onTextDelta: (text) => {
        setAgentMessage(text, 'loading');
      },
      onPhase: () => {},
      onDone: (res) => {
        setAgentMessage(res.agent_message, 'done', res.insight ?? null);
        applyResponseState({
          responseType: res.response_type,
          statusPhase: res.status_phase,
          phaseTrace: res.phase_trace,
          uiHints: res.ui_hints,
          meta: res.meta,
          insight: res.insight ?? null,
        });
        if (res.meta?.session_id && !activeSessionId) {
          trackSession(res.meta.session_id, prompt);
        }
        if (res.insight && res.response_type !== 'answer') {
          setCurrentInsight(res.insight);
        }
        if (res.response_type === 'insight_ready' && res.ui_hints.auto_open_insight) {
          setMainMode('insight');
        }
      },
      onError: (msg) => {
        setAgentMessage(msg, 'done', null);
        failRequest(msg);
      },
    });
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

  return (
    <>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center gap-5 pt-6 px-2">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Database className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-[var(--text)]">Data Copilot</span>
            </div>
            <p className="text-[var(--text-muted)] text-xs text-center max-w-[280px]">
              I can query your data, generate charts, and spot patterns. Try asking:
            </p>
            <div className="w-full space-y-1.5">
              {[
                'What data do we have?',
                'Show me monthly revenue trend',
                'Top 10 products by revenue',
                'Full analysis of customer retention',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isSending}
                  onClick={() => sendPrompt(suggestion)}
                  className="w-full flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-white/[0.06] hover:text-[var(--text)] transition-colors text-left disabled:opacity-50"
                >
                  <span className="flex-1">{suggestion}</span>
                  <ArrowRight className="w-3 h-3 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse animate-msg-right' : 'animate-msg-left'}`}
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
                <TypingIndicator />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.role === 'agent' && msg.insightData && msg.status === 'done' &&
                (msg.insightData.rows.length > 1 || msg.insightData.vega_spec) && (
                <InlineArtifact
                  insight={msg.insightData}
                  compact={!msg.insightData.vega_spec && !msg.insightData.recommended_actions?.length}
                  onExpand={() => handleCardClick(msg.insightData!)}
                />
              )}
              {msg.role === 'agent' && msg.status === 'done' && msg.insightData?.insight_summary &&
                i === chatHistory.length - 1 && uiHints?.suggest_pin && (
                <InsightRecommendation insight={msg.insightData} />
              )}
            </div>
          </div>
        ))}
        {isSending && chatHistory[chatHistory.length - 1]?.role !== 'agent' && (
          <div className="flex gap-3 animate-fade-in-up">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--agent-bubble)] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-[var(--agent-bubble)]">
              <TypingIndicator />
            </div>
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
      </div>
    </>
  );
}
