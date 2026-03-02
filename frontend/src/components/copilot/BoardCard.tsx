'use client';

import type { PinnedBoardItem } from '@/src/store/copilotStore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { NarrativeInsightCard } from './NarrativeInsightCard';

interface BoardCardProps {
  item: PinnedBoardItem;
}

function formatPinnedAt(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Asked today';
  if (diffDays === 1) return 'Asked yesterday';
  if (diffDays < 7) return `Asked ${diffDays} days ago`;
  return d.toLocaleDateString();
}

export function BoardCard({ item }: BoardCardProps) {
  const displayTitle = item.title?.trim() || 'Untitled insight';
  const xKey = item.x_axis_key || item.columns[0];
  const yKey = item.y_axis_key || item.columns[1] || item.columns[0];
  const chartData = item.rows.slice(0, 5).map((r) => ({
    name: String(r[xKey] ?? ''),
    value: Number(r[yKey]) ?? 0,
  }));
  const showNarrativeCard = item.visualization_mode === 'narrative' || chartData.length === 0;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--agent-bubble)] overflow-hidden flex flex-col">
      <div className="p-3 border-b border-[var(--border)]">
        <h3 className="font-medium text-[var(--text)] leading-snug line-clamp-2">{displayTitle}</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatPinnedAt(item.pinnedAt)}</p>
      </div>
      <div className="h-32 p-2">
        {showNarrativeCard ? (
          <div className="h-full overflow-auto">
            <NarrativeInsightCard insight={item} compact />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
