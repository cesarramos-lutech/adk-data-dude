'use client';

import { useCopilotStore } from '@/src/store/copilotStore';
import { BoardCard } from './BoardCard';

export function MyBoardView() {
  const { pinnedBoardItems } = useCopilotStore();

  if (pinnedBoardItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        No pinned insights yet. Click “Pin to Board” on an active insight to add it here.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pinnedBoardItems.map((item) => (
          <BoardCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
