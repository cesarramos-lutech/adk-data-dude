'use client';

import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';
import { DashboardGrid } from '@/src/components/dashboard/DashboardGrid';

export function MyBoardView() {
  const { pinnedBoardItems, clearBoardWithUndoWindow, restoreClearedBoard } = useCopilotStore();

  const handleClearBoard = () => {
    const ok = window.confirm('Clear all panels from the dashboard?');
    if (!ok) return;
    clearBoardWithUndoWindow(10000);
    toastManager.show({
      message: 'Dashboard cleared. You can undo for 10 seconds.',
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
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="text-4xl">📊</div>
        <div>
          <p className="text-[var(--text)] font-medium text-sm">Your dashboard is empty</p>
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Ask a question, then click "Add to Dashboard" on any Active Insight.
          </p>
        </div>
        <div className="text-xs text-[var(--text-muted)]/60 mt-2">
          Panels are draggable and resizable. Layout is saved automatically.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--text-muted)]">
          {pinnedBoardItems.length} panel{pinnedBoardItems.length !== 1 ? 's' : ''} · Drag to rearrange · Resize from corners
        </span>
        <button
          type="button"
          onClick={handleClearBoard}
          className="text-xs px-2 py-1 rounded-md border border-red-800/50 bg-red-900/20 hover:bg-red-900/30 text-red-200"
        >
          Clear Dashboard
        </button>
      </div>
      <DashboardGrid items={pinnedBoardItems} />
    </div>
  );
}
