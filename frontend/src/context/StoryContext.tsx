import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { InsightCard, PinnedCard, AgentStatus } from '../types/insight';

interface StoryContextType {
  storyCards: InsightCard[];
  pinnedCards: PinnedCard[];
  agentStatus: AgentStatus;
  addCard: (card: InsightCard) => void;
  clearCards: () => void;
  pinCard: (id: string) => void;
  unpinCard: (id: string) => void;
  updateAnnotation: (id: string, text: string) => void;
  clearPins: () => void;
  setAgentStatus: (status: AgentStatus) => void;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

const PINNED_STORAGE_KEY = 'canvas_pinned_cards';

function loadPinnedCards(): PinnedCard[] {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const StoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [storyCards, setStoryCards] = useState<InsightCard[]>([]);
  const [pinnedCards, setPinnedCards] = useState<PinnedCard[]>(loadPinnedCards);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');

  useEffect(() => {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedCards));
  }, [pinnedCards]);

  const addCard = useCallback((card: InsightCard) => {
    setStoryCards(prev => [...prev, card]);
  }, []);

  const clearCards = useCallback(() => {
    setStoryCards([]);
  }, []);

  const pinCard = useCallback((id: string) => {
    setStoryCards(prev => {
      const card = prev.find(c => c.id === id);
      if (!card) return prev;
      setPinnedCards(pins => {
        if (pins.some(p => p.id === id)) return pins;
        return [...pins, { ...card, annotation: '', pinnedAt: Date.now() }];
      });
      return prev;
    });
  }, []);

  const unpinCard = useCallback((id: string) => {
    setPinnedCards(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateAnnotation = useCallback((id: string, text: string) => {
    setPinnedCards(prev =>
      prev.map(p => (p.id === id ? { ...p, annotation: text } : p))
    );
  }, []);

  const clearPins = useCallback(() => {
    setPinnedCards([]);
  }, []);

  return (
    <StoryContext.Provider
      value={{
        storyCards,
        pinnedCards,
        agentStatus,
        addCard,
        clearCards,
        pinCard,
        unpinCard,
        updateAnnotation,
        clearPins,
        setAgentStatus,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = () => {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStory must be used within a StoryProvider');
  return ctx;
};
