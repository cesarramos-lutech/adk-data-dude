'use client';

import { useState } from 'react';
import { BarChart3, Table, Code, Pin, FileText } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';
import { InsightChart } from './InsightChart';
import { InsightTable } from './InsightTable';
import { InsightSql } from './InsightSql';
import { NarrativeInsightCard } from './NarrativeInsightCard';

type TabId = 'insight' | 'chart' | 'table' | 'sql';

export function ActiveInsightView() {
  const [tab, setTab] = useState<TabId>('insight');
  const {
    currentInsight,
    pinCurrentToBoard,
    pinnedBoardItems,
    lastResponseType,
    uiHints,
  } = useCopilotStore();

  const isPinned =
    currentInsight &&
    pinnedBoardItems.some(
      (p) => p.title === currentInsight.title && p.sql_query === currentInsight.sql_query
    );

  const handlePin = () => {
    pinCurrentToBoard();
    toastManager.show('Pinned to board!', 'success');
  };

  if (!currentInsight || lastResponseType === 'message_only') {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        The latest response is narrative-only. Ask for a chart/table/SQL breakdown or click a prior insight card.
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'insight', label: 'Insight', icon: <FileText className="w-4 h-4" /> },
    { id: 'chart', label: 'Visualization', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'table', label: 'Data Table', icon: <Table className="w-4 h-4" /> },
    { id: 'sql', label: 'SQL Code', icon: <Code className="w-4 h-4" /> },
  ];
  const sqlCtaAllowed =
    currentInsight.sql_status === 'available' || currentInsight.sql_status === 'derived_from_text';

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                tab === t.id
                  ? 'bg-[var(--agent-bubble)] text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:bg-white/5'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handlePin}
          disabled={!!isPinned || uiHints?.pin_allowed === false}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            isPinned || uiHints?.pin_allowed === false
              ? 'bg-green-900/30 text-green-400 cursor-default'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Pin className="w-4 h-4" />
          {isPinned ? 'Pinned' : uiHints?.pin_allowed === false ? 'Pin unavailable' : 'Pin to Board'}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {lastResponseType === 'insight_partial' && (
          <div className="mb-3 rounded-md border border-amber-700/30 bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
            Partial insight: some fields are missing. You can still inspect available chart/table/SQL data.
          </div>
        )}
        {tab === 'chart' && sqlCtaAllowed && currentInsight.sql_query?.trim() && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => setTab('sql')}
              className="text-xs px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[var(--text-muted)]"
            >
              View SQL for this visualization
            </button>
          </div>
        )}
        {tab === 'insight' && <NarrativeInsightCard insight={currentInsight} />}
        {tab === 'chart' && <InsightChart insight={currentInsight} />}
        {tab === 'table' && <InsightTable insight={currentInsight} />}
        {tab === 'sql' && <InsightSql insight={currentInsight} />}
      </div>
    </div>
  );
}
