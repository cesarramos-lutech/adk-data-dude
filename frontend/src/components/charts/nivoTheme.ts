import type { Theme } from '@nivo/core';

export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

export const darkTheme: Theme = {
  background: 'transparent',
  text: {
    fontSize: 11,
    fill: '#9ca3af',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  axis: {
    domain: { line: { stroke: '#4b5563', strokeWidth: 1 } },
    legend: { text: { fontSize: 11, fill: '#9ca3af' } },
    ticks: {
      line: { stroke: '#4b5563', strokeWidth: 1 },
      text: { fontSize: 10, fill: '#9ca3af' },
    },
  },
  grid: {
    line: { stroke: '#374151', strokeWidth: 1 },
  },
  crosshair: {
    line: { stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '4 4' },
  },
  tooltip: {
    container: {
      background: '#1f2937',
      color: '#e5e7eb',
      fontSize: 12,
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      border: '1px solid #374151',
    },
  },
  labels: {
    text: { fontSize: 11, fill: '#e5e7eb' },
  },
  legends: {
    text: { fontSize: 11, fill: '#9ca3af' },
  },
};
