'use client';

import type { PinnedBoardItem } from '@/src/store/copilotStore';
import { useVegaEmbed } from '@/src/hooks/useVegaEmbed';
import { DASHBOARD_MIN_CHART_HEIGHT } from '@/src/lib/chartConstants';
import { humanizeLabel } from '@/src/lib/formatLabel';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function ChartPanel({ item }: { item: PinnedBoardItem }) {
  const vegaRef = useVegaEmbed(item.vega_spec, { height: 'container' });

  if (item.vega_spec) {
    return (
      <div
        ref={vegaRef}
        className="w-full h-full"
        style={{ minHeight: DASHBOARD_MIN_CHART_HEIGHT }}
      />
    );
  }

  const xKey = item.x_axis_key || item.columns?.[0];
  const yKey = item.y_axis_key || item.columns?.[1] || item.columns?.[0];

  if (!xKey || !yKey || !item.rows?.length) {
    return <p className="text-[var(--text-muted)] text-xs p-4">No chart data available.</p>;
  }

  const data = item.rows.slice(0, 50).map((r) => ({
    name: String(r[xKey] ?? ''),
    value: Number(r[yKey]) || 0,
  }));

  if (!data.length) {
    return <p className="text-[var(--text-muted)] text-xs p-4">No chart data.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
        <XAxis
          dataKey="name"
          stroke="#9ca3af"
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          height={60}
          tickFormatter={(v: string) => {
            const h = humanizeLabel(v);
            return h.length > 15 ? h.slice(0, 14) + '\u2026' : h;
          }}
          interval={data.length > 12 ? 1 : 0}
        />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} label={{ value: humanizeLabel(yKey), angle: -90, position: 'insideLeft', style: { fill: '#9ca3af', fontSize: 10 } }} />
        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
        <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
