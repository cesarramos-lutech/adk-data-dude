import React, { useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AppThemeProvider } from './context/ThemeContext';
import { SessionProvider } from './context/SessionContext';
import { StoryProvider } from './context/StoryContext';
import TopBanner from './components/TopBanner';
import ChatPanel from './components/ChatPanel';
import StoryPanel from './components/StoryPanel';
import Pinboard from './components/Pinboard';
import { GlobalToast } from './components/GlobalToast';
import { useStory } from './context/StoryContext';
import './App.css';

const CanvasLayout: React.FC = () => {
  const { pinnedCards } = useStory();
  const hasPins = pinnedCards.length > 0;

  return (
    <div className="App" data-theme="dark">
      <div className="canvas-layout">
        <TopBanner />
        <div className={`canvas-panels ${hasPins ? 'canvas-panels--with-pins' : ''}`}>
          <ChatPanel />
          <StoryPanel />
          <Pinboard />
        </div>
      </div>
      <GlobalToast />
    </div>
  );
};

const AppContent: React.FC = () => {
  const muiTheme = useMemo(() => createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#3b82f6' },
      background: { default: '#0f172a', paper: '#1e293b' },
    },
    typography: {
      fontFamily: '"DM Sans", "Google Sans", Roboto, Arial, sans-serif',
    },
  }), []);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <CanvasLayout />
    </ThemeProvider>
  );
};

function App() {
  return (
    <AppThemeProvider>
      <StoryProvider>
        <SessionProvider>
          <AppContent />
        </SessionProvider>
      </StoryProvider>
    </AppThemeProvider>
  );
}

export default App;
