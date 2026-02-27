import { create } from 'zustand';
import type { ApiInsight } from '../types/insight';

export type MainMode = 'insight' | 'board';

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  status: 'loading' | 'done';
  insightData?: ApiInsight | null;
}

export interface PinnedBoardItem extends ApiInsight {
  id: string;
  pinnedAt: number;
}

interface CopilotState {
  chatHistory: ChatMessage[];
  currentInsight: ApiInsight | null;
  mainMode: MainMode;
  pinnedBoardItems: PinnedBoardItem[];
  isSending: boolean;

  addUserMessage: (content: string) => void;
  setAgentMessage: (content: string, status: 'loading' | 'done', insightData?: ApiInsight | null) => void;
  setCurrentInsight: (insight: ApiInsight | null) => void;
  setMainMode: (mode: MainMode) => void;
  pinCurrentToBoard: () => void;
  unpinFromBoard: (id: string) => void;
  setSending: (sending: boolean) => void;
  clearChat: () => void;
}

let pinnedIdCounter = 0;
function nextPinnedId(): string {
  pinnedIdCounter += 1;
  return `pinned-${Date.now()}-${pinnedIdCounter}`;
}

const loadPinned = (): PinnedBoardItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('copilot_pinned_board');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const savePinned = (items: PinnedBoardItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('copilot_pinned_board', JSON.stringify(items));
  } catch {}
};

export const useCopilotStore = create<CopilotState>((set) => ({
  chatHistory: [],
  currentInsight: null,
  mainMode: 'insight',
  pinnedBoardItems: loadPinned(),
  isSending: false,

  addUserMessage: (content) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, { role: 'user', content, status: 'done' }],
    })),

  setAgentMessage: (content, status, insightData) =>
    set((state) => {
      const prev = state.chatHistory;
      const last = prev[prev.length - 1];
      const isLastAgent = last?.role === 'agent';
      let next: ChatMessage[];

      if (isLastAgent && last?.status === 'loading') {
        next = [
          ...prev.slice(0, -1),
          { role: 'agent', content, status, insightData: insightData ?? last.insightData },
        ];
      } else {
        next = [...prev, { role: 'agent', content, status, insightData: insightData ?? undefined }];
      }
      return { chatHistory: next };
    }),

  setCurrentInsight: (insight) => set({ currentInsight: insight }),

  setMainMode: (mode) => set({ mainMode: mode }),

  pinCurrentToBoard: () =>
    set((state) => {
      const insight = state.currentInsight;
      if (!insight) return state;
      const item: PinnedBoardItem = {
        ...insight,
        id: nextPinnedId(),
        pinnedAt: Date.now(),
      };
      const next = [...state.pinnedBoardItems, item];
      savePinned(next);
      return { pinnedBoardItems: next };
    }),

  unpinFromBoard: (id) =>
    set((state) => {
      const next = state.pinnedBoardItems.filter((p) => p.id !== id);
      savePinned(next);
      return { pinnedBoardItems: next };
    }),

  setSending: (sending) => set({ isSending: sending }),

  clearChat: () => set({ chatHistory: [], currentInsight: null }),
}));
