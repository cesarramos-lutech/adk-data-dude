'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { useCopilotStore, type SessionMeta } from '@/src/store/copilotStore';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function SessionHistory() {
  const {
    sessionHistory,
    activeSessionId,
    loadSessionChat,
    deleteSessionMeta,
    isSending,
  } = useCopilotStore();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSwitch = async (session: SessionMeta) => {
    if (session.sessionId === activeSessionId || isSending) return;
    setLoading(session.sessionId);
    try {
      const res = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch', sessionId: session.sessionId }),
      });
      if (!res.ok) throw new Error('Failed to load session');
      const data = await res.json();
      loadSessionChat(session.sessionId, data.messages ?? []);
      setOpen(false);
    } catch (err) {
      console.error('Session switch failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    deleteSessionMeta(sessionId);
  };

  if (sessionHistory.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors"
      >
        <Clock className="w-3.5 h-3.5" />
        History
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 max-h-80 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--chat-bg)] shadow-xl z-50 animate-fade-in-up">
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--text-muted)]">Recent sessions</span>
          </div>
          {sessionHistory.map((session) => {
            const isActive = session.sessionId === activeSessionId;
            const isLoading = loading === session.sessionId;
            return (
              <button
                key={session.sessionId}
                type="button"
                disabled={isActive || isSending || !!loading}
                onClick={() => handleSwitch(session)}
                className={`w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors group ${
                  isActive
                    ? 'bg-blue-600/10 border-l-2 border-blue-500'
                    : 'hover:bg-white/5 border-l-2 border-transparent'
                } disabled:opacity-60`}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text)] truncate">{session.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {timeAgo(session.createdAt)}
                    {session.messageCount > 0 && ` · ${session.messageCount} messages`}
                  </p>
                </div>
                {isLoading ? (
                  <Loader2 className="w-3 h-3 shrink-0 text-blue-400 animate-spin" />
                ) : !isActive ? (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, session.sessionId)}
                    className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:bg-red-900/30 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
