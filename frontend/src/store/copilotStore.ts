import { create } from 'zustand';
import type {
  ApiInsight,
  PanelType,
  ResponseMeta,
  ResponseType,
  StatusPhase,
  UiHints,
} from '../types/insight';

export type MainMode = 'insight' | 'board';

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  status: 'loading' | 'done';
  insightData?: ApiInsight | null;
}

export interface SessionMeta {
  sessionId: string;
  title: string;
  createdAt: number;
  messageCount: number;
}

export interface GridLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PinnedBoardItem extends ApiInsight {
  id: string;
  pinnedAt: number;
  panel_type: PanelType;
  layout: GridLayout;
}

interface CopilotState {
  chatHistory: ChatMessage[];
  currentInsight: ApiInsight | null;
  mainMode: MainMode;
  pinnedBoardItems: PinnedBoardItem[];
  isSending: boolean;
  requestState: 'idle' | 'sending' | 'completed' | 'error';
  statusPhase: StatusPhase | null;
  phaseTrace: StatusPhase[];
  lastResponseType: ResponseType | null;
  uiHints: UiHints | null;
  lastMeta: ResponseMeta | null;
  lastPrompt: string | null;
  lastError: string | null;
  lastClearedBoardSnapshot: PinnedBoardItem[] | null;
  clearBoardUndoExpiresAt: number | null;
  clearBoardUndoTimerId: number | null;

  activeSessionId: string | null;
  sessionHistory: SessionMeta[];

  addUserMessage: (content: string) => void;
  setAgentMessage: (content: string, status: 'loading' | 'done', insightData?: ApiInsight | null) => void;
  startRequest: (prompt: string) => void;
  applyResponseState: (payload: {
    responseType: ResponseType;
    statusPhase?: StatusPhase;
    phaseTrace?: StatusPhase[];
    uiHints?: UiHints | null;
    meta?: ResponseMeta | null;
    insight?: ApiInsight | null;
  }) => void;
  failRequest: (message: string) => void;
  clearError: () => void;
  setCurrentInsight: (insight: ApiInsight | null) => void;
  setMainMode: (mode: MainMode) => void;
  pinCurrentToBoard: (panelType?: PanelType) => void;
  pinInsightToBoard: (insight: ApiInsight, panelType?: PanelType) => void;
  unpinFromBoard: (id: string) => void;
  clearBoard: () => void;
  clearBoardWithUndoWindow: (windowMs?: number) => void;
  restoreClearedBoard: () => void;
  setSending: (sending: boolean) => void;
  clearChat: () => void;
  trackSession: (sessionId: string, firstMessage: string) => void;
  loadSessionChat: (sessionId: string, messages: ChatMessage[]) => void;
  deleteSessionMeta: (sessionId: string) => void;
  _hydrateFromStorage: () => void;
}

let pinnedIdCounter = 0;
function nextPinnedId(): string {
  pinnedIdCounter += 1;
  return `pinned-${Date.now()}-${pinnedIdCounter}`;
}

const loadSessionHistory = (): SessionMeta[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('copilot_session_history');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const saveSessionHistory = (items: SessionMeta[]) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('copilot_session_history', JSON.stringify(items.slice(0, 50))); }
  catch { /* ignore */ }
};

const loadPinned = (): PinnedBoardItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('copilot_pinned_board');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const raw = localStorage.getItem('copilot_pinned_board');
    console.error('copilotStore: failed to parse pinned board from localStorage', raw, err);
    return [];
  }
};

const savePinned = (items: PinnedBoardItem[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('copilot_pinned_board', JSON.stringify(items));
  } catch (err) {
    console.error('copilotStore: failed to save pinned board', err);
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      import('../utils/ToastManager').then(({ toastManager }) =>
        toastManager.show('Storage quota exceeded. Pinned board changes may not persist.', 'warning')
      );
    }
  }
};

export const useCopilotStore = create<CopilotState>((set) => ({
  chatHistory: [],
  currentInsight: null,
  mainMode: 'insight',
  pinnedBoardItems: [],
  isSending: false,
  requestState: 'idle',
  statusPhase: null,
  phaseTrace: [],
  lastResponseType: null,
  uiHints: null,
  lastMeta: null,
  lastPrompt: null,
  lastError: null,
  lastClearedBoardSnapshot: null,
  clearBoardUndoExpiresAt: null,
  clearBoardUndoTimerId: null,

  activeSessionId: null,
  sessionHistory: [],

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

  startRequest: (prompt) =>
    set({
      isSending: true,
      requestState: 'sending',
      statusPhase: 'thinking',
      phaseTrace: ['thinking'],
      lastPrompt: prompt,
      lastError: null,
    }),

  applyResponseState: ({ responseType, statusPhase, phaseTrace, uiHints, meta, insight }) =>
    set((state) => {
      const nextState: Partial<CopilotState> = {
        isSending: false,
        requestState: 'completed',
        statusPhase: statusPhase ?? 'finalizing',
        phaseTrace: phaseTrace && phaseTrace.length > 0 ? phaseTrace : ['thinking', 'finalizing'],
        lastResponseType: responseType,
        uiHints: uiHints ?? null,
        lastMeta: meta ?? null,
      };

      if (insight && responseType !== 'answer' && responseType !== 'message_only') {
        nextState.currentInsight = insight;
      }

      if (uiHints?.auto_open_insight && responseType === 'insight_ready') {
        nextState.mainMode = 'insight';
      }

      return nextState;
    }),

  failRequest: (message) =>
    set({
      isSending: false,
      requestState: 'error',
      statusPhase: 'finalizing',
      phaseTrace: ['thinking', 'finalizing'],
      lastResponseType: 'error',
      lastError: message,
      uiHints: {
        auto_open_insight: false,
        pin_allowed: false,
        confidence: 'low',
      },
    }),

  clearError: () => set({ lastError: null }),

  setCurrentInsight: (insight) => set({ currentInsight: insight }),

  setMainMode: (mode) => set({ mainMode: mode }),

  pinCurrentToBoard: (panelType = 'chart') =>
    set((state) => {
      const insight = state.currentInsight;
      if (!insight) return state;
      const maxY = state.pinnedBoardItems.reduce((acc, p) => Math.max(acc, p.layout.y + p.layout.h), 0);
      const item: PinnedBoardItem = {
        ...insight,
        id: nextPinnedId(),
        pinnedAt: Date.now(),
        panel_type: panelType,
        layout: { x: 0, y: maxY, w: 6, h: panelType === 'chart' ? 4 : panelType === 'table' ? 5 : 3 },
      };
      const next = [...state.pinnedBoardItems, item];
      savePinned(next);
      return { pinnedBoardItems: next };
    }),

  pinInsightToBoard: (insight, panelType) =>
    set((state) => {
      const autoType: PanelType = panelType
        ?? (insight.vega_spec ? 'chart'
          : insight.insight_summary ? 'narrative'
          : insight.rows.length > 0 ? 'table'
          : 'narrative');
      const maxY = state.pinnedBoardItems.reduce((acc, p) => Math.max(acc, p.layout.y + p.layout.h), 0);
      const item: PinnedBoardItem = {
        ...insight,
        id: nextPinnedId(),
        pinnedAt: Date.now(),
        panel_type: autoType,
        layout: { x: 0, y: maxY, w: 6, h: autoType === 'chart' ? 4 : autoType === 'table' ? 5 : 3 },
      };
      const next = [...state.pinnedBoardItems, item];
      savePinned(next);
      return { pinnedBoardItems: next, currentInsight: insight };
    }),

  unpinFromBoard: (id) =>
    set((state) => {
      const next = state.pinnedBoardItems.filter((p) => p.id !== id);
      savePinned(next);
      return { pinnedBoardItems: next };
    }),

  clearBoard: () =>
    set(() => {
      const next: PinnedBoardItem[] = [];
      savePinned(next);
      return { pinnedBoardItems: next };
    }),

  clearBoardWithUndoWindow: (windowMs = 10000) =>
    set((state) => {
      if (state.clearBoardUndoTimerId && typeof window !== 'undefined') {
        window.clearTimeout(state.clearBoardUndoTimerId);
      }
      const snapshot = [...state.pinnedBoardItems];
      const next: PinnedBoardItem[] = [];
      savePinned(next);

      let timerId: number | null = null;
      if (typeof window !== 'undefined') {
        timerId = window.setTimeout(() => {
          set({
            lastClearedBoardSnapshot: null,
            clearBoardUndoExpiresAt: null,
            clearBoardUndoTimerId: null,
          });
        }, windowMs);
      }

      return {
        pinnedBoardItems: next,
        lastClearedBoardSnapshot: snapshot,
        clearBoardUndoExpiresAt: Date.now() + windowMs,
        clearBoardUndoTimerId: timerId,
      };
    }),

  restoreClearedBoard: () =>
    set((state) => {
      const snapshot = state.lastClearedBoardSnapshot;
      if (!snapshot || snapshot.length === 0) {
        return {
          lastClearedBoardSnapshot: null,
          clearBoardUndoExpiresAt: null,
          clearBoardUndoTimerId: null,
        };
      }
      if (state.clearBoardUndoTimerId && typeof window !== 'undefined') {
        window.clearTimeout(state.clearBoardUndoTimerId);
      }
      savePinned(snapshot);
      return {
        pinnedBoardItems: snapshot,
        lastClearedBoardSnapshot: null,
        clearBoardUndoExpiresAt: null,
        clearBoardUndoTimerId: null,
      };
    }),

  setSending: (sending) => set({ isSending: sending }),

  clearChat: () =>
    set((state) => {
      if (state.activeSessionId && state.chatHistory.length > 0) {
        const existing = state.sessionHistory.find((s) => s.sessionId === state.activeSessionId);
        if (existing) {
          const updated = state.sessionHistory.map((s) =>
            s.sessionId === state.activeSessionId ? { ...s, messageCount: state.chatHistory.filter((m) => m.role === 'user').length } : s
          );
          saveSessionHistory(updated);
        }
      }
      return {
        chatHistory: [],
        currentInsight: null,
        requestState: 'idle',
        statusPhase: null,
        phaseTrace: [],
        lastResponseType: null,
        lastMeta: null,
        lastError: null,
        activeSessionId: null,
      };
    }),

  trackSession: (sessionId, firstMessage) =>
    set((state) => {
      if (state.sessionHistory.some((s) => s.sessionId === sessionId)) {
        return { activeSessionId: sessionId };
      }
      const meta: SessionMeta = {
        sessionId,
        title: firstMessage.length > 60 ? firstMessage.slice(0, 57) + '...' : firstMessage,
        createdAt: Date.now(),
        messageCount: 1,
      };
      const next = [meta, ...state.sessionHistory].slice(0, 50);
      saveSessionHistory(next);
      return { sessionHistory: next, activeSessionId: sessionId };
    }),

  loadSessionChat: (sessionId, messages) =>
    set({
      chatHistory: messages,
      activeSessionId: sessionId,
      currentInsight: null,
      requestState: 'idle',
      statusPhase: null,
      phaseTrace: [],
      lastResponseType: null,
      lastMeta: null,
      lastError: null,
    }),

  deleteSessionMeta: (sessionId) =>
    set((state) => {
      const next = state.sessionHistory.filter((s) => s.sessionId !== sessionId);
      saveSessionHistory(next);
      return { sessionHistory: next };
    }),

  _hydrateFromStorage: () =>
    set({ pinnedBoardItems: loadPinned(), sessionHistory: loadSessionHistory() }),
}));

if (typeof window !== 'undefined') {
  useCopilotStore.getState()._hydrateFromStorage();
}
