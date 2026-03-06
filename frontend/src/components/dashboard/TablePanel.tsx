'use client';

import type { PinnedBoardItem } from '@/src/store/copilotStore';

export function TablePanel({ item }: { item: PinnedBoardItem }) {
  const { columns, rows } = item;
  if (!rows.length) {
    return <p className="text-[var(--text-muted)] text-xs p-4">No data.</p>;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-[var(--chat-bg)]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left text-[var(--text-muted)] font-medium border-b border-[var(--border)] whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? '' : 'bg-white/[0.02]'}>
              {columns.map((col) => (
                <td key={col} className="px-3 py-1.5 text-[var(--text)] border-b border-[var(--border)]/50 whitespace-nowrap max-w-[200px] truncate">
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
