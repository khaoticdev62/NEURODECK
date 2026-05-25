/**
 * Zustand vanilla store for NEURODECK React components.
 *
 * Vanilla store (not a React hook) so that both React components
 * (via useStore) and plain JS modules (via .getState() / .setState())
 * can share the same chat message list.
 *
 * Chat.js pushes messages here when they stream in.
 * VirtualChat.tsx reads them via useStore(useAppStore, selector).
 */
import { createStore } from "zustand/vanilla";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

interface AppState {
  chatMessages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
}

export const useAppStore = createStore<AppState>((set) => ({
  chatMessages: [],

  addMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.chatMessages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
      }
      return { chatMessages: msgs };
    }),

  clearMessages: () => set({ chatMessages: [] }),
}));
