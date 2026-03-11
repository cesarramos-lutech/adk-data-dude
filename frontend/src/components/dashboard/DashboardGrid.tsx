'use client';

import { useCallback, useState } from 'react';
import { GridLayout, type Layout, type LayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { PinnedBoardItem } from '@/src/store/copilotStore';
import { DashboardPanel } from './DashboardPanel';

const STORAGE_KEY = 'copilot_dashboard_layout_v2';

function loadLayout(): Record<string, Omit<LayoutItem, 'i'>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    const raw = localStorage.getItem(STORAGE_KEY);
    console.error('DashboardGrid: failed to parse layout from localStorage', raw, err);
    return {};
  }
}

function saveLayout(layouts: Record<string, Omit<LayoutItem, 'i'>>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch (err) {
    console.error('DashboardGrid: failed to save layout', err);
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      import('@/src/utils/ToastManager').then(({ toastManager }) =>
        toastManager.show('Storage quota exceeded. Dashboard layout changes may not persist.', 'warning')
      );
    }
  }
}

export function DashboardGrid({ items }: { items: PinnedBoardItem[] }) {
  const [savedLayouts, setSavedLayouts] = useState<Record<string, Omit<LayoutItem, 'i'>>>(loadLayout);
  const [containerWidth, setContainerWidth] = useState(800);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setContainerWidth(node.offsetWidth);
  }, []);

  const layout: LayoutItem[] = items.map((item, idx) => {
    const saved = savedLayouts[item.id];
    if (saved) return { i: item.id, ...saved, minW: 3, minH: 2 };
    const col = (idx % 2) * 6;
    const row = Math.floor(idx / 2) * 5;
    return {
      i: item.id,
      x: col,
      y: row,
      w: 6,
      h: item.panel_type === 'chart' ? 4 : item.panel_type === 'table' ? 5 : 3,
      minW: 3,
      minH: 2,
    };
  });

  const handleLayoutChange = (newLayout: Layout) => {
    const map: Record<string, Omit<LayoutItem, 'i'>> = {};
    for (const l of newLayout) {
      map[l.i] = { x: l.x, y: l.y, w: l.w, h: l.h };
    }
    const merged = { ...savedLayouts, ...map };
    setSavedLayouts(merged);
    saveLayout(merged);
  };

  return (
    <div ref={containerRef} className="w-full">
      <GridLayout
        layout={layout}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        gridConfig={{
          cols: 12,
          rowHeight: 80,
          margin: [12, 12],
          containerPadding: [0, 0],
        }}
        dragConfig={{
          enabled: true,
          bounded: false,
          handle: '.drag-handle',
        }}
        resizeConfig={{
          enabled: true,
          handles: ['se'],
        }}
      >
        {items.map((item) => (
          <div key={item.id}>
            <DashboardPanel item={item} />
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
