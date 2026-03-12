'use client';

import type { PinnedBoardItem } from '@/src/store/copilotStore';
import { NivoChart } from '@/src/components/charts/NivoChart';

export function ChartPanel({ item }: { item: PinnedBoardItem }) {
  if (!item.rows?.length && !item.chart_meta) {
    return <p className="text-[var(--text-muted)] text-xs p-4">No chart data available.</p>;
  }

  return (
    <div className="w-full h-full">
      <NivoChart
        rows={item.rows ?? []}
        columns={item.columns ?? []}
        chartMeta={item.chart_meta}
      />
    </div>
  );
}
