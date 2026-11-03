import { describe, expect, it } from 'vitest';
import { clusterPins, type ScreenPin } from './clusterPins';

const RADIUS_PX = 44;
const none = new Set<string>();

describe('clusterPins', () => {
  it('keeps pins that are far apart as singles', () => {
    const pins: ScreenPin[] = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 0, y: 100 },
    ];
    expect(clusterPins(pins, { radiusPx: RADIUS_PX, excludedIds: none })).toEqual([
      { kind: 'single', id: 'a' },
      { kind: 'single', id: 'b' },
      { kind: 'single', id: 'c' },
    ]);
  });

  it('merges pins within the radius of the seed, in input order', () => {
    const pins: ScreenPin[] = [
      { id: 'near', x: 0, y: 0 },
      { id: 'far', x: 300, y: 300 },
      { id: 'close', x: 20, y: 20 },
      { id: 'edge', x: 30, y: -30 },
    ];
    expect(clusterPins(pins, { radiusPx: RADIUS_PX, excludedIds: none })).toEqual([
      { kind: 'cluster', ids: ['near', 'close', 'edge'] },
      { kind: 'single', id: 'far' },
    ]);
  });

  it('never merges excluded pins, even when they overlap others', () => {
    const pins: ScreenPin[] = [
      { id: 'active', x: 0, y: 0 },
      { id: 'b', x: 5, y: 5 },
      { id: 'c', x: 10, y: 0 },
      { id: 'target', x: 8, y: 8 },
    ];
    const groups = clusterPins(pins, {
      radiusPx: RADIUS_PX,
      excludedIds: new Set(['active', 'target']),
    });
    expect(groups).toEqual([
      { kind: 'single', id: 'active' },
      { kind: 'cluster', ids: ['b', 'c'] },
      { kind: 'single', id: 'target' },
    ]);
  });

  it('returns a group whose neighbours were all taken as a single', () => {
    // `b` is close to both, but `a` seeds first and absorbs it, leaving `c` alone.
    const pins: ScreenPin[] = [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 40, y: 0 },
      { id: 'c', x: 80, y: 0 },
    ];
    expect(clusterPins(pins, { radiusPx: RADIUS_PX, excludedIds: none })).toEqual([
      { kind: 'cluster', ids: ['a', 'b'] },
      { kind: 'single', id: 'c' },
    ]);
  });
});
