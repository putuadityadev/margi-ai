import { create } from 'zustand';
import { type CreatePresetInput, toWita, witaDayOfWeek, witaHour } from '@margi-ai/shared';

export interface ArrivalTime {
  day: number; // 0 = Monday ... 6 = Sunday
  hour: number; // 0 .. 23
  isManual: boolean;
}

export interface AnalyzerState {
  presetId: string | null;
  file: File | null;
  previewUrl: string | null;
  originVenueId: string | null;
  arrival: ArrivalTime;
  simulate: boolean;
  isCompressing: boolean;
  error: string | null;

  setPreset: (preset: CreatePresetInput | null) => void;
  setFile: (file: File, previewUrl: string) => void;
  clearImage: () => void;
  setOriginVenueId: (originVenueId: string | null) => void;
  setArrival: (arrival: Partial<ArrivalTime>) => void;
  setSimulate: (simulate: boolean) => void;
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
  presetId: null,
  file: null,
  previewUrl: null,
  originVenueId: null,
  arrival: getInitialWitaArrival(),
  simulate: false,
  isCompressing: false,
  error: null,

  setPreset: (preset) => {
    const current = get();
    revokeBlob(current.previewUrl);

    if (!preset) {
      set({
        presetId: null,
        previewUrl: null,
        file: null,
      });
      return;
    }

    set({
      presetId: preset.id,
      previewUrl: preset.imageUrl,
      file: null,
      originVenueId: preset.originVenueId,
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

  setError: (error) => set({ error }),

  setIsCompressing: (isCompressing) => set({ isCompressing }),

  reset: () => {
    const current = get();
    revokeBlob(current.previewUrl);

    set({
      presetId: null,
      file: null,
      previewUrl: null,
      originVenueId: null,
      arrival: getInitialWitaArrival(),
      simulate: false,
      isCompressing: false,
      error: null,
    });
  },
}));
