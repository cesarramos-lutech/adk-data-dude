'use client';

import { LayoutGrid, Lightbulb } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { ActiveInsightView } from './ActiveInsightView';
import { MyBoardView } from './MyBoardView';

export function CanvasPane() {
  const { mainMode, setMainMode, currentInsight } = useCopilotStore();

  return (
    <>
      <header className="shrink-0 flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={() => setMainMode('insight')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            mainMode === 'insight'
              ? 'bg-[var(--agent-bubble)] text-[var(--text)]'
              : 'text-[var(--text-muted)] hover:bg-white/5'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Active Insight
        </button>
        <button
          type="button"
          onClick={() => setMainMode('board')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            mainMode === 'board'
              ? 'bg-[var(--agent-bubble)] text-[var(--text)]'
              : 'text-[var(--text-muted)] hover:bg-white/5'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          My Board
        </button>
      </header>

      <div className="flex-1 overflow-hidden min-h-0">
        {mainMode === 'insight' ? (
          <ActiveInsightView />
        ) : (
          <MyBoardView />
        )}
      </div>
    </>
  );
}
