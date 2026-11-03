import { describe, expect, it } from 'vitest';
import { toWita, TripPlanSchema, type TripRequest } from '../index';
import { crowdCurve } from './explore';
import { evaluateTrip, type TripContext } from './trip';
import { placeBySlug } from './testCatalog';

const UBUD = { lat: -8.5069, lng: 115.2625 };
const SATURDAY_11 = '2026-11-07T11:00:00+08:00';
const PATH = [UBUD, { lat: -8.45, lng: 115.28 }];

function request(): TripRequest {
  return {
    origin: UBUD,
    originLabel: 'Ubud',
    departAt: SATURDAY_11,
    stops: [{ venueId: placeBySlug('tegallalang').venue.id }],
  };
}

const BASE: TripContext = { surge: false, tier: 'FORECAST' };

describe('legOverride hook', () => {
  it('replaces the estimate and exposes path and tier on the leg', () => {
    const plan = TripPlanSchema.parse(
      evaluateTrip(request(), {
        ...BASE,
        legOverride: () => ({ distanceKm: 20, freeFlowMinutes: 33, path: PATH, tier: 'HISTORIC' }),
      }),
    );
    const leg = plan.stops[0]?.leg;
    expect(leg?.distanceKm).toBe(20);
    expect(leg?.travelMinutes).toBe(33);
    expect(leg?.path).toEqual(PATH);
    expect(leg?.tier).toBe('HISTORIC');
  });

  it('uses liveDelayMinutes instead of the penalty-window delay', () => {
    const live = evaluateTrip(request(), {
      ...BASE,
      legOverride: () => ({
        distanceKm: 20,
        freeFlowMinutes: 30,
        liveDelayMinutes: 7,
        tier: 'LIVE',
      }),
    });
    expect(live.stops[0]?.leg.corridorDelayMinutes).toBe(7);
  });

  it('leaves legs without an override on the estimate and without tier', () => {
    const leg = evaluateTrip(request(), BASE).stops[0]?.leg;
    expect(leg?.tier).toBeUndefined();
    expect(leg?.path).toBeUndefined();
  });
});

describe('crowdMultiplier hook', () => {
  it('scales the curve and stays within 0-100', () => {
    const seed = placeBySlug('tegallalang');
    const at = toWita(SATURDAY_11);
    const base = crowdCurve(seed, at);
    const lifted = crowdCurve(seed, at, 1.5);
    expect(Math.max(...lifted)).toBeGreaterThanOrEqual(Math.max(...base));
    expect(lifted.every((v) => v >= 0 && v <= 100)).toBe(true);
    expect(lifted).not.toEqual(base);
    expect(crowdCurve(seed, at)).toEqual(base);
  });

  it('flows through trip evaluation', () => {
    const calm = evaluateTrip(request(), { ...BASE, crowdMultiplier: () => 0.2 });
    const busy = evaluateTrip(request(), { ...BASE, crowdMultiplier: () => 3 });
    expect(busy.stops[0]?.place.crowd.busynessPct ?? 0).toBeGreaterThan(
      calm.stops[0]?.place.crowd.busynessPct ?? 0,
    );
  });
});
