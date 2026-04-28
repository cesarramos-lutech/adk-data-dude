export type CardType = 'metric' | 'chart' | 'narrative';

export interface ChartMeta {
  chart_type: 'bar' | 'line' | 'scatter' | 'pie' | 'table';
  x_col?: string;
  y_col?: string;
  title?: string;
  data?: Record<string, unknown>[];
}

export interface InsightCard {
  id: string;
  type: CardType;
  headline: string;
  narrative: string;
  chart_meta?: ChartMeta;
  /** For metric cards: the hero number */
  metricValue?: string;
  /** For metric cards: percentage or absolute delta */
  metricDelta?: string;
  /** Positive means improvement */
  metricDeltaDirection?: 'up' | 'down' | 'neutral';
  /** The raw SQL query if available (shown in reasoning section) */
  sql?: string;
  /** The user question that produced this card */
  sourceQuestion?: string;
  timestamp: number;
}

export interface PinnedCard extends InsightCard {
  annotation: string;
  pinnedAt: number;
}

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'querying'
  | 'visualizing'
  | 'error';

export type PanelType = 'chart' | 'narrative' | 'table' | 'sql';

/** PRD: POST /api/chat response insight shape */
export interface ApiInsight {
  title: string;
  sql_query: string;
  sql_status?: SqlStatus;
  sql_status_reason?: string;
  query_audit?: QueryAudit;
  columns: string[];
  rows: Record<string, unknown>[];
  suggested_chart_type?: string;
  x_axis_key?: string;
  y_axis_key?: string;
  insight_summary?: string;
  key_points?: string[];
  recommended_actions?: string[];
  visualization_mode?: 'chart' | 'narrative';
  chart_meta?: ChartMeta;
}

export type SqlStatus =
  | 'available'
  | 'missing_backend'
  | 'derived_from_text'
  | 'redacted';

export type QueryComplexity = 'simple' | 'moderate' | 'complex' | 'unknown';

export type QueryErrorCategory =
  | 'sql_syntax'
  | 'not_found'
  | 'permission'
  | 'timeout'
  | 'empty_result'
  | 'backend_unavailable'
  | 'config'
  | 'unknown';

export interface QueryAudit {
  sql?: string;
  referenced_tables?: string[];
  join_count?: number;
  has_limit?: boolean;
  limit_value?: number | null;
  complexity?: QueryComplexity;
  estimated_bytes?: number | null;
  estimated_mb?: number | null;
  cost_note?: string;
  warnings?: string[];
  error_category?: QueryErrorCategory;
  error_message?: string;
  job_id?: string;
  elapsed_ms?: number;
}

export type ResponseType =
  | 'message_only'
  | 'answer'
  | 'insight_partial'
  | 'insight_ready'
  | 'error';

export type StatusPhase =
  | 'thinking'
  | 'querying'
  | 'visualizing'
  | 'finalizing';

export interface UiHints {
  auto_open_insight: boolean;
  pin_allowed: boolean;
  confidence: 'low' | 'medium' | 'high';
  narrative_sql_validated?: boolean;
  suggest_pin?: boolean;
}

export interface ResponseMeta {
  request_id: string;
  elapsed_ms: number;
  app_name: string;
  session_id: string;
  error_category?: QueryErrorCategory;
}
