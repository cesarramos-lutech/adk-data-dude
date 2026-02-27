'use client';

import type { ApiInsight } from '@/src/types/insight';
import { BarChart3 } from 'lucide-react';

interface MiniCardProps {
  insight: ApiInsight;
  onClick: () => void;
}

export function MiniCard({ insight, onClick }: MiniCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full text-left rounded-md border border-[var(--border)] bg-black/20 px-3 py-2 hover:bg-black/30 transition-colors flex items-center gap-2"
    >
      <BarChart3 className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
      <span className="text-sm font-medium text-[var(--text)] truncate">
        {insight.title}
      </span>
      <span className="text-xs text-[var(--text-muted)] ml-auto shrink-0">View</span>
    </button>
  );
}
