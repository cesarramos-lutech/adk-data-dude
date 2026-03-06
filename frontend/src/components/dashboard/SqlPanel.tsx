'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { PinnedBoardItem } from '@/src/store/copilotStore';

export function SqlPanel({ item }: { item: PinnedBoardItem }) {
  const [copied, setCopied] = useState(false);
  const sql = item.sql_query;

  if (!sql) {
    return <p className="text-[var(--text-muted)] text-xs p-4">No SQL available.</p>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end p-2 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[var(--text-muted)]"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="text-xs text-[var(--text)] font-mono whitespace-pre-wrap leading-relaxed">{sql}</pre>
      </div>
    </div>
  );
}
