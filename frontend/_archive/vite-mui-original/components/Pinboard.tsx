import React from 'react';
import {
  Typography, IconButton, Tooltip, TextField,
} from '@mui/material';
import {
  PushPin, DeleteOutline, ClearAll,
} from '@mui/icons-material';
import { useStory } from '../context/StoryContext';
import type { PinnedCard as PinnedCardType } from '../types/insight';

const Pinboard: React.FC = () => {
  const { pinnedCards, unpinCard, updateAnnotation, clearPins } = useStory();

  return (
    <div className={`pinboard-panel ${pinnedCards.length === 0 ? 'pinboard-panel--empty' : ''}`}>
      <div className="pinboard-header">
        <div className="pinboard-header-left">
          <PushPin fontSize="small" className="pinboard-header-icon" />
          <Typography className="pinboard-title">Your Briefing</Typography>
          {pinnedCards.length > 0 && (
            <span className="pinboard-count">{pinnedCards.length}</span>
          )}
        </div>
        {pinnedCards.length > 0 && (
          <Tooltip title="Clear all pins">
            <IconButton size="small" onClick={clearPins} className="pinboard-clear-btn">
              <ClearAll fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </div>

      <div className="pinboard-content">
        {pinnedCards.length === 0 ? (
          <div className="pinboard-empty">
            <PushPin className="pinboard-empty-icon" />
            <Typography className="pinboard-empty-text">
              Pin insights from the story to build your briefing
            </Typography>
            <Typography className="pinboard-empty-hint">
              Click the pin icon on any insight card
            </Typography>
          </div>
        ) : (
          <div className="pinboard-cards">
            {pinnedCards.map(card => (
              <PinnedCardComponent
                key={card.id}
                card={card}
                onUnpin={() => unpinCard(card.id)}
                onAnnotationChange={(text) => updateAnnotation(card.id, text)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PinnedCardProps {
  card: PinnedCardType;
  onUnpin: () => void;
  onAnnotationChange: (text: string) => void;
}

const PinnedCardComponent: React.FC<PinnedCardProps> = ({ card, onUnpin, onAnnotationChange }) => {
  return (
    <div className="pinned-card">
      <div className="pinned-card-header">
        <Typography className="pinned-card-headline">{card.headline}</Typography>
        <Tooltip title="Unpin">
          <IconButton size="small" onClick={onUnpin} className="unpin-btn">
            <DeleteOutline sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </div>

      {card.type === 'metric' && card.metricValue && (
        <div className="pinned-metric-mini">
          <span className="pinned-metric-value">{card.metricValue}</span>
          {card.metricDelta && (
            <span className={`pinned-metric-delta delta-${card.metricDeltaDirection || 'neutral'}`}>
              {card.metricDelta}
            </span>
          )}
        </div>
      )}

      {card.type === 'chart' && (
        <div className="pinned-chart-badge">Chart</div>
      )}

      <TextField
        placeholder="Why this matters…"
        value={card.annotation}
        onChange={e => onAnnotationChange(e.target.value)}
        multiline
        minRows={1}
        maxRows={3}
        fullWidth
        variant="standard"
        className="pinned-annotation"
        InputProps={{ disableUnderline: true }}
      />

      {card.sourceQuestion && (
        <Typography className="pinned-source">
          From: "{card.sourceQuestion}"
        </Typography>
      )}
    </div>
  );
};

export default Pinboard;
