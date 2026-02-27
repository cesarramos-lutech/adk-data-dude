'use client';

import { useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { sendChat } from '@/src/services/chatApi';
import { MiniCard } from './MiniCard';

export function ChatPane() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    chatHistory,
    isSending,
    addUserMessage,
    setAgentMessage,
    setCurrentInsight,
    setMainMode,
    setSending,
  } = useCopilotStore();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatHistory, isSending]);

  const handleSend = async () => {
    const input = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    const text = input?.value?.trim();
    if (!text || isSending) return;

    addUserMessage(text);
    if (input) input.value = '';
    setSending(true);
    setAgentMessage('', 'loading');

    try {
      const res = await sendChat(text, chatHistory);
      setAgentMessage(res.agent_message, 'done', res.insight ?? null);
      if (res.insight) {
        setCurrentInsight(res.insight);
        setMainMode('insight');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setAgentMessage(msg, 'done', null);
    } finally {
      setSending(false);
    }
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

  return (
    <>
      <header className="shrink-0 px-4 py-3 border-b border-[var(--border)]">
        <h1 className="text-lg font-semibold text-[var(--text)]">Chat</h1>
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
                <span className="text-sm text-[var(--text-muted)]">Agent computing...</span>
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
              Agent computing...
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 border-t border-[var(--border)]">
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
