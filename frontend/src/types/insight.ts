export type CardType = 'metric' | 'chart' | 'narrative';

export interface InsightCard {
  id: string;
  type: CardType;
  headline: string;
  narrative: string;
  /** Vega-Lite spec JSON object when type === 'chart' */
  chartSpec?: Record<string, unknown>;
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
  columns: string[];
  rows: Record<string, unknown>[];
  suggested_chart_type?: string;
  x_axis_key?: string;
  y_axis_key?: string;
  insight_summary?: string;
  key_points?: string[];
  recommended_actions?: string[];
  visualization_mode?: 'chart' | 'narrative';
  /** Vega-Lite spec from build_dashboard tool */
  vega_spec?: Record<string, unknown>;
}

export type SqlStatus =
  | 'available'
  | 'missing_backend'
  | 'derived_from_text'
  | 'redacted';

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
}

export interface ResponseMeta {
  request_id: string;
  elapsed_ms: number;
  app_name: string;
  session_id: string;
}
