'use client';

import { useEffect, useRef } from 'react';

interface VegaEmbedOptions {
  actions?: boolean;
  theme?: 'dark' | 'excel' | 'ggplot2' | 'quartz' | 'vox' | 'fivethirtyeight' | 'latimes' | 'urbaninstitute' | 'googlecharts' | 'powerbi';
  config?: Record<string, unknown>;
}

const DARK_CONFIG: Record<string, unknown> = {
  background: 'transparent',
  axis: { labelColor: '#9ca3af', titleColor: '#9ca3af', gridColor: '#374151' },
  title: { color: '#e2e8f0', fontSize: 13 },
  view: { stroke: 'transparent' },
};

export function useVegaEmbed(
  spec: Record<string, unknown> | undefined | null,
  overrides?: { height?: number | 'container'; options?: VegaEmbedOptions }
) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<{ resize: () => void; finalize: () => void } | null>(null);

  useEffect(() => {
    if (!spec || !ref.current) return;
    let cancelled = false;

    viewRef.current?.finalize();
    viewRef.current = null;

    import('vega-embed').then(({ default: embed }) => {
      if (cancelled || !ref.current) return;
      const merged = { ...spec, width: 'container', height: overrides?.height ?? 320 };
      embed(ref.current, merged as Parameters<typeof embed>[1], {
        actions: false,
        theme: 'dark',
        config: DARK_CONFIG,
        ...overrides?.options,
      })
        .then((result) => {
          if (cancelled) {
            result.finalize();
            return;
          }
          viewRef.current = {
            resize: () => result.view.resize().runAsync(),
            finalize: () => result.finalize(),
          };
        })
        .catch((err) => console.error('vega-embed error:', err));
    });

    return () => {
      cancelled = true;
      viewRef.current?.finalize();
      viewRef.current = null;
    };
  }, [spec, overrides?.height]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      viewRef.current?.resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
