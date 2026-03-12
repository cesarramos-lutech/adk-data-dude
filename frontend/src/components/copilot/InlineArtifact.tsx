'use client';

import { useState } from 'react';
import { BarChart3, Pin, Maximize2, Check, Table, FileText } from 'lucide-react';
import type { ApiInsight } from '@/src/types/insight';
import { NivoChart } from '@/src/components/charts/NivoChart';
import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';

interface InlineArtifactProps {
  insight: ApiInsight;
  onExpand: () => void;
  compact?: boolean;
}

function MiniTablePreview({ insight }: { insight: ApiInsight }) {
  const previewRows = insight.rows.slice(0, 3);
  const cols = insight.columns.slice(0, 4);
  if (cols.length === 0 || previewRows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded border border-white/5">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10">
            {cols.map((c) => (
              <th key={c} className="px-2 py-1 text-left font-medium text-[var(--text-muted)]">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1 text-[var(--text)]">
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {insight.rows.length > 3 && (
        <p className="px-2 py-1 text-[10px] text-[var(--text-muted)]">
          +{insight.rows.length - 3} more rows
        </p>
      )}
    </div>
  );
}

export function InlineArtifact({ insight, onExpand, compact = false }: InlineArtifactProps) {
  const { pinInsightToBoard, pinnedBoardItems, setMainMode } = useCopilotStore();
  const [justPinned, setJustPinned] = useState(false);

  const isPinned = pinnedBoardItems.some(
    (p) => p.title === insight.title && p.sql_query === insight.sql_query
  );

  const handlePin = () => {
    pinInsightToBoard(insight);
    setJustPinned(true);
    toastManager.show('Added to board', 'success');
    setTimeout(() => setJustPinned(false), 2000);
  };

  const handleViewBoard = () => {
    setMainMode('board');
  };

  const hasChart = !!insight.chart_meta || (insight.rows.length > 0 && insight.columns.length > 1);
  const hasTable = insight.rows.length > 0 && insight.columns.length > 0;
  const hasNarrative = !!insight.insight_summary;

  const icon = hasChart ? (
    <BarChart3 className="w-3.5 h-3.5" />
  ) : hasTable ? (
    <Table className="w-3.5 h-3.5" />
  ) : (
    <FileText className="w-3.5 h-3.5" />
  );

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-black/20 overflow-hidden animate-fade-in-up">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-sm font-medium text-[var(--text)] truncate flex-1">
          {insight.title}
        </span>
      </div>

      {hasChart && (
        <div className="px-2 py-2 h-[180px]">
          <NivoChart
            rows={insight.rows}
            columns={insight.columns}
            chartMeta={insight.chart_meta}
            compact
          />
        </div>
      )}
      {!hasChart && hasTable && (
        <div className="px-2 py-2">
          <MiniTablePreview insight={insight} />
        </div>
      )}
      {!hasChart && !hasTable && hasNarrative && (
        <div className="px-3 py-2">
          <p className="text-xs text-[var(--text-muted)] line-clamp-3">
            {insight.insight_summary}
          </p>
        </div>
      )}

      {!compact && (
        <div className="px-3 py-2 flex items-center gap-2 border-t border-white/5">
          <button
            type="button"
            onClick={onExpand}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)] transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            Expand
          </button>
          {isPinned || justPinned ? (
            <button
              type="button"
              onClick={handleViewBoard}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-green-400 bg-green-900/20 hover:bg-green-900/30 transition-colors ml-auto"
            >
              <Check className="w-3 h-3" />
              On board
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePin}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors ml-auto"
            >
              <Pin className="w-3 h-3" />
              Pin to board
            </button>
          )}
        </div>
      )}
    </div>
  );
}
