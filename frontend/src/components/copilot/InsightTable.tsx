'use client';

import type { ApiInsight } from '@/src/types/insight';

interface InsightTableProps {
  insight: ApiInsight;
}

export function InsightTable({ insight }: InsightTableProps) {
  const { columns, rows } = insight;

  if (!rows?.length) {
    return (
      <p className="text-[var(--text-muted)] text-sm">No rows to display.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm text-left">
        <thead className="bg-[var(--agent-bubble)] text-[var(--text-muted)] uppercase tracking-wider">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/5">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2 text-[var(--text)]">
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
