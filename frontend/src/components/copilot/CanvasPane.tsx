'use client';

import { LayoutGrid, Lightbulb } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { ActiveInsightView } from './ActiveInsightView';
import { MyBoardView } from './MyBoardView';

const phaseLabels: Record<string, string> = {
  thinking: 'Understanding',
  querying: 'Querying',
  visualizing: 'Visualizing',
  finalizing: 'Finalizing',
};

const responseTypeLabels: Record<string, string> = {
  message_only: 'Message only',
  insight_partial: 'Partial insight',
  insight_ready: 'Insight ready',
  error: 'Error',
};

function formatElapsed(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

export function CanvasPane() {
  const { mainMode, setMainMode, statusPhase, lastResponseType, uiHints, lastMeta } = useCopilotStore();

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
        <div className="ml-auto flex items-center gap-2">
          {statusPhase && (
            <span className="text-xs rounded-full bg-white/10 px-2 py-1 text-[var(--text-muted)] capitalize">
              {phaseLabels[statusPhase] ?? statusPhase}
            </span>
          )}
          {lastResponseType && (
            <span className="text-xs rounded-full bg-white/5 px-2 py-1 text-[var(--text-muted)]">
              {responseTypeLabels[lastResponseType] ?? lastResponseType}
            </span>
          )}
          {uiHints?.confidence && (
            <span className="text-xs rounded-full bg-blue-900/20 px-2 py-1 text-blue-300">
              {uiHints.confidence} confidence
            </span>
          )}
          {lastMeta?.elapsed_ms ? (
            <span className="text-xs rounded-full bg-white/5 px-2 py-1 text-[var(--text-muted)]">
              {formatElapsed(lastMeta.elapsed_ms)}
            </span>
          ) : null}
        </div>
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
