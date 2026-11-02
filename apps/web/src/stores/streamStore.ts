import { create } from 'zustand';
import type { AnalysisResult, RouteCard, StreamEvent, VibeProfile } from '@margi-ai/shared';

export type StreamStatus = 'idle' | 'starting' | 'streaming' | 'completed' | 'failed';

export interface StreamEventItem {
  readonly id: string;
  readonly event: StreamEvent;
}

export interface PartialCandidatesPayload {
  readonly originCfs: number;
  readonly alternativesCount: number;
}

export interface PartialRecommendationsPayload {
  readonly micro: RouteCard[];
  readonly regional: RouteCard[];
  readonly insight?: string | undefined;
}

export interface StreamSections {
  vibe?: VibeProfile | null | undefined;
  origin?: AnalysisResult['origin'] | null | undefined;
  candidates?: PartialCandidatesPayload | null | undefined;
  recommendations?: PartialRecommendationsPayload | null | undefined;
  result?: AnalysisResult | null | undefined;
}

export interface StreamErrorState {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface StreamState {
  analysisId: string | null;
  status: StreamStatus;
  events: StreamEventItem[];
  seenEventIds: Set<string>;
  sections: StreamSections;
  result: AnalysisResult | null;
  error: StreamErrorState | null;
  activeCardId: string | null;
  activeTab: 'micro' | 'regional';

  // Actions
  reset: () => void;
  setStarting: (analysisId?: string) => void;
  setStreaming: (analysisId: string) => void;
  addEvent: (id: string, event: StreamEvent) => void;
  setPartialSection: (
    section: 'vibe' | 'origin' | 'candidates' | 'recommendations',
    payload: unknown,
  ) => void;
  setResult: (result: AnalysisResult) => void;
  setError: (error: StreamErrorState) => void;
  setStatus: (status: StreamStatus) => void;
  setActiveCardId: (id: string | null) => void;
  setActiveTab: (tab: 'micro' | 'regional') => void;
}

const initialSections: StreamSections = {
  vibe: null,
  origin: null,
  candidates: null,
  recommendations: null,
  result: null,
};

export const useStreamStore = create<StreamState>((set, get) => ({
  analysisId: null,
  status: 'idle',
  events: [],
  seenEventIds: new Set<string>(),
  sections: { ...initialSections },
  result: null,
  error: null,
  activeCardId: null,
  activeTab: 'micro',

  reset: () => {
    set({
      analysisId: null,
      status: 'idle',
      events: [],
      seenEventIds: new Set<string>(),
      sections: { ...initialSections },
      result: null,
      error: null,
      activeCardId: null,
      activeTab: 'micro',
    });
  },

  setStarting: (analysisId) => {
    set({
      analysisId: analysisId ?? null,
      status: 'starting',
      events: [],
      seenEventIds: new Set<string>(),
      sections: { ...initialSections },
      result: null,
      error: null,
    });
  },

  setStreaming: (analysisId) => {
    set({
      analysisId,
      status: 'streaming',
    });
  },

  addEvent: (id, event) => {
    const { seenEventIds, events, sections } = get();

    // Deduplicate by event id
    if (seenEventIds.has(id)) {
      return;
    }

    const nextSeen = new Set(seenEventIds);
    nextSeen.add(id);

    const nextEvents = [...events, { id, event }];

    // Auto-process progressive partial payloads
    if (event.type === 'partial') {
      const updatedSections = {
        ...sections,
        [event.section]: event.payload,
      };
      set({
        events: nextEvents,
        seenEventIds: nextSeen,
        sections: updatedSections,
      });
      return;
    }

    // Auto-process result
    if (event.type === 'result') {
      const result = event.payload;
      const firstCardId = result.micro[0]?.venue.id ?? result.regional[0]?.venue.id ?? null;
      set({
        events: nextEvents,
        seenEventIds: nextSeen,
        result,
        sections: { ...sections, result },
        activeCardId: get().activeCardId ?? firstCardId,
      });
      return;
    }

    // Auto-process recoverable or terminal errors
    if (event.type === 'error') {
      set({
        events: nextEvents,
        seenEventIds: nextSeen,
        error: {
          code: event.code,
          message: event.message,
          recoverable: event.recoverable,
        },
        status: event.recoverable ? get().status : 'failed',
      });
      return;
    }

    // Auto-process completion
    if (event.type === 'done') {
      set({
        events: nextEvents,
        seenEventIds: nextSeen,
        status: 'completed',
      });
      return;
    }

    set({
      events: nextEvents,
      seenEventIds: nextSeen,
    });
  },

  setPartialSection: (section, payload) => {
    set((state) => ({
      sections: {
        ...state.sections,
        [section]: payload,
      },
    }));
  },

  setResult: (result) => {
    const firstCardId = result.micro[0]?.venue.id ?? result.regional[0]?.venue.id ?? null;
    set((state) => ({
      result,
      sections: { ...state.sections, result },
      status: 'completed',
      activeCardId: state.activeCardId ?? firstCardId,
    }));
  },

  setError: (error) => {
    set({
      error,
      status: 'failed',
    });
  },

  setStatus: (status) => {
    set({ status });
  },

  setActiveCardId: (activeCardId) => {
    set({ activeCardId });
  },

  setActiveTab: (activeTab) => {
    set({ activeTab });
  },
}));
