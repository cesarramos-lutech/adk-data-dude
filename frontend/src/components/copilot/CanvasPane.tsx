'use client';

import { LayoutGrid, Lightbulb } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { ActiveInsightView } from './ActiveInsightView';
import { MyBoardView } from './MyBoardView';
import type { StatusPhase } from '@/src/types/insight';

const PHASE_STEPS: { id: StatusPhase; label: string }[] = [
  { id: 'thinking', label: 'Think' },
  { id: 'querying', label: 'Query' },
  { id: 'visualizing', label: 'Visual' },
  { id: 'finalizing', label: 'Done' },
];

const PHASE_ORDER: Record<StatusPhase, number> = {
  thinking: 0,
  querying: 1,
  visualizing: 2,
  finalizing: 3,
};

function PhaseProgressBar({ phase, isSending }: { phase: StatusPhase | null; isSending: boolean }) {
  if (!phase && !isSending) return null;
  const currentIdx = phase ? (PHASE_ORDER[phase] ?? 0) : 0;

  return (
    <div className="flex items-center gap-1">
      {PHASE_STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx && (isSending || phase !== 'finalizing');
        const isFuture = idx > currentIdx;
        return (
          <div key={step.id} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-blue-400'
                    : isActive
                      ? 'bg-blue-500 ring-2 ring-blue-500/30 animate-pulse'
                      : isFuture
                        ? 'bg-white/10'
                        : 'bg-blue-400'
                }`}
              />
              <span className={`text-[9px] leading-none ${isActive ? 'text-blue-300' : isDone ? 'text-blue-400/70' : 'text-[var(--text-muted)]/40'}`}>
                {step.label}
              </span>
            </div>
            {idx < PHASE_STEPS.length - 1 && (
              <div className={`w-4 h-px mb-3 transition-all duration-500 ${idx < currentIdx ? 'bg-blue-400' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatElapsed(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const s = Math.round(ms / 1000);
  return `${s}s`;
}

export function CanvasPane() {
  const { mainMode, setMainMode, statusPhase, uiHints, lastMeta, isSending } = useCopilotStore();

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
          Dashboard
        </button>
        <div className="ml-auto flex items-center gap-3">
          {(isSending || statusPhase) && (
            <PhaseProgressBar phase={statusPhase} isSending={isSending} />
          )}
          {uiHints?.confidence && !isSending && (
            <span className={`text-xs rounded-full px-2 py-1 ${
              uiHints.confidence === 'high' ? 'bg-green-900/20 text-green-300' :
              uiHints.confidence === 'medium' ? 'bg-yellow-900/20 text-yellow-300' :
              'bg-red-900/20 text-red-300'
            }`}>
              {uiHints.confidence}
            </span>
          )}
          {lastMeta?.elapsed_ms && !isSending ? (
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
