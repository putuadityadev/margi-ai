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
  auth: {
    me: ['auth', 'me'] as const,
  },
  me: {
    analyses: (cursor?: string) => ['me', 'analyses', cursor ?? ''] as const,
    analysis: (id: string) => ['me', 'analyses', id] as const,
    trips: ['me', 'trips'] as const,
    trip: (id: string) => ['me', 'trips', id] as const,
  },
} as const;
