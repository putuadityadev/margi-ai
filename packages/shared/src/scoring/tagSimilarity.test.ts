import { describe, expect, it } from 'vitest';
import { tagSimilarity } from './index';

describe('tagSimilarity (D-025)', () => {
  it('scores identical sets as 100', () => {
    expect(tagSimilarity(['NATURE', 'SPIRITUAL'], ['SPIRITUAL', 'NATURE'])).toBe(100);
  });

  it('scores partial overlap as intersection over union', () => {
    expect(tagSimilarity(['NATURE', 'SPIRITUAL'], ['NATURE', 'BEACH'])).toBeCloseTo(33.33, 2);
  });

  it('scores disjoint and empty sets as 0', () => {
    expect(tagSimilarity(['BEACH'], ['WATERFALL'])).toBe(0);
    expect(tagSimilarity([], [])).toBe(0);
  });

  it('ignores duplicate tags', () => {
    expect(tagSimilarity(['NATURE', 'NATURE'], ['NATURE'])).toBe(100);
  });
});

describe('isInBali (D-025)', () => {
  it('accepts Ubud and Nusa Penida, rejects Jakarta and Lombok', async () => {
    const { isInBali } = await import('./index');
    expect(isInBali({ lat: -8.5069, lng: 115.2625 })).toBe(true);
    expect(isInBali({ lat: -8.7278, lng: 115.5444 })).toBe(true);
    expect(isInBali({ lat: -6.2, lng: 106.8166 })).toBe(false);
    expect(isInBali({ lat: -8.65, lng: 116.32 })).toBe(false);
  });
});
