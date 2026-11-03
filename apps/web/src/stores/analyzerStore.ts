import { create } from 'zustand';
import { type CreatePresetInput, toWita, witaDayOfWeek, witaHour } from '@margi-ai/shared';

export interface ArrivalTime {
  day: number; // 0 = Monday ... 6 = Sunday
  hour: number; // 0 .. 23
  isManual: boolean;
}

export interface DepartureArea {
  id: string;
  nameId: string;
  nameEn: string;
  lat: number;
  lng: number;
}

export type TravelIntent = 'known' | 'explore' | null;
export type SourceType = 'upload' | 'link' | 'preset' | 'search' | null;
export type TravelMode = 'MOTORCYCLE' | 'CAR';

export interface AnalyzerState {
  intent: TravelIntent;
  sourceType: SourceType;
  sourceUrl: string;
  destinationVenueId: string | null;
  departureArea: DepartureArea | null;
  travelMode: TravelMode;
  presetId: string | null;
  file: File | null;
  previewUrl: string | null;
  originVenueId: string | null;
  arrival: ArrivalTime;
  simulate: boolean;
  saveImage: boolean;
  isCompressing: boolean;
  error: string | null;

  setIntent: (intent: TravelIntent) => void;
  setSourceType: (sourceType: SourceType) => void;
  setSourceUrl: (url: string) => void;
  setDestinationVenueId: (id: string | null) => void;
  setDepartureArea: (area: DepartureArea | null) => void;
  setTravelMode: (mode: TravelMode) => void;
  setPreset: (preset: CreatePresetInput | null) => void;
  setFile: (file: File, previewUrl: string) => void;
  clearImage: () => void;
  setOriginVenueId: (originVenueId: string | null) => void;
  setArrival: (arrival: Partial<ArrivalTime>) => void;
  setSimulate: (simulate: boolean) => void;
  setSaveImage: (saveImage: boolean) => void;
  setError: (error: string | null) => void;
  setIsCompressing: (isCompressing: boolean) => void;
  reset: () => void;
}

export function getInitialWitaArrival(): ArrivalTime {
  const now = new Date();
  try {
    const wita = toWita(now);
    return {
      day: witaDayOfWeek(wita),
      hour: witaHour(wita),
      isManual: false,
    };
  } catch {
    return { day: 5, hour: 9, isManual: false };
  }
}

function revokeBlob(url: string | null): void {
  if (
    url &&
    url.startsWith('blob:') &&
    typeof URL !== 'undefined' &&
    typeof URL.revokeObjectURL === 'function'
  ) {
    URL.revokeObjectURL(url);
  }
}

export const useAnalyzerStore = create<AnalyzerState>((set, get) => ({
  intent: null,
  sourceType: null,
  sourceUrl: '',
  destinationVenueId: null,
  departureArea: null,
  travelMode: 'MOTORCYCLE',
  presetId: null,
  file: null,
  previewUrl: null,
  originVenueId: null,
  arrival: getInitialWitaArrival(),
  simulate: false,
  saveImage: true,
  isCompressing: false,
  error: null,

  setIntent: (intent) => set({ intent }),

  setSourceType: (sourceType) => set({ sourceType }),

  setSourceUrl: (sourceUrl) => set({ sourceUrl }),

  setDestinationVenueId: (destinationVenueId) => set({ destinationVenueId }),

  setDepartureArea: (departureArea) => set({ departureArea }),

  setTravelMode: (travelMode) => set({ travelMode }),

  setPreset: (preset) => {
    const current = get();
    revokeBlob(current.previewUrl);

    if (!preset) {
      set({
        presetId: null,
        previewUrl: null,
        file: null,
        sourceType: null,
      });
      return;
    }

    set({
      presetId: preset.id,
      previewUrl: preset.imageUrl,
      file: null,
      sourceType: 'preset',
      originVenueId: preset.originVenueId,
      destinationVenueId: preset.originVenueId,
      arrival: {
        day: preset.defaultDay,
        hour: preset.defaultHour,
        isManual: false,
      },
      error: null,
    });
  },

  setFile: (file, previewUrl) => {
    const current = get();
    revokeBlob(current.previewUrl);

    set({
      file,
      previewUrl,
      presetId: null,
      sourceType: 'upload',
      error: null,
    });
  },

  clearImage: () => {
    const current = get();
    revokeBlob(current.previewUrl);

    set({
      file: null,
      previewUrl: null,
      presetId: null,
      sourceType: null,
    });
  },

  setOriginVenueId: (originVenueId) => set({ originVenueId }),

  setArrival: (patch) => {
    const current = get().arrival;
    set({
      arrival: {
        ...current,
        ...patch,
        isManual: patch.isManual ?? true,
      },
    });
  },

  setSimulate: (simulate) => set({ simulate }),

  setSaveImage: (saveImage) => set({ saveImage }),

  setError: (error) => set({ error }),

  setIsCompressing: (isCompressing) => set({ isCompressing }),

  reset: () => {
    const current = get();
    revokeBlob(current.previewUrl);

    set({
      intent: null,
      sourceType: null,
      sourceUrl: '',
      destinationVenueId: null,
      departureArea: null,
      travelMode: 'MOTORCYCLE',
      presetId: null,
      file: null,
      previewUrl: null,
      originVenueId: null,
      arrival: getInitialWitaArrival(),
      simulate: false,
      saveImage: true,
      isCompressing: false,
      error: null,
    });
  },
}));
