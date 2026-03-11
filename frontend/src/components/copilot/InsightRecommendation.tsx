'use client';

import { useState } from 'react';
import { Lightbulb, Pin, Check } from 'lucide-react';
import type { ApiInsight } from '@/src/types/insight';
import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';

interface InsightRecommendationProps {
  insight: ApiInsight;
}

function condenseSummary(insight: ApiInsight): string {
  const summary = insight.insight_summary?.trim() ?? '';
  const firstSentence = summary.split(/(?<=[.!?])\s+/)[0] ?? summary;
  const truncated = firstSentence.length > 160
    ? firstSentence.slice(0, 157) + '...'
    : firstSentence;
  return truncated;
}

function condenseKeyPoints(insight: ApiInsight): string[] {
  return (insight.key_points ?? []).slice(0, 2);
}

export function InsightRecommendation({ insight }: InsightRecommendationProps) {
  const { pinInsightToBoard, pinnedBoardItems, setMainMode } = useCopilotStore();
  const [justPinned, setJustPinned] = useState(false);

  const isPinned = pinnedBoardItems.some(
    (p) => p.title === insight.title && p.sql_query === insight.sql_query,
  );

  const handlePin = () => {
    const condensed: ApiInsight = {
      ...insight,
      insight_summary: condenseSummary(insight),
      key_points: condenseKeyPoints(insight),
      recommended_actions: (insight.recommended_actions ?? []).slice(0, 2),
    };
    pinInsightToBoard(condensed, 'narrative');
    setJustPinned(true);
    toastManager.show('Insight pinned to board', 'success');
    setTimeout(() => setJustPinned(false), 2500);
  };

  const summary = condenseSummary(insight);
  const points = condenseKeyPoints(insight);

  return (
    <div className="mt-2 rounded-lg border border-amber-700/30 bg-amber-900/10 px-3 py-2.5 animate-fade-in-up">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-amber-300 uppercase tracking-wide mb-1">
            Key finding
          </p>
          <p className="text-xs text-[var(--text)] leading-relaxed line-clamp-2">
            {summary}
          </p>
          {points.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {points.map((pt, i) => (
                <li key={i} className="text-[11px] text-[var(--text-muted)] flex gap-1.5">
                  <span className="text-amber-400 shrink-0">•</span>
                  <span className="line-clamp-1">{pt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0 ml-2">
          {isPinned || justPinned ? (
            <button
              type="button"
              onClick={() => setMainMode('board')}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-green-900/30 text-green-400 hover:bg-green-900/40 transition-colors"
            >
              <Check className="w-3 h-3" />
              Pinned
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePin}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-amber-700/30 text-amber-300 hover:bg-amber-700/50 transition-colors"
            >
              <Pin className="w-3 h-3" />
              Pin insight
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
