'use client';

import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';
import { BoardCard } from './BoardCard';

export function MyBoardView() {
  const { pinnedBoardItems, clearBoardWithUndoWindow, restoreClearedBoard } = useCopilotStore();

  const handleClearBoard = () => {
    const ok = window.confirm('Clear all pinned insights from the board? This cannot be undone.');
    if (!ok) return;
    clearBoardWithUndoWindow(10000);
    toastManager.show({
      message: 'Board cleared. You can undo for 10 seconds.',
      type: 'warning',
      durationMs: 10000,
      action: {
        label: 'Undo',
        onClick: () => restoreClearedBoard(),
      },
    });
  };

  if (pinnedBoardItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
        No pinned insights yet. Click “Pin to Board” on an active insight to add it here.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">My Board</h2>
        <button
          type="button"
          onClick={handleClearBoard}
          className="text-xs px-2 py-1 rounded-md border border-red-800/50 bg-red-900/20 hover:bg-red-900/30 text-red-200"
        >
          Clear Board
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pinnedBoardItems.map((item) => (
          <BoardCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
