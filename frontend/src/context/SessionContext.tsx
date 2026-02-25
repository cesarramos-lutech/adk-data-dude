import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { apiClient, chatService } from '../services/clientService';
import type { StreamCallbacks } from '../services/clientService';
import { parseAgentResponse } from '../utils/cardParser';
import { useStory } from './StoryContext';

const DEFAULT_AGENT = 'dashboard_agent';

export interface Message {
  role: 'user' | 'bot';
  text: string;
}

interface SessionContextType {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  renameSession: (sessionId: string, newName: string) => void;
  getSessionName: (sessionId: string, defaultName: string) => string;
  traceRefreshTrigger: number;
  notifyMessageSent: () => void;
  messages: Message[];
  isSending: boolean;
  sendMessage: (text: string, files: any[]) => Promise<void>;
  clearMessages: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [traceRefreshTrigger, setTraceRefreshTrigger] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const activeSessionIdRef = useRef(activeSessionId);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const [sessionNames, setSessionNames] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('session_renames');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    setIsSending(false);
    try {
      const savedHistory = localStorage.getItem(`chat_history_${activeSessionId}`);
      if (savedHistory) {
        setMessages(JSON.parse(savedHistory));
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const currentId = activeSessionIdRef.current;
    if (currentId && messages.length > 0) {
      localStorage.setItem(`chat_history_${currentId}`, JSON.stringify(messages));
    }
  }, [messages]);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        let agentId = DEFAULT_AGENT;
        try {
          const apps = await apiClient.get<string[]>('/list-apps');
          if (Array.isArray(apps) && apps.length > 0) {
            agentId = apps[0];
          }
        } catch {
          console.warn('Could not fetch agents, using default:', agentId);
        }

        setSelectedAgentId(agentId);

        const sessionData = await apiClient.post<{ id: string }>(
          `/apps/${agentId}/users/user/sessions`,
        );
        setActiveSessionId(sessionData.id);
        console.log(`Auto-created session ${sessionData.id} for agent ${agentId}`);
      } catch (err) {
        console.error('Failed to auto-create session:', err);
      }
    })();
  }, []);

  const renameSession = (sessionId: string, newName: string) => {
    setSessionNames(prev => {
      const updated = { ...prev, [sessionId]: newName };
      localStorage.setItem('session_renames', JSON.stringify(updated));
      return updated;
    });
  };

  const getSessionName = (sessionId: string, defaultName: string) => {
    return sessionNames[sessionId] || defaultName;
  };

  const notifyMessageSent = () => {
    setTraceRefreshTrigger(prev => prev + 1);
  };

  const clearMessages = () => setMessages([]);

  const storyRef = useRef<ReturnType<typeof useStory> | null>(null);

  const sendMessage = useCallback(async (text: string, files: any[]) => {
    if (!activeSessionIdRef.current) {
      alert('No active session!');
      return;
    }

    const newUserMsg: Message = { role: 'user', text };
    const placeholderBotMsg: Message = { role: 'bot', text: '' };

    setMessages(prev => [...prev, newUserMsg, placeholderBotMsg]);
    setIsSending(true);

    const story = storyRef.current;
    story?.setAgentStatus('thinking');

    const collectedChartSpecs: Record<string, unknown>[] = [];

    const callbacks: StreamCallbacks = {
      onChunk: (chunk: string) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'bot') {
            updated[updated.length - 1] = { ...last, text: last.text + chunk };
          }
          return updated;
        });
      },
      onChartSpec: (spec: Record<string, unknown>) => {
        collectedChartSpecs.push(spec);
      },
      onStatus: (status: string) => {
        if (status === 'idle') {
          story?.setAgentStatus('idle');
        } else if (status.toLowerCase().includes('sql') || status.toLowerCase().includes('query')) {
          story?.setAgentStatus('querying');
        } else if (status.toLowerCase().includes('visual') || status.toLowerCase().includes('chart') || status.toLowerCase().includes('dashboard')) {
          story?.setAgentStatus('visualizing');
        } else {
          story?.setAgentStatus('thinking');
        }
      },
    };

    try {
      await chatService.sendUserMessage(
        selectedAgentId || 'ca_api_agent',
        text,
        activeSessionIdRef.current,
        files,
        callbacks,
      );

      notifyMessageSent();

      setMessages(prev => {
        const lastBotMsg = prev[prev.length - 1];
        if (lastBotMsg?.role === 'bot' && lastBotMsg.text && story) {
          const { cards, chatSummary } = parseAgentResponse(
            lastBotMsg.text,
            collectedChartSpecs,
            text,
          );
          for (const card of cards) {
            story.addCard(card);
          }

          const updated = [...prev];
          updated[updated.length - 1] = { ...lastBotMsg, text: chatSummary };
          return updated;
        }
        return prev;
      });
    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'bot' && !last.text) {
          updated[updated.length - 1] = { ...last, text: 'Error: Could not reach agent.' };
        }
        return updated;
      });
    } finally {
      setIsSending(false);
      story?.setAgentStatus('idle');
    }
  }, [selectedAgentId]);

  return (
    <SessionContext.Provider
      value={{
        activeSessionId,
        setActiveSessionId,
        selectedAgentId,
        setSelectedAgentId,
        renameSession,
        getSessionName,
        traceRefreshTrigger,
        notifyMessageSent,
        messages,
        isSending,
        sendMessage,
        clearMessages,
      }}
    >
      <StoryRefInjector storyRef={storyRef} />
      {children}
    </SessionContext.Provider>
  );
};

/**
 * Bridge component that injects the StoryContext ref into SessionProvider.
 * This avoids a circular dependency between the two contexts.
 */
const StoryRefInjector: React.FC<{ storyRef: React.MutableRefObject<ReturnType<typeof useStory> | null> }> = ({ storyRef }) => {
  const story = useStory();
  useEffect(() => {
    storyRef.current = story;
  });
  return null;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
