'use client';

import type { StatusPhase } from '@/src/types/insight';

interface RequestProgressProps {
  phase?: StatusPhase | null;
  phaseTrace?: StatusPhase[];
}

const PHASE_COPY: Record<StatusPhase, string> = {
  thinking: 'Thinking',
  querying: 'Querying BigQuery',
  visualizing: 'Building chart',
  finalizing: 'Summarizing',
};

export function RequestProgress({ phase, phaseTrace = [] }: RequestProgressProps) {
  const current = phase ?? phaseTrace[phaseTrace.length - 1] ?? 'thinking';
  const label = PHASE_COPY[current];

  return (
    <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
      <span>{label}</span>
    </div>
  );
}
