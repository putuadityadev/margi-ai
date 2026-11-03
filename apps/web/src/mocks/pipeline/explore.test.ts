import { describe, expect, it } from 'vitest';
import { NearbyPlaceSchema, PlaceDetailSchema, THRESHOLDS, toWita } from '@margi-ai/shared';
import { buildPlaceDetail, crowdCurve, findNearby, type ExploreContext } from './explore';
import { EXPLORE_PLACES } from '../data/places';

const UBUD = { lat: -8.5069, lng: 115.2625 };
// Saturday 11:00 WITA: weekend peak hours, every daytime attraction open.
const SATURDAY_LATE_MORNING = '2026-11-07T11:00:00+08:00';

function context(overrides: Partial<ExploreContext> = {}): ExploreContext {
  return {
    origin: UBUD,
    at: toWita(SATURDAY_LATE_MORNING),
    vibes: [],
    surge: false,
    tier: 'FORECAST',
    ...overrides,
  };
}

function seedBySlug(slug: string) {
  const seed = EXPLORE_PLACES.find((candidate) => candidate.venue.slug === slug);
  if (!seed) throw new Error(`Missing fixture place ${slug}`);
  return seed;
}

describe('explore mock engine (D-025)', () => {
  it('returns schema-valid DTW places sorted nearest first', () => {
    const places = findNearby(context());
    expect(places.length).toBeGreaterThanOrEqual(8);
    for (const place of places) {
      expect(NearbyPlaceSchema.safeParse(place).success).toBe(true);
      expect(place.venue.kind).toBe('DTW');
    }
    const distances = places.map((place) => place.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('filters by mood and only adds MSMEs for local food', () => {
    const beaches = findNearby(context({ vibes: ['BEACH'] }));
    expect(beaches.every((place) => place.vibeTags.includes('BEACH'))).toBe(true);
    expect(beaches.some((place) => place.venue.kind === 'MSME')).toBe(false);

    const food = findNearby(context({ vibes: ['CULINARY'] }));
    expect(food.some((place) => place.venue.kind === 'MSME')).toBe(true);
  });

  it('falls back to the nearest matches when the radius holds too few', () => {
    const gilimanuk = { lat: -8.17, lng: 114.44 };
    expect(findNearby(context({ origin: gilimanuk }), 1)).toHaveLength(8);
  });

  it('reads zero for closed hours', () => {
    const curve = crowdCurve(seedBySlug('tanah-lot'), toWita('2026-11-07T03:00:00+08:00'));
    expect(curve[3]).toBe(0);
    expect(curve).toHaveLength(24);
  });

  it('offers clearly calmer alternatives that share a mood with a busy place', () => {
    const busy = findNearby(context()).find(
      (place) => place.crowd.busynessPct > THRESHOLDS.calmMax,
    );
    if (!busy) throw new Error('Fixture expects at least one busy place near Ubud on Saturday');
    const detail = buildPlaceDetail(busy.venue.id, context());
    expect(detail).not.toBeNull();
    expect(PlaceDetailSchema.safeParse(detail).success).toBe(true);
    for (const alternative of detail?.alternatives ?? []) {
      expect(alternative.crowdDropPts).toBeGreaterThanOrEqual(15);
      expect(alternative.sharedVibes.length).toBeGreaterThan(0);
      expect(alternative.place.isOpenNow).toBe(true);
    }
    const ranks = (detail?.alternatives ?? []).map((alternative) => alternative.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
  });

  it('labels surge readings as simulation and lifts hotspots past 100 %', () => {
    const hotspot = EXPLORE_PLACES.find(
      (seed) => seed.venue.isHotspot && seed.venue.regencyId === 'gianyar',
    );
    if (!hotspot) throw new Error('Fixture expects a Gianyar hotspot');
    const detail = buildPlaceDetail(hotspot.venue.id, context({ surge: true, tier: 'SIMULATION' }));
    expect(detail?.place.crowd.busynessPct).toBe(THRESHOLDS.surgePct);
    expect(detail?.place.crowd.tier).toBe('SIMULATION');
    expect(detail?.isRedZone).toBe(true);
  });

  it('returns null for an unknown place', () => {
    expect(buildPlaceDetail('00000000-0000-7000-8000-000000000000', context())).toBeNull();
  });
});
