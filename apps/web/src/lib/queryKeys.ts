export const queryKeys = {
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
    departures: (requestKey: string) => ['trip', 'departures', requestKey] as const,
    insight: (requestJson: string, locale: string) =>
      ['trip', 'insight', requestJson, locale] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
} as const;
