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
