'use client';

import { useState } from 'react';
import { BarChart3, Table, Code, Pin } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';
import { InsightChart } from './InsightChart';
import { InsightTable } from './InsightTable';
import { InsightSql } from './InsightSql';

type TabId = 'chart' | 'table' | 'sql';

export function ActiveInsightView() {
  const [tab, setTab] = useState<TabId>('chart');
  const { currentInsight, pinCurrentToBoard, pinnedBoardItems } = useCopilotStore();

  const isPinned =
    currentInsight &&
    pinnedBoardItems.some(
      (p) => p.title === currentInsight.title && p.sql_query === currentInsight.sql_query
    );

  const handlePin = () => {
    pinCurrentToBoard();
    toastManager.show('Pinned to board!', 'success');
  };

  if (!currentInsight) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        Ask a question in the chat to see an insight here.
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'chart', label: 'Visualization', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'table', label: 'Data Table', icon: <Table className="w-4 h-4" /> },
    { id: 'sql', label: 'SQL Code', icon: <Code className="w-4 h-4" /> },
  ];

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
          disabled={!!isPinned}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            isPinned
              ? 'bg-green-900/30 text-green-400 cursor-default'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Pin className="w-4 h-4" />
          {isPinned ? 'Pinned' : 'Pin to Board'}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {tab === 'chart' && <InsightChart insight={currentInsight} />}
        {tab === 'table' && <InsightTable insight={currentInsight} />}
        {tab === 'sql' && <InsightSql insight={currentInsight} />}
      </div>
    </div>
  );
}
