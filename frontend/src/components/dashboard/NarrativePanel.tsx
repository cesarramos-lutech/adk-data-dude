'use client';

import type { PinnedBoardItem } from '@/src/store/copilotStore';

export function NarrativePanel({ item }: { item: PinnedBoardItem }) {
  const { insight_summary, key_points, recommended_actions } = item;

  return (
    <div className="h-full overflow-auto p-3 text-sm space-y-2">
      {insight_summary && (
        <p className="text-[var(--text)] text-xs leading-relaxed line-clamp-3">{insight_summary}</p>
      )}
      {key_points && key_points.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Key Points</p>
          <ul className="space-y-1">
            {key_points.map((pt, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--text-muted)]">
                <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
      {recommended_actions && recommended_actions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Actions</p>
          <ul className="space-y-1">
            {recommended_actions.map((action, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--text-muted)]">
                <span className="text-green-400 shrink-0 mt-0.5">→</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!insight_summary && !key_points?.length && !recommended_actions?.length && (
        <p className="text-[var(--text-muted)] text-xs">No narrative available.</p>
      )}
    </div>
  );
}
