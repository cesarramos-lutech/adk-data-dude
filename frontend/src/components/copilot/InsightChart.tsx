'use client';

import { useEffect, useRef } from 'react';
import type { ApiInsight } from '@/src/types/insight';
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
  const vegaRef = useRef<HTMLDivElement>(null);
  const { vega_spec, rows, x_axis_key, y_axis_key } = insight;

  useEffect(() => {
    if (!vega_spec || !vegaRef.current) return;
    const container = vegaRef.current;

    let finalize: (() => void) | undefined;
    import('vega-embed').then(({ default: embed }) => {
      const spec = { ...vega_spec, width: 'container', height: 320 };
      embed(container, spec as Parameters<typeof embed>[1], {
        actions: false,
        theme: 'dark',
        config: {
          background: 'transparent',
          axis: { labelColor: '#9ca3af', titleColor: '#9ca3af', gridColor: '#374151' },
          title: { color: '#e2e8f0', fontSize: 13 },
          view: { stroke: 'transparent' },
        },
      }).then((result) => {
        finalize = () => result.finalize();
      }).catch(console.error);
    });

    return () => finalize?.();
  }, [vega_spec]);

  if (vega_spec) {
    return (
      <div
        ref={vegaRef}
        className="w-full"
        style={{ minHeight: 340 }}
      />
    );
  }

  // Fallback: Recharts bar chart when no Vega spec is available
  if (!rows?.length) {
    return (
      <p className="text-[var(--text-muted)] text-sm">No data to visualize.</p>
    );
  }

  const xKey = x_axis_key || insight.columns[0];
  const yKey = y_axis_key || insight.columns[1] || insight.columns[0];

  const data = rows.map((r) => ({
    name: String(r[xKey] ?? ''),
    value: Number(r[yKey]) ?? 0,
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
