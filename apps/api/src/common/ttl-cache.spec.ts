import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('returns a value until its TTL elapses', () => {
    const cache = new TtlCache<number>(1_000);
    cache.set('a', 1, 0);
    expect(cache.get('a', 999)).toBe(1);
    expect(cache.get('a', 1_000)).toBeUndefined();
  });

  it('evicts the oldest entry beyond the size cap', () => {
    const cache = new TtlCache<number>(10_000, 2);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    cache.set('c', 3, 0);
    expect(cache.get('a', 1)).toBeUndefined();
    expect(cache.get('c', 1)).toBe(3);
  });
});
