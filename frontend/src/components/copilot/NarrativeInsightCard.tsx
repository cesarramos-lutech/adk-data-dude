'use client';

import type { ApiInsight } from '@/src/types/insight';

interface NarrativeInsightCardProps {
  insight: ApiInsight;
  compact?: boolean;
}

export function NarrativeInsightCard({ insight, compact = false }: NarrativeInsightCardProps) {
  const summary =
    insight.insight_summary?.trim() ||
    'No narrative summary provided for this insight.';
  const keyPoints = insight.key_points ?? [];
  const actions = insight.recommended_actions ?? [];
  const summaryClass = compact ? 'line-clamp-4' : '';

  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--agent-bubble)] ${compact ? 'p-3' : 'p-4'}`}>
      <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-[var(--text)]`}>
        {insight.title}
      </h3>
      <p className={`mt-2 text-[var(--text-muted)] ${compact ? 'text-xs' : 'text-sm'} leading-relaxed ${summaryClass}`}>
        {summary}
      </p>

      {keyPoints.length > 0 && (
        <div className="mt-3">
          <p className={`${compact ? 'text-[11px]' : 'text-xs'} uppercase tracking-wide text-[var(--text-muted)]`}>
            Key Points
          </p>
          <ul className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-[var(--text)] space-y-1`}>
            {keyPoints.slice(0, compact ? 3 : 5).map((point, idx) => (
              <li key={`${idx}-${point}`} className="list-disc ml-4">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-3">
          <p className={`${compact ? 'text-[11px]' : 'text-xs'} uppercase tracking-wide text-[var(--text-muted)]`}>
            Recommended Actions
          </p>
          <ul className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-[var(--text)] space-y-1`}>
            {actions.slice(0, compact ? 2 : 4).map((action, idx) => (
              <li key={`${idx}-${action}`} className="list-disc ml-4">
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
