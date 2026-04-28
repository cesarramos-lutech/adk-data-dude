'use client';

import { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { ResponsivePie } from '@nivo/pie';
import type { ChartMeta } from '@/src/types/insight';
import { darkTheme, CHART_COLORS } from './nivoTheme';
import { humanizeLabel } from '@/src/lib/formatLabel';

const TEMPORAL_HINTS = /^(date|time|month|year|week|period|quarter|day)/i;

function inferChartType(
  columns: string[],
  rows: Record<string, unknown>[],
): 'bar' | 'line' | 'scatter' | 'pie' {
  if (rows.length === 0) return 'bar';
  const numericCols = columns.filter((c) => rows.some((r) => typeof r[c] === 'number'));
  if (numericCols.length === 0) return 'bar';
  const temporalCols = columns.filter((c) => TEMPORAL_HINTS.test(c));
  if (temporalCols.length > 0 && numericCols.length > 0) return 'line';
  if (numericCols.length >= 2 && temporalCols.length === 0) return 'scatter';
  return 'bar';
}

function resolveChartType(
  chartMeta: ChartMeta | undefined,
  columns: string[],
  rows: Record<string, unknown>[],
): 'bar' | 'line' | 'scatter' | 'pie' {
  if (chartMeta?.chart_type && chartMeta.chart_type !== 'table') {
    return chartMeta.chart_type;
  }
  return inferChartType(columns, rows);
}

function pickAxes(
  chartMeta: ChartMeta | undefined,
  columns: string[],
  rows: Record<string, unknown>[],
): { x: string; y: string } {
  if (chartMeta?.x_col && chartMeta?.y_col) {
    return { x: chartMeta.x_col, y: chartMeta.y_col };
  }
  const numeric = columns.find((c) => rows.some((r) => typeof r[c] === 'number'));
  const categorical = columns.find((c) => rows.some((r) => typeof r[c] === 'string'));
  return {
    x: chartMeta?.x_col ?? categorical ?? columns[0] ?? 'x',
    y: chartMeta?.y_col ?? numeric ?? columns[1] ?? columns[0] ?? 'y',
  };
}

interface NivoChartProps {
  rows: Record<string, unknown>[];
  columns: string[];
  chartMeta?: ChartMeta;
  compact?: boolean;
}

export function NivoChart({ rows, columns, chartMeta, compact = false }: NivoChartProps) {
  const effectiveRows = rows.length > 0 ? rows : (chartMeta?.data ?? []);
  const effectiveColumns = columns.length > 0 ? columns : Object.keys(effectiveRows[0] ?? {});

  const chartType = resolveChartType(chartMeta, effectiveColumns, effectiveRows);
  const axes = pickAxes(chartMeta, effectiveColumns, effectiveRows);

  const trimmedRows = useMemo(() => effectiveRows.slice(0, compact ? 30 : 500), [effectiveRows, compact]);

  if (trimmedRows.length === 0) {
    return <p className="text-[var(--text-muted)] text-xs p-4">No chart data available.</p>;
  }

  switch (chartType) {
    case 'bar':
      return <NivoBar rows={trimmedRows} xKey={axes.x} yKey={axes.y} compact={compact} />;
    case 'line':
      return <NivoLine rows={trimmedRows} xKey={axes.x} yKey={axes.y} compact={compact} />;
    case 'scatter':
      return <NivoScatter rows={trimmedRows} xKey={axes.x} yKey={axes.y} compact={compact} />;
    case 'pie':
      return <NivoPie rows={trimmedRows} xKey={axes.x} yKey={axes.y} compact={compact} />;
    default:
      return <NivoBar rows={trimmedRows} xKey={axes.x} yKey={axes.y} compact={compact} />;
  }
}

interface SubChartProps {
  rows: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  compact: boolean;
}

function NivoBar({ rows, xKey, yKey, compact }: SubChartProps) {
  const data = useMemo(
    () =>
      rows.map((r) => ({
        label: String(r[xKey] ?? ''),
        [yKey]: Number(r[yKey]) || 0,
      })),
    [rows, xKey, yKey],
  );

  return (
    <ResponsiveBar
      data={data}
      keys={[yKey]}
      indexBy="label"
      margin={compact
        ? { top: 8, right: 8, bottom: 40, left: 50 }
        : { top: 16, right: 16, bottom: 60, left: 60 }
      }
      padding={0.3}
      colors={CHART_COLORS}
      borderRadius={3}
      enableLabel={false}
      enableGridY={true}
      enableGridX={false}
      theme={darkTheme}
      animate={true}
      motionConfig="gentle"
      axisBottom={{
        tickSize: 4,
        tickPadding: 4,
        tickRotation: data.length > 8 ? -45 : 0,
        format: (v: string) => {
          const h = humanizeLabel(v);
          return h.length > 12 ? h.slice(0, 11) + '\u2026' : h;
        },
      }}
      axisLeft={{
        tickSize: 4,
        tickPadding: 4,
        legend: compact ? undefined : humanizeLabel(yKey),
        legendPosition: 'middle',
        legendOffset: -50,
      }}
      tooltip={({ id, value, indexValue }) => (
        <div className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-md shadow-lg text-xs">
          <strong className="text-gray-200">{humanizeLabel(String(indexValue))}</strong>
          <br />
          <span className="text-gray-400">{humanizeLabel(String(id))}:</span>{' '}
          <span className="text-white">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        </div>
      )}
    />
  );
}

function NivoLine({ rows, xKey, yKey, compact }: SubChartProps) {
  const data = useMemo(
    () => [
      {
        id: humanizeLabel(yKey),
        data: rows.map((r) => ({
          x: String(r[xKey] ?? ''),
          y: Number(r[yKey]) || 0,
        })),
      },
    ],
    [rows, xKey, yKey],
  );

  return (
    <ResponsiveLine
      data={data}
      margin={compact
        ? { top: 8, right: 8, bottom: 40, left: 50 }
        : { top: 16, right: 16, bottom: 60, left: 60 }
      }
      colors={CHART_COLORS}
      theme={darkTheme}
      animate={true}
      motionConfig="gentle"
      enablePoints={!compact}
      pointSize={6}
      pointColor={{ from: 'color' }}
      pointBorderWidth={2}
      pointBorderColor={{ from: 'serieColor' }}
      enableGridX={false}
      enableGridY={true}
      curve="monotoneX"
      axisBottom={{
        tickSize: 4,
        tickPadding: 4,
        tickRotation: rows.length > 8 ? -45 : 0,
        format: (v: string) => {
          const h = humanizeLabel(v);
          return h.length > 12 ? h.slice(0, 11) + '\u2026' : h;
        },
      }}
      axisLeft={{
        tickSize: 4,
        tickPadding: 4,
        legend: compact ? undefined : humanizeLabel(yKey),
        legendPosition: 'middle',
        legendOffset: -50,
      }}
      useMesh={true}
      tooltip={({ point }) => (
        <div className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-md shadow-lg text-xs">
          <strong className="text-gray-200">{String(point.data.x)}</strong>
          <br />
          <span className="text-gray-400">{point.seriesId}:</span>{' '}
          <span className="text-white">{typeof point.data.y === 'number' ? point.data.y.toLocaleString() : point.data.y}</span>
        </div>
      )}
    />
  );
}

function NivoScatter({ rows, xKey, yKey, compact }: SubChartProps) {
  const data = useMemo(
    () => [
      {
        id: `${humanizeLabel(yKey)} vs ${humanizeLabel(xKey)}`,
        data: rows.map((r) => ({
          x: Number(r[xKey]) || 0,
          y: Number(r[yKey]) || 0,
        })),
      },
    ],
    [rows, xKey, yKey],
  );

  return (
    <ResponsiveScatterPlot
      data={data}
      margin={compact
        ? { top: 8, right: 8, bottom: 40, left: 50 }
        : { top: 16, right: 16, bottom: 60, left: 60 }
      }
      colors={CHART_COLORS}
      theme={darkTheme}
      animate={true}
      motionConfig="gentle"
      nodeSize={compact ? 4 : 8}
      axisBottom={{
        tickSize: 4,
        tickPadding: 4,
        legend: compact ? undefined : humanizeLabel(xKey),
        legendPosition: 'middle',
        legendOffset: 46,
      }}
      axisLeft={{
        tickSize: 4,
        tickPadding: 4,
        legend: compact ? undefined : humanizeLabel(yKey),
        legendPosition: 'middle',
        legendOffset: -50,
      }}
      tooltip={({ node }) => (
        <div className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-md shadow-lg text-xs">
          <span className="text-gray-400">{humanizeLabel(xKey)}:</span>{' '}
          <span className="text-white">{Number(node.data.x).toLocaleString()}</span>
          <br />
          <span className="text-gray-400">{humanizeLabel(yKey)}:</span>{' '}
          <span className="text-white">{Number(node.data.y).toLocaleString()}</span>
        </div>
      )}
    />
  );
}

function NivoPie({ rows, xKey, yKey, compact }: SubChartProps) {
  const data = useMemo(
    () =>
      rows.slice(0, 10).map((r) => ({
        id: String(r[xKey] ?? ''),
        label: humanizeLabel(String(r[xKey] ?? '')),
        value: Number(r[yKey]) || 0,
      })),
    [rows, xKey, yKey],
  );

  return (
    <ResponsivePie
      data={data}
      margin={compact
        ? { top: 8, right: 8, bottom: 8, left: 8 }
        : { top: 20, right: 80, bottom: 20, left: 80 }
      }
      colors={CHART_COLORS}
      theme={darkTheme}
      animate={true}
      motionConfig="gentle"
      innerRadius={0.5}
      padAngle={1.5}
      cornerRadius={4}
      borderWidth={1}
      borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
      enableArcLabels={!compact}
      arcLabel="formattedValue"
      arcLabelsSkipAngle={15}
      arcLabelsTextColor={{ from: 'color', modifiers: [['brighter', 3]] }}
      enableArcLinkLabels={!compact}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor="#9ca3af"
      arcLinkLabelsColor={{ from: 'color' }}
      tooltip={({ datum }) => (
        <div className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-md shadow-lg text-xs">
          <strong className="text-gray-200">{datum.label}</strong>
          <br />
          <span className="text-white">{datum.value.toLocaleString()}</span>
          <span className="text-gray-400 ml-1">({((datum.arc.endAngle - datum.arc.startAngle) / (2 * Math.PI) * 100).toFixed(1)}%)</span>
        </div>
      )}
    />
  );
}
