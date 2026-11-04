import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toWita } from '../index';
import { setCatalog, setEmbeddings, vibeSimilarity, type CatalogPlace } from './catalog';
import { TEST_CATALOG } from './testCatalog';
import { buildPlaceDetail, type ExploreContext } from './explore';

describe('vibeSimilarity', () => {
  beforeEach(() => {
    setEmbeddings({ a: [1, 0], b: [1, 0], c: [0, 1], d: [0.8, 0.6] });
  });

  it('is 100 for identical directions and 0 for orthogonal vectors', () => {
    expect(vibeSimilarity('a', 'b')).toBe(100);
    expect(vibeSimilarity('a', 'c')).toBe(0);
  });

  it('is symmetric and calibrated between the bounds', () => {
    // cos(a, d) = 0.8 -> (0.8 - 0.6) / 0.3 * 100
    expect(vibeSimilarity('a', 'd')).toBeCloseTo(66.67, 1);
    expect(vibeSimilarity('d', 'a')).toBe(vibeSimilarity('a', 'd'));
  });

  it('is null when either embedding is missing or incomparable', () => {
    expect(vibeSimilarity('a', 'missing')).toBeNull();
    expect(vibeSimilarity('missing', 'a')).toBeNull();
    setEmbeddings({ a: [1, 0], z: [0, 0], w: [1, 0, 0] });
    expect(vibeSimilarity('a', 'z')).toBeNull();
    expect(vibeSimilarity('a', 'w')).toBeNull();
  });
});

describe('alternatives ranked by embedding similarity', () => {
  const ctx: ExploreContext = {
    origin: { lat: -8.5069, lng: 115.2625 },
    at: toWita('2026-11-07T11:00:00+08:00'),
    vibes: [],
    surge: false,
    tier: 'FORECAST',
  };
  const real = TEST_CATALOG.places;
  const busy = real.find((p) => p.venue.kind === 'DTW' && p.venue.isHotspot);
  if (!busy) throw new Error('fixture needs a hotspot');
  const busyId = busy.venue.id;
  const candidates = real.filter(
    (p) =>
      p.venue.kind === 'DTW' &&
      p.venue.id !== busyId &&
      p.vibeTags.some((tag) => busy.vibeTags.includes(tag)),
  );

  afterEach(() => {
    setCatalog(TEST_CATALOG);
  });

  function alternativesWith(vectors: Record<string, number[]>) {
    setCatalog({ ...TEST_CATALOG, places: [busy as CatalogPlace, ...candidates] });
    setEmbeddings(vectors);
    return buildPlaceDetail(busyId, ctx)?.alternatives ?? [];
  }

  it('drops candidates without an embedding and never falls back to tags', () => {
    expect(alternativesWith({ [busyId]: [1, 0] })).toEqual([]);
  });

  it('reports the calibrated cosine as an integer similarity, best match first', () => {
    // Every candidate gets a vector at a distinct angle; the closer the angle, the higher the rank
    // component, so similarity must be non-increasing with distance from the target direction.
    const vectors: Record<string, number[]> = { [busyId]: [1, 0] };
    candidates.forEach((p, i) => {
      const angle = (i / Math.max(1, candidates.length)) * 0.6;
      vectors[p.venue.id] = [Math.cos(angle), Math.sin(angle)];
    });
    const alternatives = alternativesWith(vectors);
    expect(alternatives.length).toBeGreaterThan(0);
    for (const alt of alternatives) {
      expect(Number.isInteger(alt.similarity)).toBe(true);
      expect(alt.similarity).toBeGreaterThanOrEqual(0);
      expect(alt.similarity).toBeLessThanOrEqual(100);
      expect(alt.similarity).toBe(Math.round(vibeSimilarity(busyId, alt.place.venue.id) as number));
    }
  });
});
