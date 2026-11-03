import { describe, expect, it } from 'vitest';
import { VenueLiteSchema, VibeTagSchema } from '@margi-ai/shared';
import { MOCK_AREAS } from './areas';
import { EXPLORE_PLACES } from './places';
import { MOCK_REGENCIES } from './regencies';
import { MOCK_VENUES } from './venues';

const BALI_BOUNDS = { minLat: -8.95, maxLat: -8.04, minLng: 114.4, maxLng: 115.73 };

function isInsideBali(lat: number, lng: number): boolean {
  return (
    lat >= BALI_BOUNDS.minLat &&
    lat <= BALI_BOUNDS.maxLat &&
    lng >= BALI_BOUNDS.minLng &&
    lng <= BALI_BOUNDS.maxLng
  );
}

describe('explore mock places', () => {
  it('contains at least 68 places', () => {
    expect(EXPLORE_PLACES.length).toBeGreaterThanOrEqual(68);
  });

  it('includes every original mock venue', () => {
    const slugs = new Set(EXPLORE_PLACES.map((p) => p.venue.slug));
    for (const venue of MOCK_VENUES) {
      expect(slugs.has(venue.slug)).toBe(true);
    }
  });

  it('parses every venue with VenueLiteSchema', () => {
    for (const { venue } of EXPLORE_PLACES) {
      expect(VenueLiteSchema.safeParse(venue).success).toBe(true);
    }
  });

  it('uses unique ids and slugs', () => {
    const ids = EXPLORE_PLACES.map((p) => p.venue.id);
    const slugs = EXPLORE_PLACES.map((p) => p.venue.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('keeps every place coordinate inside Bali', () => {
    const outside = EXPLORE_PLACES.filter((p) => !isInsideBali(p.venue.lat, p.venue.lng)).map(
      (p) => p.venue.slug,
    );
    expect(outside).toEqual([]);
  });

  it('gives each place 1-3 known vibe tags and a sane crowd profile', () => {
    for (const { venue, vibeTags, crowd } of EXPLORE_PLACES) {
      expect(vibeTags.length, venue.slug).toBeGreaterThanOrEqual(1);
      expect(vibeTags.length, venue.slug).toBeLessThanOrEqual(3);
      for (const tag of vibeTags) {
        expect(VibeTagSchema.safeParse(tag).success).toBe(true);
      }
      expect(crowd.peakHour).toBeGreaterThanOrEqual(6);
      expect(crowd.peakHour).toBeLessThanOrEqual(19);
      expect(crowd.baseBusyness).toBeGreaterThanOrEqual(3);
      expect(crowd.baseBusyness).toBeLessThanOrEqual(25);
      expect(crowd.peakBusyness).toBeGreaterThan(crowd.baseBusyness);
      expect(crowd.peakBusyness).toBeLessThanOrEqual(100);
    }
  });

  it('puts every vibe tag on at least 6 places', () => {
    for (const tag of VibeTagSchema.options) {
      const count = EXPLORE_PLACES.filter((p) => p.vibeTags.includes(tag)).length;
      expect(count, tag).toBeGreaterThanOrEqual(6);
    }
  });

  it('gives hotspots a peak busyness of at least 85', () => {
    for (const { venue, crowd } of EXPLORE_PLACES.filter((p) => p.venue.isHotspot)) {
      expect(crowd.peakBusyness, venue.slug).toBeGreaterThanOrEqual(85);
    }
  });

  it('tags every MSME with CULINARY or HERITAGE', () => {
    const msmes = EXPLORE_PLACES.filter((p) => p.venue.kind === 'MSME');
    expect(msmes.length).toBeGreaterThan(0);
    for (const { venue, vibeTags } of msmes) {
      const ok = vibeTags.includes('CULINARY') || vibeTags.includes('HERITAGE');
      expect(ok, venue.slug).toBe(true);
    }
  });

  it('serves DTW images only from known public folders', () => {
    for (const { venue } of EXPLORE_PLACES.filter((p) => p.venue.kind === 'DTW')) {
      const ok = ['/venues/', '/presets/', '/places/'].some((prefix) =>
        venue.imageUrl.startsWith(prefix),
      );
      expect(ok, venue.slug).toBe(true);
    }
  });

  it('covers all nine regencies', () => {
    const regencies = new Set(EXPLORE_PLACES.map((p) => p.venue.regencyId));
    for (const regency of MOCK_REGENCIES) {
      expect(regencies.has(regency.id), regency.id).toBe(true);
    }
    expect(MOCK_REGENCIES).toHaveLength(9);
  });
});

describe('explore mock areas', () => {
  it('keeps every area coordinate inside Bali', () => {
    const outside = MOCK_AREAS.filter((a) => !isInsideBali(a.lat, a.lng)).map((a) => a.id);
    expect(outside).toEqual([]);
  });

  it('uses unique area ids and known regencies', () => {
    const ids = MOCK_AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set(MOCK_REGENCIES.map((r) => r.id));
    for (const area of MOCK_AREAS) {
      expect(known.has(area.regencyId), area.id).toBe(true);
    }
  });

  it('covers all nine regencies', () => {
    const regencies = new Set(MOCK_AREAS.map((a) => a.regencyId));
    expect(regencies.size).toBe(9);
  });

  it('marks exactly 8 popular start areas', () => {
    const popular = MOCK_AREAS.filter((a) => a.isPopularStart).map((a) => a.id);
    expect(popular.sort()).toEqual(
      ['canggu', 'denpasar', 'jimbaran', 'kuta', 'nusa-dua', 'sanur', 'seminyak', 'ubud'].sort(),
    );
  });
});
