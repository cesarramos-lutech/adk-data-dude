'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Table, Code, Pin, Check, FileText } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';
import { InsightChart } from './InsightChart';
import { InsightTable } from './InsightTable';
import { InsightSql } from './InsightSql';
import { NarrativeInsightCard } from './NarrativeInsightCard';

type TabId = 'insight' | 'chart' | 'table' | 'sql';

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-white/5 ${className ?? ''}`} />
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

function SkeletonInsight() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonBlock className="h-5 w-2/3" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-4/5" />
      <SkeletonBlock className="h-3 w-3/4" />
    </div>
  );
}

function autoSelectTab(insight: { chart_meta?: unknown; rows: unknown[]; columns: string[]; insight_summary?: string }): TabId {
  if (insight.chart_meta) return 'chart';
  if (insight.rows.length > 0 && insight.columns.length > 0) return 'table';
  if (insight.insight_summary) return 'insight';
  return 'chart';
}

export function ActiveInsightView() {
  const {
    currentInsight,
    pinInsightToBoard,
    pinnedBoardItems,
    lastResponseType,
    isSending,
    setMainMode,
  } = useCopilotStore();

  const [tab, setTab] = useState<TabId>('chart');
  const [justPinned, setJustPinned] = useState(false);

  useEffect(() => {
    if (currentInsight) {
      setTab(autoSelectTab(currentInsight));
      setJustPinned(false);
    }
  }, [currentInsight]);

  const isPinned =
    currentInsight &&
    pinnedBoardItems.some(
      (p) => p.title === currentInsight.title && p.sql_query === currentInsight.sql_query
    );

  const handlePin = () => {
    if (!currentInsight) return;
    pinInsightToBoard(currentInsight);
    setJustPinned(true);
    toastManager.show('Insight saved to board', 'success');
    setTimeout(() => setJustPinned(false), 2000);
  };

  if (isSending) {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <div className="flex gap-1">
            {['Insight', 'Chart', 'Table', 'SQL'].map((label) => (
              <div key={label} className="animate-pulse h-8 w-20 rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="animate-pulse h-8 w-28 rounded-lg bg-white/5" />
        </div>
        <div className="flex-1 overflow-auto">
          {tab === 'chart' ? <SkeletonChart /> : tab === 'table' ? <SkeletonTable /> : <SkeletonInsight />}
        </div>
      </div>
    );
  }

  if (!currentInsight || lastResponseType === 'message_only' || lastResponseType === 'answer') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center" id="empty-insight-view">
        <div className="text-[var(--text-muted)] text-sm max-w-sm">
          {lastResponseType === 'answer'
            ? 'Your answer is in the chat. Ask an analytical question to see charts and insights here.'
            : 'Ask a question about your data to see charts, tables, and analysis here.'}
        </div>
      </div>
    );
  }

  const hasChart = !!currentInsight.chart_meta || (currentInsight.rows.length > 0 && currentInsight.columns.length > 1);
  const hasTable = currentInsight.rows.length > 0 && currentInsight.columns.length > 0;
  const hasSql = !!currentInsight.sql_query?.trim();
  const hasNarrative = !!currentInsight.insight_summary;

  const tabs: { id: TabId; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'insight', label: 'Insight', icon: <FileText className="w-4 h-4" />, visible: hasNarrative },
    { id: 'chart', label: 'Chart', icon: <BarChart3 className="w-4 h-4" />, visible: hasChart || hasTable },
    { id: 'table', label: 'Table', icon: <Table className="w-4 h-4" />, visible: hasTable },
    { id: 'sql', label: 'SQL', icon: <Code className="w-4 h-4" />, visible: hasSql },
  ];
  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <div className="flex gap-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <div>
          {isPinned || justPinned ? (
            <button
              type="button"
              onClick={() => setMainMode('board')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-900/30 text-green-400 hover:bg-green-900/40 transition-colors"
            >
              <Check className="w-4 h-4" />
              Saved
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePin}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Pin className="w-4 h-4" />
              Save insight
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {lastResponseType === 'insight_partial' && (
          <div className="mb-3 rounded-md border border-amber-700/30 bg-amber-900/20 px-3 py-2 text-xs text-amber-200">
            Partial data — some fields may be missing.
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
