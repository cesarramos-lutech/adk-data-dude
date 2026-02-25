import React, { useRef, useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, Tooltip, Collapse, Chip,
} from '@mui/material';
import {
  PushPinOutlined, PushPin, OpenInFullOutlined,
  ExpandMore, ExpandLess, ContentCopy, TrendingUp, TrendingDown, Remove,
} from '@mui/icons-material';
import { useStory } from '../context/StoryContext';
import type { InsightCard as InsightCardType } from '../types/insight';
import { VegaLite } from 'react-vega';

const EMPTY_SUGGESTIONS = [
  'What was total revenue last quarter?',
  'Show me the top 10 customers by spend',
  'How has our conversion rate trended over the past 6 months?',
  'Compare this quarter vs last quarter',
];

const StoryPanel: React.FC = () => {
  const { storyCards, pinnedCards, agentStatus, pinCard } = useStory();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [storyCards.length]);

  const isPinned = (id: string) => pinnedCards.some(p => p.id === id);

  return (
    <div className="story-panel">
      <div className="story-panel-header">
        <Typography className="story-panel-title">Intelligence Canvas</Typography>
        {agentStatus !== 'idle' && (
          <Chip
            label={agentStatus === 'thinking' ? 'Thinking…' : agentStatus}
            size="small"
            className="agent-status-chip"
          />
        )}
      </div>

      <div className="story-panel-content" ref={scrollRef}>
        {storyCards.length === 0 ? (
          <div className="story-empty-state">
            <Typography className="story-empty-title">
              Your insights will appear here
            </Typography>
            <Typography className="story-empty-subtitle">
              Ask a question in the chat panel to get started. Each answer builds a card in this story.
            </Typography>
            <div className="story-empty-suggestions">
              {EMPTY_SUGGESTIONS.map((q, i) => (
                <div key={i} className="story-suggestion-chip">{q}</div>
              ))}
            </div>
          </div>
        ) : (
          <div className="story-cards-list">
            {storyCards.map((card, index) => (
              <InsightCardComponent
                key={card.id}
                card={card}
                pinned={isPinned(card.id)}
                onPin={() => pinCard(card.id)}
                animationDelay={index * 80}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface InsightCardProps {
  card: InsightCardType;
  pinned: boolean;
  onPin: () => void;
  animationDelay?: number;
}

const InsightCardComponent: React.FC<InsightCardProps> = ({ card, pinned, onPin, animationDelay = 0 }) => {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const DeltaIcon = card.metricDeltaDirection === 'up' ? TrendingUp
    : card.metricDeltaDirection === 'down' ? TrendingDown
    : Remove;

  const deltaClass = card.metricDeltaDirection === 'up' ? 'delta-up'
    : card.metricDeltaDirection === 'down' ? 'delta-down'
    : 'delta-neutral';

  return (
    <div
      className={`insight-card insight-card--${card.type} ${pinned ? 'insight-card--pinned' : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Headline */}
      <Typography className="insight-card-headline">
        {card.headline}
      </Typography>

      {/* Metric visualization */}
      {card.type === 'metric' && card.metricValue && (
        <div className="insight-metric-display">
          <span className="insight-metric-value">{card.metricValue}</span>
          {card.metricDelta && (
            <span className={`insight-metric-delta ${deltaClass}`}>
              <DeltaIcon fontSize="small" />
              {card.metricDelta}
            </span>
          )}
        </div>
      )}

      {/* Chart visualization */}
      {card.type === 'chart' && card.chartSpec && (
        <div className="insight-chart-container">
          <VegaLiteChart spec={card.chartSpec} />
        </div>
      )}

      {/* Narrative */}
      <Typography className="insight-card-narrative">
        {card.narrative}
      </Typography>

      {/* Card actions */}
      <div className="insight-card-actions">
        <Tooltip title={pinned ? 'Already pinned' : 'Pin to briefing'}>
          <span>
            <IconButton
              size="small"
              onClick={onPin}
              disabled={pinned}
              className={`pin-button ${pinned ? 'pin-button--active' : ''}`}
            >
              {pinned ? <PushPin fontSize="small" /> : <PushPinOutlined fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        {(card.sql || card.sourceQuestion) && (
          <Tooltip title={reasoningOpen ? 'Hide reasoning' : 'Show reasoning'}>
            <IconButton size="small" onClick={() => setReasoningOpen(!reasoningOpen)} className="reasoning-toggle">
              {reasoningOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Collapsible reasoning */}
      <Collapse in={reasoningOpen}>
        <div className="insight-reasoning">
          {card.sourceQuestion && (
            <div className="reasoning-row">
              <span className="reasoning-label">Question</span>
              <span className="reasoning-value">{card.sourceQuestion}</span>
            </div>
          )}
          {card.sql && (
            <div className="reasoning-row">
              <span className="reasoning-label">SQL</span>
              <pre className="reasoning-sql">{card.sql}</pre>
              <Tooltip title="Copy SQL">
                <IconButton
                  size="small"
                  className="copy-sql-btn"
                  onClick={() => navigator.clipboard.writeText(card.sql!)}
                >
                  <ContentCopy sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
};

const VegaLiteChart: React.FC<{ spec: Record<string, unknown> }> = ({ spec }) => {
  const chartSpec = {
    ...spec,
    width: 'container' as const,
    height: 260,
    background: 'transparent',
    config: {
      ...(spec.config as object || {}),
      axis: { labelColor: '#94a3b8', titleColor: '#94a3b8', gridColor: '#1e293b' },
      legend: { labelColor: '#94a3b8', titleColor: '#94a3b8' },
      view: { stroke: 'transparent' },
      title: { color: '#e2e8f0' },
    },
  };

  return (
    <VegaLite
      spec={chartSpec as any}
      actions={false}
      style={{ width: '100%' }}
    />
  );
};

export default StoryPanel;
