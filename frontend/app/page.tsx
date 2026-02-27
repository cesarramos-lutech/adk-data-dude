'use client';

import { ChatPane } from '@/src/components/copilot/ChatPane';
import { CanvasPane } from '@/src/components/copilot/CanvasPane';

export default function Home() {
  return (
    <div className="h-screen overflow-hidden flex">
      <aside className="w-[400px] shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--chat-bg)]">
        <ChatPane />
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--canvas-bg)]">
        <CanvasPane />
      </main>
    </div>
  );
}
