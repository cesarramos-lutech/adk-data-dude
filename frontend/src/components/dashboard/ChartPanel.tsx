'use client';

import { useEffect, useRef } from 'react';
import type { PinnedBoardItem } from '@/src/store/copilotStore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function ChartPanel({ item }: { item: PinnedBoardItem }) {
  const vegaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item.vega_spec || !vegaRef.current) return;
    const container = vegaRef.current;
    let finalize: (() => void) | undefined;

    import('vega-embed').then(({ default: embed }) => {
      const spec = { ...item.vega_spec, width: 'container', height: 'container' };
      embed(container, spec as Parameters<typeof embed>[1], {
        actions: false,
        theme: 'dark',
        config: {
          background: 'transparent',
          axis: { labelColor: '#9ca3af', titleColor: '#9ca3af', gridColor: '#374151' },
          title: { color: '#e2e8f0', fontSize: 12 },
          view: { stroke: 'transparent' },
        },
      }).then((result) => {
        finalize = () => result.finalize();
      }).catch(console.error);
    });

    return () => finalize?.();
  }, [item.vega_spec]);

  if (item.vega_spec) {
    return <div ref={vegaRef} className="w-full h-full" />;
  }

  // Recharts fallback
  const xKey = item.x_axis_key || item.columns[0];
  const yKey = item.y_axis_key || item.columns[1] || item.columns[0];
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
        <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={40} />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
        <Bar dataKey="value" fill="#3b82f6" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
