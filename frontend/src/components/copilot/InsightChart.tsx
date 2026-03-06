'use client';

import type { ApiInsight } from '@/src/types/insight';
import { useVegaEmbed } from '@/src/hooks/useVegaEmbed';
import { COPILOT_CHART_HEIGHT } from '@/src/lib/chartConstants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface InsightChartProps {
  insight: ApiInsight;
}

export function InsightChart({ insight }: InsightChartProps) {
  const { vega_spec, rows, x_axis_key, y_axis_key, columns } = insight;
  const vegaRef = useVegaEmbed(vega_spec, { height: COPILOT_CHART_HEIGHT });

  if (vega_spec) {
    return (
      <div
        ref={vegaRef}
        className="w-full"
        style={{ minHeight: COPILOT_CHART_HEIGHT + 20 }}
      />
    );
  }

  if (!rows?.length) {
    return (
      <p className="text-[var(--text-muted)] text-sm">No data to visualize.</p>
    );
  }

  const xKey = x_axis_key || columns?.[0];
  const yKey = y_axis_key || columns?.[1] || columns?.[0];

  if (!xKey || !yKey) {
    return (
      <p className="text-[var(--text-muted)] text-sm">No chart data available.</p>
    );
  }

  const data = rows.map((r) => ({
    name: String(r[xKey] ?? ''),
    value: Number(r[yKey]) || 0,
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
