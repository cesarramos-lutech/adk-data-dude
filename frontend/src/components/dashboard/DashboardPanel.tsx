'use client';

import { useState } from 'react';
import { X, Maximize2, MessageSquare } from 'lucide-react';
import type { PinnedBoardItem } from '@/src/store/copilotStore';
import { useCopilotStore } from '@/src/store/copilotStore';
import { ChartPanel } from './ChartPanel';
import { NarrativePanel } from './NarrativePanel';
import { TablePanel } from './TablePanel';
import { SqlPanel } from './SqlPanel';

const PANEL_ICONS: Record<string, string> = {
  chart: '📊',
  narrative: '📝',
  table: '🗂',
  sql: '💾',
};

interface DashboardPanelProps {
  item: PinnedBoardItem;
}

function ExpandModal({ item, onClose }: { item: PinnedBoardItem; onClose: () => void }) {
  const [tab, setTab] = useState<'chart' | 'narrative' | 'table' | 'sql'>(item.panel_type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[90vw] max-w-5xl h-[80vh] rounded-xl border border-[var(--border)] bg-[var(--chat-bg)] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="font-semibold text-[var(--text)] text-sm">{item.title}</h2>
          <div className="flex items-center gap-2">
            {(['chart', 'narrative', 'table', 'sql'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-2 py-1 rounded text-xs ${tab === t ? 'bg-[var(--agent-bubble)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
              >
                {PANEL_ICONS[t]} {t}
              </button>
            ))}
            <button type="button" onClick={onClose} className="ml-2 p-1 rounded hover:bg-white/10 text-[var(--text-muted)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {tab === 'chart' && <ChartPanel item={item} />}
          {tab === 'narrative' && <NarrativePanel item={item} />}
          {tab === 'table' && <TablePanel item={item} />}
          {tab === 'sql' && <SqlPanel item={item} />}
        </div>
      </div>
    </div>
  );
}

export function DashboardPanel({ item }: DashboardPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { unpinFromBoard, setCurrentInsight, setMainMode } = useCopilotStore();

  const handleFollowUp = () => {
    setCurrentInsight(item);
    setMainMode('insight');
    const input = document.getElementById('chat-input') as HTMLTextAreaElement | null;
    if (input) {
      input.value = `Follow up on: ${item.title} — `;
      input.focus();
    }
  };

  return (
    <>
      <div className="h-full flex flex-col rounded-lg border border-[var(--border)] bg-[var(--agent-bubble)]">
        {/* Drag handle / title bar */}
        <div
          className="drag-handle shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] cursor-grab active:cursor-grabbing select-none"
        >
          <span className="text-sm">{PANEL_ICONS[item.panel_type]}</span>
          <h3 className="flex-1 text-xs font-medium text-[var(--text)] truncate leading-snug">
            {item.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleFollowUp}
              title="Ask follow-up"
              className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              title="Expand"
              className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => unpinFromBoard(item.id)}
              title="Remove"
              className="p-1 rounded hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {item.panel_type === 'chart' && <ChartPanel item={item} />}
          {item.panel_type === 'narrative' && <NarrativePanel item={item} />}
          {item.panel_type === 'table' && <TablePanel item={item} />}
          {item.panel_type === 'sql' && <SqlPanel item={item} />}
        </div>
      </div>

      {expanded && <ExpandModal item={item} onClose={() => setExpanded(false)} />}
    </>
  );
}
