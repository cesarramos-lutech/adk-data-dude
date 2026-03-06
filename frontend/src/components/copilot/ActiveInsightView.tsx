'use client';

import { useState } from 'react';
import { BarChart3, Table, Code, LayoutGrid, FileText } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';
import { InsightChart } from './InsightChart';
import { InsightTable } from './InsightTable';
import { InsightSql } from './InsightSql';
import { NarrativeInsightCard } from './NarrativeInsightCard';
import type { PanelType } from '@/src/types/insight';

type TabId = 'insight' | 'chart' | 'table' | 'sql';

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-white/5 ${className ?? ''}`} />
  );
}

function SkeletonInsight() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonBlock className="h-5 w-2/3" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-4/5" />
      <SkeletonBlock className="h-3 w-3/4" />
      <div className="pt-2 space-y-2">
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-3 w-2/3" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="p-4 space-y-3">
      <SkeletonBlock className="h-[320px] w-full" />
      <div className="flex justify-center gap-2">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="p-4 space-y-2">
      <SkeletonBlock className="h-8 w-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-7 w-full" />
      ))}
    </div>
  );
}

const PANEL_TYPES: { type: PanelType; label: string; icon: string }[] = [
  { type: 'chart', label: 'Chart', icon: '📊' },
  { type: 'narrative', label: 'Narrative', icon: '📝' },
  { type: 'table', label: 'Data Table', icon: '🗂' },
  { type: 'sql', label: 'SQL', icon: '💾' },
];

function PanelTypePicker({ onSelect, onClose }: { onSelect: (t: PanelType) => void; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-[var(--border)] bg-[var(--chat-bg)] shadow-xl p-2 flex gap-2">
      {PANEL_TYPES.map((pt) => (
        <button
          key={pt.type}
          type="button"
          onClick={() => { onSelect(pt.type); onClose(); }}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs hover:bg-white/10 text-[var(--text)] transition-colors"
        >
          <span className="text-lg">{pt.icon}</span>
          {pt.label}
        </button>
      ))}
    </div>
  );
}

export function ActiveInsightView() {
  const [tab, setTab] = useState<TabId>('chart');
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    currentInsight,
    pinCurrentToBoard,
    pinnedBoardItems,
    lastResponseType,
    uiHints,
    isSending,
  } = useCopilotStore();

  const isPinned =
    currentInsight &&
    pinnedBoardItems.some(
      (p) => p.title === currentInsight.title && p.sql_query === currentInsight.sql_query
    );

  const handlePin = (panelType: PanelType) => {
    pinCurrentToBoard(panelType);
    toastManager.show(`Added to Dashboard as ${panelType}!`, 'success');
    setPickerOpen(false);
  };

  if (isSending) {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <div className="flex gap-1">
            {['Insight', 'Visualization', 'Data Table', 'SQL Code'].map((label) => (
              <div key={label} className="animate-pulse h-8 w-24 rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="animate-pulse h-8 w-32 rounded-lg bg-white/5" />
        </div>
        <div className="flex-1 overflow-auto">
          {tab === 'chart' ? <SkeletonChart /> : tab === 'table' ? <SkeletonTable /> : <SkeletonInsight />}
        </div>
      </div>
    );
  }

  if (!currentInsight || lastResponseType === 'message_only') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-[var(--text-muted)] text-sm max-w-sm">
          Ask a question about your data to see a chart, table, and analysis here.
        </div>
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm text-xs text-left">
          {[
            'Top 10 products by revenue this quarter',
            'Monthly sales trend for last 12 months',
            'Revenue breakdown by category',
            'Which customers have the highest order value?',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                const input = document.getElementById('chat-input') as HTMLTextAreaElement | null;
                if (input) {
                  input.value = suggestion;
                  input.focus();
                }
              }}
              className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text)] transition-colors text-left leading-snug"
            >
              {suggestion}
            </button>
          ))}
        </div>
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
        <div className="relative">
          {isPinned ? (
            <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-900/30 text-green-400">
              <LayoutGrid className="w-4 h-4" />
              On Dashboard
            </span>
          ) : uiHints?.pin_allowed === false ? (
            <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] cursor-default">
              <LayoutGrid className="w-4 h-4" />
              Unavailable
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LayoutGrid className="w-4 h-4" />
              Add to Dashboard
            </button>
          )}
          {pickerOpen && (
            <PanelTypePicker
              onSelect={handlePin}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
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
