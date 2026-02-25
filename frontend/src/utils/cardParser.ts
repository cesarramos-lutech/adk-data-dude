import type { InsightCard, CardType } from '../types/insight';

let cardCounter = 0;

function generateCardId(): string {
  cardCounter += 1;
  return `card-${Date.now()}-${cardCounter}`;
}

/**
 * Try to extract the first sentence from text to use as a card headline.
 * Falls back to the first 80 chars if no sentence boundary is found.
 */
function extractHeadline(text: string): string {
  const cleaned = text.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
  const sentenceEnd = cleaned.search(/[.!?]\s/);
  if (sentenceEnd > 0 && sentenceEnd < 120) {
    return cleaned.slice(0, sentenceEnd + 1).trim();
  }
  const firstLine = cleaned.split('\n')[0].trim();
  if (firstLine.length <= 120) return firstLine;
  return firstLine.slice(0, 80).trim() + '…';
}

/**
 * Detect if the text looks like a short metric-style answer.
 * Heuristics: short text (< 300 chars), contains a prominent number.
 */
function detectMetric(text: string): { value: string; delta?: string; direction?: 'up' | 'down' | 'neutral' } | null {
  if (text.length > 400) return null;

  const bigNumberMatch = text.match(/(?:^|\s)([\$€£]?\d[\d,]*\.?\d*[%KMBkmb]?)\b/);
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

/**
 * Try to extract a Vega-Lite spec from the response text.
 * The agent sometimes embeds JSON in fenced code blocks or inline.
 */
function extractVegaLiteFromText(text: string): Record<string, unknown> | null {
  const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (isVegaLiteSpec(parsed)) return parsed;
    } catch { /* not valid JSON */ }
  }

  const braceStart = text.indexOf('{"$schema"');
  if (braceStart >= 0) {
    let depth = 0;
    let end = braceStart;
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      if (depth === 0) { end = i + 1; break; }
    }
    try {
      const parsed = JSON.parse(text.slice(braceStart, end));
      if (isVegaLiteSpec(parsed)) return parsed;
    } catch { /* not valid JSON */ }
  }

  return null;
}

function isVegaLiteSpec(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return false;
  const rec = obj as Record<string, unknown>;
  return (
    (typeof rec.$schema === 'string' && rec.$schema.includes('vega-lite')) ||
    ('mark' in rec && ('encoding' in rec || 'data' in rec))
  );
}

/**
 * Extract SQL from agent text (usually in a fenced code block).
 */
function extractSql(text: string): string | undefined {
  const sqlMatch = text.match(/```sql\s*([\s\S]*?)```/i);
  return sqlMatch ? sqlMatch[1].trim() : undefined;
}

export interface ParsedAgentResponse {
  cards: InsightCard[];
  /** Brief summary for the chat panel */
  chatSummary: string;
}

/**
 * Parse the full agent response (text + optional chart specs from tools)
 * into InsightCard(s) for the Story Panel.
 */
export function parseAgentResponse(
  text: string,
  chartSpecs: Record<string, unknown>[] = [],
  sourceQuestion?: string
): ParsedAgentResponse {
  const cards: InsightCard[] = [];
  const now = Date.now();
  const sql = extractSql(text);
  const narrativeText = text
    .replace(/```sql[\s\S]*?```/gi, '')
    .replace(/```json[\s\S]*?```/gi, '')
    .trim();

  if (chartSpecs.length > 0) {
    for (const spec of chartSpecs) {
      cards.push({
        id: generateCardId(),
        type: 'chart',
        headline: extractHeadline(narrativeText),
        narrative: narrativeText,
        chartSpec: spec,
        sql,
        sourceQuestion,
        timestamp: now,
      });
    }
  } else {
    const embeddedSpec = extractVegaLiteFromText(text);

    if (embeddedSpec) {
      cards.push({
        id: generateCardId(),
        type: 'chart',
        headline: extractHeadline(narrativeText),
        narrative: narrativeText.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '').trim(),
        chartSpec: embeddedSpec,
        sql,
        sourceQuestion,
        timestamp: now,
      });
    } else {
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
    }
  }

  const summaryLines = narrativeText.split('\n').filter(l => l.trim());
  const chatSummary = summaryLines.length > 0
    ? summaryLines[0].slice(0, 150) + (summaryLines[0].length > 150 ? '…' : '')
    : 'See the Story panel for details.';

  return { cards, chatSummary };
}
