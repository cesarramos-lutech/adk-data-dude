'use client';

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import type { ApiInsight } from '@/src/types/insight';
import { toastManager } from '@/src/utils/ToastManager';

interface InsightSqlProps {
  insight: ApiInsight;
}

export function InsightSql({ insight }: InsightSqlProps) {
  const [copied, setCopied] = useState(false);
  const sql = insight.sql_query?.trim() ?? '';
  const sqlStatus = insight.sql_status ?? (sql ? 'derived_from_text' : 'missing_backend');
  const sqlStatusReason = insight.sql_status_reason?.trim();

  const badgeConfig: Record<string, { label: string; className: string }> = {
    available: {
      label: 'SQL available',
      className: 'bg-emerald-900/30 text-emerald-200 border border-emerald-700/40',
    },
    derived_from_text: {
      label: 'SQL derived from response',
      className: 'bg-blue-900/30 text-blue-200 border border-blue-700/40',
    },
    missing_backend: {
      label: 'SQL missing from backend',
      className: 'bg-amber-900/30 text-amber-200 border border-amber-700/40',
    },
    redacted: {
      label: 'SQL redacted',
      className: 'bg-purple-900/30 text-purple-200 border border-purple-700/40',
    },
  };
  const badge = badgeConfig[sqlStatus] ?? badgeConfig.missing_backend;

  if (!sql) {
    return (
      <div className="rounded-md border border-amber-700/30 bg-amber-900/20 px-3 py-2 space-y-2">
        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] ${badge.className}`}>
          {badge.label}
        </span>
        <p className="text-amber-200 text-sm">
          {sqlStatusReason || 'SQL was not provided for this response.'}
        </p>
        {insight.insight_summary ? (
          <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-4">
            Summary excerpt: {insight.insight_summary}
          </p>
        ) : null}
      </div>
    );
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      toastManager.show('SQL copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastManager.show('Failed to copy', 'error');
    }
  }, [sql]);

  return (
    <div className="relative rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="absolute top-2 left-2 z-10">
        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--agent-bubble)] hover:bg-white/10 text-sm text-[var(--text)]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language="sql"
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, paddingTop: 56, paddingBottom: 16, paddingLeft: 16, paddingRight: 16 }}
        showLineNumbers
      >
        {sql}
      </SyntaxHighlighter>
    </div>
  );
}
