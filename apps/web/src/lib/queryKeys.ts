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
  explore: {
    areas: ['explore', 'areas'] as const,
    reverse: (lat: number, lng: number) => ['explore', 'reverse', lat, lng] as const,
    nearby: (params: Readonly<Record<string, string | number | undefined>>) =>
      ['explore', 'nearby', params] as const,
    place: (venueId: string, params: Readonly<Record<string, string | number | undefined>>) =>
      ['explore', 'place', venueId, params] as const,
  },
  trip: {
    plan: (requestJson: string) => ['trip', 'plan', requestJson] as const,
    corridors: ['trip', 'corridors'] as const,
    search: (q: string, lat: number, lng: number) => ['trip', 'search', q, lat, lng] as const,
    saved: ['trip', 'saved'] as const,
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
