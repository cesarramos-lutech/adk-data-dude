'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Presentation, X, Trash2, LayoutGrid } from 'lucide-react';
import { useCopilotStore } from '@/src/store/copilotStore';
import { toastManager } from '@/src/utils/ToastManager';
import { DashboardGrid } from '@/src/components/dashboard/DashboardGrid';

export function MyBoardView() {
  const { pinnedBoardItems, clearBoardWithUndoWindow, restoreClearedBoard } = useCopilotStore();
  const [presenting, setPresenting] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const exitPresent = useCallback(() => setPresenting(false), []);

  useEffect(() => {
    if (!presenting) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitPresent();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [presenting, exitPresent]);

  const handleClearBoard = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      clearTimerRef.current = setTimeout(() => setConfirmingClear(false), 3000);
      return;
    }
    clearTimeout(clearTimerRef.current);
    setConfirmingClear(false);
    clearBoardWithUndoWindow(10000);
    toastManager.show({
      message: 'Board cleared',
      type: 'info',
      durationMs: 10000,
      action: {
        label: 'Undo',
        onClick: () => restoreClearedBoard(),
      },
    });
  };

  if (pinnedBoardItems.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 text-center p-8">
        <LayoutGrid className="w-10 h-10 text-[var(--text-muted)] opacity-30" />
        <div>
          <p className="text-[var(--text)] font-medium text-sm">Build your story</p>
          <p className="text-[var(--text-muted)] text-xs mt-1.5 max-w-[260px]">
            Pin insights from the chat to create a custom board. Drag to arrange, resize to emphasize.
          </p>
        </div>
      </div>
    );
  }

  if (presenting) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--canvas-bg)] flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold text-[var(--text)]">Data Dude Board</span>
          <button
            type="button"
            onClick={exitPresent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Exit (Esc)
          </button>
        </div>
        <div className="flex-1 overflow-auto px-4">
          <DashboardGrid items={pinnedBoardItems} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--text-muted)]">
          {pinnedBoardItems.length} panel{pinnedBoardItems.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPresenting(true)}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors"
          >
            <Presentation className="w-3 h-3" />
            Present
          </button>
          <button
            type="button"
            onClick={handleClearBoard}
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${
              confirmingClear
                ? 'border-red-500 bg-red-600/30 text-red-100 animate-pulse'
                : 'border-red-800/50 bg-red-900/20 hover:bg-red-900/30 text-red-200'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            {confirmingClear ? 'Tap again' : 'Clear'}
          </button>
        </div>
      </div>
      <DashboardGrid items={pinnedBoardItems} />
    </div>
  );
}
