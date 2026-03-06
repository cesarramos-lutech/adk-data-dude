'use client';

import { useState } from 'react';
import { PanelLeftClose, PanelLeft, RotateCcw } from 'lucide-react';
import { ChatPane } from '@/src/components/copilot/ChatPane';
import { CanvasPane } from '@/src/components/copilot/CanvasPane';
import { useCopilotStore } from '@/src/store/copilotStore';

export default function Home() {
  const [chatOpen, setChatOpen] = useState(true);
  const { clearChat, pinnedBoardItems } = useCopilotStore();

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Global header */}
      <header className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] bg-[var(--chat-bg)]">
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          title={chatOpen ? 'Collapse chat' : 'Expand chat'}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors"
        >
          {chatOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
        <span className="text-sm font-semibold text-[var(--text)]">Data Copilot</span>
        {pinnedBoardItems.length > 0 && (
          <span className="text-xs rounded-full bg-blue-600/20 text-blue-300 px-2 py-0.5">
            {pinnedBoardItems.length} on dashboard
          </span>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => clearChat()}
            title="Clear chat"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear chat
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {chatOpen && (
          <aside
            className="w-[380px] shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--chat-bg)] transition-all duration-200"
          >
            <ChatPane />
          </aside>
        )}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--canvas-bg)]">
          <CanvasPane />
        </main>
      </div>
    </div>
  );
}
