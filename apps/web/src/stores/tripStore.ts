import { create } from 'zustand';
import {
  applyTripChange,
  MAX_TRIP_STOPS,
  type CopilotReply,
  type GeoPoint,
  type TripChange,
  type TripRequest,
  type TripSituation,
  type TripStopInput,
} from '@margi-ai/shared';

export type TripTab = 'plan' | 'copilot';

/** Trip being edited; unlike `TripRequest` it may have zero stops while a plan is drafted. */
export interface TripDraft {
  readonly origin: GeoPoint;
  readonly originLabel: string;
  readonly departAt: string;
  readonly stops: readonly TripStopInput[];
}

export type ChatEntry =
  | { readonly id: string; readonly role: 'user'; readonly text: string }
  | { readonly id: string; readonly role: 'assistant'; readonly reply: CopilotReply }
  | { readonly id: string; readonly role: 'event'; readonly text: string };

export interface TripState {
  draft: TripDraft | null;
  situation: TripSituation;
  tab: TripTab;
  chat: ChatEntry[];
  /** Suggestion ids already applied, so their cards show as done. */
  appliedSuggestionIds: string[];
  /** Plain-language log of applied changes, saved with the plan. */
  changeLog: string[];
  savedPlanId: string | null;
  /** Applied copilot changes, newest last, so each can be undone in order. */
  history: AppliedChange[];
  /**
   * The traveller's own plan before the first copilot change; the impact summary compares
   * against it. Null until a change is applied.
   */
  baseline: TripRequest | null;

  start: (draft: TripDraft, situation: TripSituation, changeLog?: string[]) => void;
  setTab: (tab: TripTab) => void;
  setDepartAt: (departAt: string) => void;
  addStop: (venueId: string) => void;
  removeStop: (index: number) => void;
  moveStop: (index: number, direction: -1 | 1) => void;
  applyChange: (change: TripChange, logLine: string, suggestionId?: string) => void;
  /** Reverts the most recent applied change; `undoneLine` is the localized log entry. */
  undo: (undoneLine: string) => void;
  pushUser: (text: string) => void;
  pushAssistant: (reply: CopilotReply) => void;
  markSaved: (planId: string) => void;
  reset: () => void;
}

export interface AppliedChange {
  readonly draftBefore: TripDraft;
  readonly logLine: string;
  readonly suggestionId: string | null;
}

let entrySeq = 0;
function nextId(prefix: string): string {
  entrySeq += 1;
  return `${prefix}-${entrySeq}`;
}

/** Narrows a draft to a request the API accepts (at least one stop). */
export function toTripRequest(draft: TripDraft | null): TripRequest | null {
  if (!draft || draft.stops.length === 0) return null;
  return { ...draft, stops: [...draft.stops] };
}

function initialState() {
  return {
    draft: null,
    situation: 'PLAN' as TripSituation,
    tab: 'plan' as TripTab,
    chat: [] as ChatEntry[],
    appliedSuggestionIds: [] as string[],
    changeLog: [] as string[],
    savedPlanId: null,
    history: [] as AppliedChange[],
    baseline: null,
  };
}

export const useTripStore = create<TripState>((set) => ({
  ...initialState(),

  // Stuck travellers need help first; planners see their itinerary first.
  start: (draft, situation, changeLog = []) =>
    set({
      ...initialState(),
      draft,
      situation,
      changeLog,
      tab: situation === 'STUCK_IN_TRAFFIC' ? 'copilot' : 'plan',
    }),
  setTab: (tab) => set({ tab }),
  setDepartAt: (departAt) =>
    set((state) => (state.draft ? { draft: { ...state.draft, departAt }, savedPlanId: null } : {})),
  addStop: (venueId) =>
    set((state) => {
      if (!state.draft || state.draft.stops.length >= MAX_TRIP_STOPS) return {};
      if (state.draft.stops.some((stop) => stop.venueId === venueId)) return {};
      return {
        draft: { ...state.draft, stops: [...state.draft.stops, { venueId }] },
        savedPlanId: null,
      };
    }),
  removeStop: (index) =>
    set((state) =>
      state.draft
        ? {
            draft: { ...state.draft, stops: state.draft.stops.filter((_, i) => i !== index) },
            savedPlanId: null,
          }
        : {},
    ),
  moveStop: (index, direction) =>
    set((state) => {
      if (!state.draft) return {};
      const target = index + direction;
      const stops = [...state.draft.stops];
      const moving = stops[index];
      const other = stops[target];
      if (!moving || !other) return {};
      stops[index] = other;
      stops[target] = moving;
      return { draft: { ...state.draft, stops }, savedPlanId: null };
    }),
  applyChange: (change, logLine, suggestionId) =>
    set((state) => {
      const request = toTripRequest(state.draft);
      if (!request || !state.draft) return {};
      return {
        draft: applyTripChange(request, change),
        baseline: state.baseline ?? request,
        history: [
          ...state.history,
          { draftBefore: state.draft, logLine, suggestionId: suggestionId ?? null },
        ],
        changeLog: [...state.changeLog, logLine],
        appliedSuggestionIds: suggestionId
          ? [...state.appliedSuggestionIds, suggestionId]
          : state.appliedSuggestionIds,
        chat: [...state.chat, { id: nextId('event'), role: 'event', text: logLine }],
        savedPlanId: null,
      };
    }),
  undo: (undoneLine) =>
    set((state) => {
      const last = state.history[state.history.length - 1];
      if (!last) return {};
      const history = state.history.slice(0, -1);
      return {
        draft: last.draftBefore,
        history,
        baseline: history.length === 0 ? null : state.baseline,
        changeLog: state.changeLog.slice(0, -1),
        appliedSuggestionIds: state.appliedSuggestionIds.filter((id) => id !== last.suggestionId),
        chat: [...state.chat, { id: nextId('event'), role: 'event', text: undoneLine }],
        savedPlanId: null,
      };
    }),
  pushUser: (text) =>
    set((state) => ({ chat: [...state.chat, { id: nextId('user'), role: 'user', text }] })),
  pushAssistant: (reply) =>
    set((state) => ({
      chat: [...state.chat, { id: nextId('assistant'), role: 'assistant', reply }],
    })),
  markSaved: (savedPlanId) => set({ savedPlanId }),
  reset: () => set(initialState()),
}));
