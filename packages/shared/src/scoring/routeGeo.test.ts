import { describe, expect, it } from 'vitest';
import {
  detourKm,
  distanceToPathKm,
  googleMapsDirUrl,
  googleMapsTripUrl,
  haversineKm,
  pointsAlongPath,
} from './index';

/** Sanur to Ubud, roughly north: a straight leg of about 21 km. */
const SANUR = { lat: -8.6783, lng: 115.2631 };
const UBUD = { lat: -8.5069, lng: 115.2625 };

describe('route corridor geometry', () => {
  it('measures the distance from a point to a straight leg', () => {
    const midpoint = { lat: (SANUR.lat + UBUD.lat) / 2, lng: SANUR.lng };
    expect(distanceToPathKm(midpoint, [SANUR, UBUD])).toBeLessThan(0.05);
    const oneKmEast = { lat: midpoint.lat, lng: midpoint.lng + 1 / (111.32 * Math.cos(0.15)) };
    expect(distanceToPathKm(oneKmEast, [SANUR, UBUD])).toBeCloseTo(1, 1);
  });

  it('clamps to the ends of the leg', () => {
    const south = { lat: SANUR.lat - 0.05, lng: SANUR.lng };
    expect(distanceToPathKm(south, [SANUR, UBUD])).toBeCloseTo(haversineKm(south, SANUR), 1);
  });

  it('treats a one-point path and a zero-length segment as a point', () => {
    expect(distanceToPathKm(UBUD, [SANUR])).toBeCloseTo(haversineKm(UBUD, SANUR), 0);
    expect(distanceToPathKm(UBUD, [SANUR, SANUR])).toBeCloseTo(haversineKm(UBUD, SANUR), 0);
    expect(distanceToPathKm(UBUD, [])).toBe(Number.POSITIVE_INFINITY);
  });

  it('computes the extra distance of a detour, never negative', () => {
    expect(detourKm(SANUR, SANUR, UBUD)).toBe(0);
    const aside = { lat: -8.6, lng: 115.3 };
    expect(detourKm(SANUR, aside, UBUD)).toBeGreaterThan(1);
  });

  it('returns evenly spaced points along a path', () => {
    const [quarter, half] = pointsAlongPath([SANUR, UBUD], [0.25, 0.5]);
    expect(half?.lat).toBeCloseTo((SANUR.lat + UBUD.lat) / 2, 3);
    expect(haversineKm(SANUR, quarter ?? SANUR)).toBeCloseTo(haversineKm(SANUR, UBUD) / 4, 1);
  });

  it('walks across several segments and handles degenerate paths', () => {
    const corner = { lat: SANUR.lat, lng: 115.35 };
    const [end] = pointsAlongPath([SANUR, corner, UBUD], [1]);
    expect(end?.lat).toBeCloseTo(UBUD.lat, 3);
    const [late] = pointsAlongPath([SANUR, corner, UBUD], [0.9]);
    expect(late?.lat).toBeGreaterThan(SANUR.lat);
    expect(late?.lng).toBeLessThan(115.35);
    expect(pointsAlongPath([], [0.5])).toEqual([]);
    expect(pointsAlongPath([SANUR, SANUR], [0.5])).toEqual([SANUR]);
    expect(pointsAlongPath([SANUR], [0.5])).toEqual([SANUR]);
    expect(pointsAlongPath([SANUR, SANUR, UBUD], [0.5])[0]?.lat).toBeCloseTo(
      (SANUR.lat + UBUD.lat) / 2,
      3,
    );
    expect(pointsAlongPath([SANUR, UBUD], [1.5])).toEqual([UBUD]);
  });

  it('links a trip without stops straight to its origin', () => {
    expect(googleMapsTripUrl(SANUR, [])).toBe(googleMapsDirUrl(SANUR));
    expect(googleMapsTripUrl(SANUR, [UBUD])).not.toContain('waypoints');
  });
});
