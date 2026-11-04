import { create } from 'zustand';
import { MAX_TRIP_STOPS, type ChatReply, type NearbyPlace } from '@margi-ai/shared';

const STORAGE_KEY = 'margi_chat_v1';
const MAX_MESSAGES = 24;

export type ChatMessage =
  | { readonly id: string; readonly role: 'user'; readonly text: string }
  | { readonly id: string; readonly role: 'assistant'; readonly reply: ChatReply }
  | {
      readonly id: string;
      readonly role: 'error';
      readonly kind: 'rateLimited' | 'unavailable' | 'offline' | 'generic';
      /** The user message to resend when the traveller taps retry. */
      readonly retryText: string;
    };

export interface TrayItem {
  readonly id: string;
  readonly nameEn: string;
  readonly nameId: string;
}

interface Saved {
  readonly messages: ChatMessage[];
  readonly tray: TrayItem[];
}

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], tray: [] };
    const parsed = JSON.parse(raw) as Partial<Saved>;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [],
      tray: Array.isArray(parsed.tray) ? parsed.tray.slice(0, MAX_TRIP_STOPS) : [],
    };
  } catch {
    return { messages: [], tray: [] };
  }
}

function save(state: Saved): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The conversation simply is not remembered after a reload.
  }
}

export interface ChatState extends Saved {
  addUser: (text: string) => void;
  addReply: (reply: ChatReply) => void;
  addError: (kind: Extract<ChatMessage, { role: 'error' }>['kind'], retryText: string) => void;
  /** Drops trailing error bubbles, e.g. before a retry. */
  dropErrors: () => void;
  /** Adds a place to the plan tray; false when it is full. */
  toggleTray: (place: NearbyPlace) => boolean;
  removeFromTray: (id: string) => void;
  clearTray: () => void;
  reset: () => void;
}

let counter = 0;
const nextId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`;

export const useChatStore = create<ChatState>((set, get) => {
  const commit = (messages: ChatMessage[], tray: TrayItem[]): void => {
    const trimmed = messages.slice(-MAX_MESSAGES);
    save({ messages: trimmed, tray });
    set({ messages: trimmed, tray });
  };
  return {
    ...load(),
    addUser: (text) =>
      commit([...get().messages, { id: nextId('u'), role: 'user', text }], get().tray),
    addReply: (reply) =>
      commit([...get().messages, { id: nextId('a'), role: 'assistant', reply }], get().tray),
    addError: (kind, retryText) =>
      commit([...get().messages, { id: nextId('e'), role: 'error', kind, retryText }], get().tray),
    dropErrors: () =>
      commit(
        get().messages.filter((message) => message.role !== 'error'),
        get().tray,
      ),
    toggleTray: (place) => {
      const { tray, messages } = get();
      if (tray.some((item) => item.id === place.venue.id)) {
        commit(
          messages,
          tray.filter((item) => item.id !== place.venue.id),
        );
        return true;
      }
      if (tray.length >= MAX_TRIP_STOPS) return false;
      commit(messages, [
        ...tray,
        { id: place.venue.id, nameEn: place.venue.nameEn, nameId: place.venue.nameId },
      ]);
      return true;
    },
    removeFromTray: (id) =>
      commit(
        get().messages,
        get().tray.filter((item) => item.id !== id),
      ),
    clearTray: () => commit(get().messages, []),
    reset: () => commit([], []),
  };
});
