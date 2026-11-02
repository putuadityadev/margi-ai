export const queryKeys = {
  presets: {
    all: ['presets'] as const,
  },
  origins: {
    all: ['origins'] as const,
  },
  regencies: {
    all: ['regencies'] as const,
  },
  system: {
    status: ['system', 'status'] as const,
  },
  venues: {
    bySlug: (slug: string) => ['venues', 'slug', slug] as const,
    forecast: (venueId: string) => ['venues', venueId, 'forecast'] as const,
  },
} as const;
