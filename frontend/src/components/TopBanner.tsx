import React from 'react';
import { Box, Typography, Stack, IconButton, Tooltip, Chip } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useSession } from '../context/SessionContext';
import { useStory } from '../context/StoryContext';
import { apiClient } from '../services/clientService';
import '../App.css';

const botIconSrc = '/12227ea5e48753deae06ae4fb0ac2a2284b1b95d.png';

const TopBanner: React.FC = () => {
  const { activeSessionId, selectedAgentId, setActiveSessionId, clearMessages } = useSession();
  const { clearCards } = useStory();

  const handleNewSession = async () => {
    if (!selectedAgentId) return;
    try {
      const sessionData = await apiClient.post<{ id: string }>(
        `/apps/${selectedAgentId}/users/user/sessions`,
      );
      clearMessages();
      clearCards();
      setActiveSessionId(sessionData.id);
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  const sessionShort = activeSessionId ? activeSessionId.substring(0, 8) : '—';

  return (
    <Box component="header" className="top-banner">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        className="top-banner-content"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <img src={botIconSrc} alt="Logo" className="top-banner-logo" />
          <Typography className="top-banner-title">
            Data Intelligence Canvas
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          {activeSessionId && (
            <Chip
              label={`Session: ${sessionShort}`}
              size="small"
              sx={{
                fontSize: '0.6875rem',
                color: 'var(--canvas-text-muted)',
                borderColor: 'var(--canvas-border)',
                background: 'transparent',
              }}
              variant="outlined"
            />
          )}
          <Tooltip title="New session">
            <IconButton size="small" onClick={handleNewSession} sx={{ color: 'var(--canvas-text-muted)' }}>
              <AddCircleOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
};

export default TopBanner;
