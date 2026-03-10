'use client';

import { useState } from 'react';
import { PanelLeftClose, PanelLeft, Plus } from 'lucide-react';
import { ChatPane } from '@/src/components/copilot/ChatPane';
import { CanvasPane } from '@/src/components/copilot/CanvasPane';
import { SessionHistory } from '@/src/components/copilot/SessionHistory';
import { useCopilotStore } from '@/src/store/copilotStore';

export default function Home() {
  const [chatOpen, setChatOpen] = useState(true);
  const { clearChat } = useCopilotStore();

  const handleNewSession = async () => {
    try {
      await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'new' }),
      });
    } catch { /* ignore */ }
    clearChat();
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <header className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--chat-bg)]">
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          title={chatOpen ? 'Collapse chat' : 'Expand chat'}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors"
        >
          {chatOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
        <span className="text-sm font-semibold text-[var(--text)]">Data Copilot</span>
        <div className="ml-auto flex items-center gap-1">
          <SessionHistory />
          <button
            type="button"
            onClick={handleNewSession}
            title="New session"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New session
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside
          className={`shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--chat-bg)] transition-all duration-300 ease-in-out overflow-hidden ${
            chatOpen ? 'w-[380px]' : 'w-0 border-r-0'
          }`}
        >
          <div className="w-[380px] h-full flex flex-col">
            <ChatPane />
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--canvas-bg)]">
          <CanvasPane />
        </main>
      </div>
    </div>
  );
}
