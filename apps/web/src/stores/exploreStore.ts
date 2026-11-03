import { create } from 'zustand';
import { toWita, witaHour, type GeoPoint, type VibeTag } from '@margi-ai/shared';

/** Ordered screens of the map-first explore flow (DECISIONS D-025). */
export type ExploreStep = 'intro' | 'locate' | 'vibe' | 'scan' | 'browse';
export type OriginSource = 'gps' | 'area' | 'map';
export type VisitWindow = 'now' | 'later' | 'morning';
export type PlaceSort = 'nearest' | 'calmest';

const ONBOARDED_KEY = 'margi_explore_onboarded';
/** Hours of the day (WITA) when most attractions are open, so "now" is a useful default. */
const DAYTIME_START_HOUR = 6;
const DAYTIME_END_HOUR = 18;
const LATER_OFFSET_HOURS = 2;
const MORNING_VISIT_HOUR = 8;

function readOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOnboarded(): void {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, '1');
  } catch {
    // Storage can be blocked (private mode); the intro simply shows again next visit.
  }
}

/** Default visit window: "now" during the day, otherwise the next 08:00 WITA. */
export function defaultVisitWindow(now: Date = new Date()): VisitWindow {
  const hour = witaHour(now);
  return hour >= DAYTIME_START_HOUR && hour < DAYTIME_END_HOUR ? 'now' : 'morning';
}

/**
 * Resolves a visit window into the ISO instant sent to the API, or undefined for "now".
 * "morning" means today 08:00 WITA when still before it, otherwise tomorrow 08:00.
 */
export function visitInstant(window: VisitWindow, now: Date = new Date()): string | undefined {
  const wita = toWita(now);
  if (window === 'now') return undefined;
  if (window === 'later') return wita.plus({ hours: LATER_OFFSET_HOURS }).toISO() ?? undefined;
  const morningToday = wita.set({ hour: MORNING_VISIT_HOUR, minute: 0, second: 0, millisecond: 0 });
  const morning = wita.hour < MORNING_VISIT_HOUR ? morningToday : morningToday.plus({ days: 1 });
  return morning.toISO() ?? undefined;
}

export interface ExploreState {
  step: ExploreStep;
  origin: GeoPoint | null;
  originSource: OriginSource | null;
  vibes: VibeTag[];
  visitWindow: VisitWindow;
  sort: PlaceSort;
  activePlaceId: string | null;
  /** Incremented on every scan so the map replays the radar even for the same origin. */
  scanRun: number;

  finishIntro: () => void;
  setOrigin: (origin: GeoPoint, source: OriginSource) => void;
  clearOrigin: () => void;
  confirmOrigin: () => void;
  toggleVibe: (tag: VibeTag) => void;
  startScan: (vibes?: VibeTag[]) => void;
  finishScan: () => void;
  goTo: (step: ExploreStep) => void;
  setVisitWindow: (window: VisitWindow) => void;
  setSort: (sort: PlaceSort) => void;
  setActivePlace: (placeId: string | null) => void;
  reset: () => void;
}

function initialState() {
  return {
    step: (readOnboarded() ? 'locate' : 'intro') as ExploreStep,
    origin: null,
    originSource: null,
    vibes: [] as VibeTag[],
    visitWindow: defaultVisitWindow(),
    sort: 'nearest' as PlaceSort,
    activePlaceId: null,
    scanRun: 0,
  };
}

export const useExploreStore = create<ExploreState>((set, get) => ({
  ...initialState(),

  finishIntro: () => {
    writeOnboarded();
    set({ step: 'locate' });
  },
  setOrigin: (origin, originSource) => set({ origin, originSource }),
  clearOrigin: () => set({ origin: null, originSource: null }),
  confirmOrigin: () => {
    if (get().origin) set({ step: 'vibe' });
  },
  toggleVibe: (tag) =>
    set((state) => ({
      vibes: state.vibes.includes(tag)
        ? state.vibes.filter((existing) => existing !== tag)
        : [...state.vibes, tag],
    })),
  startScan: (vibes) =>
    set((state) => ({
      step: 'scan',
      vibes: vibes ?? state.vibes,
      activePlaceId: null,
      scanRun: state.scanRun + 1,
    })),
  finishScan: () => set({ step: 'browse' }),
  goTo: (step) => set({ step }),
  setVisitWindow: (visitWindow) => set({ visitWindow }),
  setSort: (sort) => set({ sort }),
  setActivePlace: (activePlaceId) => set({ activePlaceId }),
  reset: () => set(initialState()),
}));
