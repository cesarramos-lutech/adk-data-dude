import type { InsightCard, CardType } from '../types/insight';

let cardCounter = 0;

function generateCardId(): string {
  cardCounter += 1;
  return `card-${Date.now()}-${cardCounter}`;
}

function extractHeadline(text: string): string {
  const cleaned = text.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
  const sentenceEnd = cleaned.search(/[.!?]\s/);
  if (sentenceEnd > 0 && sentenceEnd < 120) {
    return cleaned.slice(0, sentenceEnd + 1).trim();
  }
  const firstLine = cleaned.split('\n')[0].trim();
  if (firstLine.length <= 120) return firstLine;
  return firstLine.slice(0, 80).trim() + '\u2026';
}

function detectMetric(text: string): { value: string; delta?: string; direction?: 'up' | 'down' | 'neutral' } | null {
  if (text.length > 400) return null;

  const bigNumberMatch = text.match(/(?:^|\s)([\$\u20AC\u00A3]?\d[\d,]*\.?\d*[%KMBkmb]?)\b/);
  if (!bigNumberMatch) return null;

  const value = bigNumberMatch[1];

  const deltaMatch = text.match(/([+-]?\d+\.?\d*%)/);
  let delta: string | undefined;
  let direction: 'up' | 'down' | 'neutral' = 'neutral';
  if (deltaMatch) {
    delta = deltaMatch[1];
    if (delta.startsWith('+') || (!delta.startsWith('-') && text.toLowerCase().includes('increase'))) {
      direction = 'up';
    } else if (delta.startsWith('-') || text.toLowerCase().includes('decrease') || text.toLowerCase().includes('decline')) {
      direction = 'down';
    }
  }

  return { value, delta, direction };
}

function extractSql(text: string): string | undefined {
  const sqlMatch = text.match(/```sql\s*([\s\S]*?)```/i);
  return sqlMatch ? sqlMatch[1].trim() : undefined;
}

export interface ParsedAgentResponse {
  cards: InsightCard[];
  chatSummary: string;
}

export function parseAgentResponse(
  text: string,
  _chartSpecs: Record<string, unknown>[] = [],
  sourceQuestion?: string
): ParsedAgentResponse {
  const cards: InsightCard[] = [];
  const now = Date.now();
  const sql = extractSql(text);
  const narrativeText = text
    .replace(/```sql[\s\S]*?```/gi, '')
    .replace(/```json[\s\S]*?```/gi, '')
    .trim();

  const metric = detectMetric(narrativeText);
  const cardType: CardType = metric ? 'metric' : 'narrative';

  cards.push({
    id: generateCardId(),
    type: cardType,
    headline: extractHeadline(narrativeText),
    narrative: narrativeText,
    metricValue: metric?.value,
    metricDelta: metric?.delta,
    metricDeltaDirection: metric?.direction,
    sql,
    sourceQuestion,
    timestamp: now,
  });

  const summaryLines = narrativeText.split('\n').filter(l => l.trim());
  const chatSummary = summaryLines.length > 0
    ? summaryLines[0].slice(0, 150) + (summaryLines[0].length > 150 ? '\u2026' : '')
    : 'See the Story panel for details.';

  return { cards, chatSummary };
}
