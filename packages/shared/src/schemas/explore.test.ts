import { describe, expect, it } from 'vitest';
import { NearbyQuerySchema, parseVibeList } from './explore';

describe('explore schemas (D-025)', () => {
  it('parses a vibe list, dropping unknown and duplicate tags', () => {
    expect(parseVibeList('nature, BEACH,unknown,nature')).toEqual(['NATURE', 'BEACH']);
    expect(parseVibeList(undefined)).toEqual([]);
    expect(parseVibeList('')).toEqual([]);
  });

  it('coerces query strings and applies the default radius', () => {
    const query = NearbyQuerySchema.parse({ lat: '-8.5', lng: '115.26', vibes: 'SUNSET' });
    expect(query).toEqual({ lat: -8.5, lng: 115.26, radiusKm: 40, vibes: ['SUNSET'] });
  });

  it('rejects out-of-range coordinates', () => {
    expect(NearbyQuerySchema.safeParse({ lat: '120', lng: '0' }).success).toBe(false);
  });
});
