'use client';

import type { ApiInsight } from '@/src/types/insight';
import { NivoChart } from '@/src/components/charts/NivoChart';

interface InsightChartProps {
  insight: ApiInsight;
}

export function InsightChart({ insight }: InsightChartProps) {
  const { rows, columns, chart_meta } = insight;

  if (!rows?.length) {
    return <p className="text-[var(--text-muted)] text-sm">No data to visualize.</p>;
  }

  return (
    <div className="h-[400px] w-full">
      <NivoChart
        rows={rows}
        columns={columns}
        chartMeta={chart_meta}
      />
    </div>
  );
}
