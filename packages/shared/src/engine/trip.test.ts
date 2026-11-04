import { describe, expect, it } from 'vitest';
import {
  applyTripChange,
  toWita,
  TripPlanSchema,
  TripSuggestionSchema,
  type CopilotIntent,
  type TripPlan,
  type TripRequest,
  type TripSuggestion,
} from '../index';
import { TEST_CATALOG } from './testCatalog';
const EXPLORE_PLACES = TEST_CATALOG.places;
import {
  evaluateTrip,
  reorderObjective,
  roadMinutesOf,
  suggestFor,
  UnknownVenueError,
  type TripContext,
} from './trip';

const UBUD = { lat: -8.5069, lng: 115.2625 };
// 2026-11-07 is a Saturday (WITA day 5), so weekend crowd levels apply.
const SATURDAY_09 = '2026-11-07T09:00:00+08:00';
const SATURDAY_11 = '2026-11-07T11:00:00+08:00';
const SATURDAY_07 = '2026-11-07T07:00:00+08:00';
const FORECAST: TripContext = { surge: false, tier: 'FORECAST' };

function idOf(slug: string): string {
  const seed = EXPLORE_PLACES.find((candidate) => candidate.venue.slug === slug);
  if (!seed) throw new Error(`Missing fixture place ${slug}`);
  return seed.venue.id;
}

/** Any OSM-imported business in the catalogue; tests assert behaviour, not a specific shop. */
function anyMsme() {
  const msme = EXPLORE_PLACES.find((candidate) => candidate.venue.kind === 'MSME');
  if (!msme) throw new Error('Catalogue has no MSME');
  return msme;
}

function trip(departAt: string, slugs: readonly string[]): TripRequest {
  return {
    origin: UBUD,
    originLabel: 'Ubud',
    departAt,
    stops: slugs.map((slug) => ({ venueId: idOf(slug) })),
  };
}

const UBUD_DAY_TRIP = trip(SATURDAY_09, ['tegallalang', 'pura-tirta-empul', 'ubud-monkey-forest']);
const STUCK_IN_UBUD = trip(SATURDAY_11, ['tegallalang', 'pura-tirta-empul']);
const FIVE_STOPS = trip(SATURDAY_09, [
  'tegallalang',
  'pura-tirta-empul',
  'ubud-monkey-forest',
  'goa-gajah',
  'air-terjun-tegenungan',
]);

function minutesBetween(from: string, to: string): number {
  return Math.round(toWita(to).diff(toWita(from), 'minutes').minutes);
}

function expectConsistent(request: TripRequest, before: TripPlan, suggestion: TripSuggestion) {
  expect(TripSuggestionSchema.safeParse(suggestion).success).toBe(true);
  const after = evaluateTrip(applyTripChange(request, suggestion.change), FORECAST).metrics;
  expect(suggestion.after).toEqual(after);
  expect(suggestion.delta).toEqual({
    crowdExposurePts: after.crowdExposure - before.metrics.crowdExposure,
    travelMinutes: roadMinutesOf(after) - roadMinutesOf(before.metrics),
    redZoneStops: after.redZoneStops - before.metrics.redZoneStops,
  });
  expect(suggestion.delta.redZoneStops).toBeLessThanOrEqual(0);
}

describe('evaluateTrip', () => {
  it('chains legs, dwell and arrivals in order and sums the metrics', () => {
    const plan = TripPlanSchema.parse(evaluateTrip(UBUD_DAY_TRIP, FORECAST));
    expect(plan.stops).toHaveLength(3);

    let previousLeave = UBUD_DAY_TRIP.departAt;
    for (const stop of plan.stops) {
      const drive = stop.leg.travelMinutes + stop.leg.corridorDelayMinutes;
      expect(minutesBetween(previousLeave, stop.arriveAt)).toBe(drive);
      expect(minutesBetween(stop.arriveAt, stop.leaveAt)).toBe(stop.dwellMinutes);
      expect(stop.arriveAt.endsWith('+08:00')).toBe(true);
      previousLeave = stop.leaveAt;
    }

    const sum = (pick: (s: (typeof plan.stops)[number]) => number) =>
      plan.stops.reduce((total, stop) => total + pick(stop), 0);
    expect(plan.metrics.totalTravelMinutes).toBe(sum((s) => s.leg.travelMinutes));
    expect(plan.metrics.totalDelayMinutes).toBe(sum((s) => s.leg.corridorDelayMinutes));
    expect(plan.metrics.endAt).toBe(plan.stops[2]?.leaveAt);
  });

  it('adds the Ubud corridor delay only inside its 10:00-21:00 window', () => {
    const late = evaluateTrip(trip(SATURDAY_11, ['goa-gajah']), FORECAST);
    const early = evaluateTrip(trip(SATURDAY_07, ['goa-gajah']), FORECAST);

    expect(late.stops[0]?.leg.corridorDelayMinutes).toBe(45);
    expect(late.stops[0]?.leg.corridorIds).toEqual(['ubud-raya']);
    expect(early.stops[0]?.leg.corridorDelayMinutes).toBe(0);
    expect(early.stops[0]?.leg.corridorIds).toEqual([]);
    // The corridor is still returned for drawing even when it is quiet.
    expect(early.corridors.map((corridor) => corridor.id)).toContain('ubud-raya');
    expect(late.stops[0]?.crowdFriction).toBeGreaterThanOrEqual(early.stops[0]?.crowdFriction ?? 0);
  });

  it('weights crowd exposure by dwell over DTW stops only', () => {
    const request: TripRequest = {
      ...trip(SATURDAY_09, []),
      stops: [
        { venueId: idOf('tegallalang'), dwellMinutes: 120 },
        { venueId: anyMsme().venue.id, dwellMinutes: 30 },
        { venueId: idOf('pura-gunung-kawi-sebatu'), dwellMinutes: 40 },
      ],
    };
    const plan = evaluateTrip(request, FORECAST);
    const dtw = plan.stops.filter((stop) => stop.place.venue.kind === 'DTW');
    const weighted = dtw.reduce((sum, s) => sum + s.place.crowd.busynessPct * s.dwellMinutes, 0);
    const dwell = dtw.reduce((sum, s) => sum + s.dwellMinutes, 0);

    expect(plan.metrics.crowdExposure).toBe(Math.round(weighted / dwell));
    expect(plan.metrics.msmeStops).toBe(1);
    expect(plan.stops[1]?.dwellMinutes).toBe(30);
  });

  it('labels surge readings as simulation and keeps exposure within 0-100', () => {
    const plan = evaluateTrip(UBUD_DAY_TRIP, { surge: true, tier: 'SIMULATION' });
    expect(plan.stops[0]?.place.crowd.busynessPct).toBe(115);
    expect(plan.stops[0]?.place.crowd.tier).toBe('SIMULATION');
    expect(plan.metrics.crowdExposure).toBeLessThanOrEqual(100);
  });

  it('throws a typed error for an unknown venue', () => {
    const request: TripRequest = {
      ...UBUD_DAY_TRIP,
      stops: [{ venueId: '0192e2b0-8c20-7193-8db6-000000000000' }],
    };
    expect(() => evaluateTrip(request, FORECAST)).toThrow(UnknownVenueError);
  });
});

describe('suggestFor', () => {
  const cases: readonly { intent: CopilotIntent; request: TripRequest }[] = [
    { intent: 'REVIEW_PLAN', request: UBUD_DAY_TRIP },
    { intent: 'BEST_TIME', request: UBUD_DAY_TRIP },
    { intent: 'QUIETER', request: UBUD_DAY_TRIP },
    { intent: 'ADD_FOOD', request: UBUD_DAY_TRIP },
    { intent: 'SUNSET', request: UBUD_DAY_TRIP },
    { intent: 'STUCK_IN_TRAFFIC', request: STUCK_IN_UBUD },
    { intent: 'REVIEW_PLAN', request: FIVE_STOPS },
  ];

  it.each(cases)('$intent returns consistent, improving suggestions', ({ intent, request }) => {
    const before = evaluateTrip(request, FORECAST);
    const suggestions = suggestFor(intent, request, FORECAST);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    expect(new Set(suggestions.map((s) => s.id)).size).toBe(suggestions.length);

    for (const suggestion of suggestions) {
      expectConsistent(request, before, suggestion);
      const { crowdExposurePts } = suggestion.delta;
      const delayDelta = suggestion.after.totalDelayMinutes - before.metrics.totalDelayMinutes;
      switch (suggestion.reason) {
        case 'QUIETER_HOUR':
        case 'RED_ZONE_AT_ARRIVAL':
          expect(crowdExposurePts).toBeLessThan(0);
          break;
        case 'SIMILAR_CALMER':
        case 'CORRIDOR_GRIDLOCK':
          expect(crowdExposurePts < 0 || delayDelta < 0).toBe(true);
          expect(crowdExposurePts).toBeLessThanOrEqual(0);
          break;
        case 'BETTER_ORDER':
          expect(crowdExposurePts).toBeLessThanOrEqual(0);
          expect(suggestion.delta.travelMinutes).toBeLessThanOrEqual(0);
          break;
        case 'SUPPORT_LOCAL':
          expect(suggestion.after.msmeStops).toBe(before.metrics.msmeStops + 1);
          expect(suggestion.venue?.venue.kind).toBe('MSME');
          expect(crowdExposurePts).toBeLessThanOrEqual(0);
          break;
        case 'GOLDEN_HOUR':
          expect(suggestion.venue?.vibeTags).toContain('SUNSET');
          break;
      }
    }
  });

  it('never proposes a worse order', () => {
    for (const request of [UBUD_DAY_TRIP, FIVE_STOPS, STUCK_IN_UBUD]) {
      const before = evaluateTrip(request, FORECAST).metrics;
      const reorders = suggestFor('REVIEW_PLAN', request, FORECAST).filter(
        (s) => s.change.kind === 'REORDER',
      );
      for (const reorder of reorders) {
        expect(reorder.after.crowdExposure).toBeLessThanOrEqual(before.crowdExposure);
        expect(roadMinutesOf(reorder.after)).toBeLessThanOrEqual(roadMinutesOf(before));
        expect(reorderObjective(reorder.after)).toBeLessThan(reorderObjective(before));
      }
    }
  });

  it('lands golden-hour additions between 17:00 and 18:15', () => {
    const [sunset] = suggestFor('SUNSET', UBUD_DAY_TRIP, FORECAST);
    if (!sunset) throw new Error('Expected a sunset suggestion');
    expect(sunset.change.kind).toBe('ADD_STOP');
    const plan = evaluateTrip(applyTripChange(UBUD_DAY_TRIP, sunset.change), FORECAST);
    const arrival = toWita(plan.stops[plan.stops.length - 1]?.arriveAt ?? '').toFormat('HH:mm');
    expect(arrival >= '17:00' && arrival <= '18:15').toBe(true);
  });

  it('waits out the Ubud gridlock at a local business first', () => {
    const [first] = suggestFor('STUCK_IN_TRAFFIC', STUCK_IN_UBUD, FORECAST);
    expect(first?.reason).toBe('CORRIDOR_GRIDLOCK');
    expect(first?.change).toMatchObject({ kind: 'ADD_STOP', atIndex: 0, dwellMinutes: 90 });
    expect(first?.venue?.venue.kind).toBe('MSME');
  });

  it('falls back to a plan review when the traveller is not inside an active corridor', () => {
    const stuck = suggestFor('STUCK_IN_TRAFFIC', UBUD_DAY_TRIP, FORECAST);
    expect(stuck.every((s) => s.reason !== 'CORRIDOR_GRIDLOCK')).toBe(true);
  });

  it.each(['GREETING', 'EXPLAIN', 'UNKNOWN'] as const)('%s proposes nothing', (intent) => {
    expect(suggestFor(intent, UBUD_DAY_TRIP, FORECAST)).toEqual([]);
  });
});
