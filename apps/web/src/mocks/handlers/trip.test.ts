import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CopilotReplySchema,
  CorridorSchema,
  NearbyPlaceSchema,
  SavedTripPlanSchema,
  TripPlanSchema,
  type SaveTripPlanInput,
  type TripRequest,
} from '@margi-ai/shared';
import { EXPLORE_PLACES } from '../data/places';
import { server } from '../node';
import { setLatencyMultiplier, setMockScenario } from '../scenario';

const API = 'http://localhost/api/v1';
const CSRF = { 'X-Requested-With': 'margi-ai', 'Content-Type': 'application/json' };

function idOf(slug: string): string {
  const seed = EXPLORE_PLACES.find((candidate) => candidate.venue.slug === slug);
  if (!seed) throw new Error(`Missing fixture place ${slug}`);
  return seed.venue.id;
}

const TRIP: TripRequest = {
  origin: { lat: -8.5069, lng: 115.2625 },
  originLabel: 'Ubud',
  departAt: '2026-11-07T09:00:00+08:00',
  stops: [{ venueId: idOf('tegallalang') }, { venueId: idOf('pura-tirta-empul') }],
};

function post(path: string, body: unknown, headers: Record<string, string> = CSRF) {
  return fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setLatencyMultiplier(0);
});

describe('trip mock handlers (D-026)', () => {
  it('rejects mutations without the CSRF header', async () => {
    const response = await post('/trips/evaluate', TRIP, { 'Content-Type': 'application/json' });
    expect(response.status).toBe(403);
  });

  it('validates the body and unknown venues', async () => {
    expect((await post('/trips/evaluate', { ...TRIP, stops: [] })).status).toBe(400);
    const unknown = { ...TRIP, stops: [{ venueId: '0192e2b0-8c20-7193-8db6-000000000000' }] };
    expect((await post('/trips/evaluate', unknown)).status).toBe(404);
  });

  it('evaluates a trip', async () => {
    const response = await post('/trips/evaluate', TRIP);
    expect(response.status).toBe(200);
    const plan = TripPlanSchema.parse(await response.json());
    expect(plan.stops).toHaveLength(2);
  });

  it('replies as the copilot and honours the error scenario', async () => {
    const body = { trip: TRIP, situation: 'HAS_PLAN', locale: 'en', message: 'cek rencanaku' };
    const response = await post('/copilot/reply', body);
    expect(response.status).toBe(200);
    const reply = CopilotReplySchema.parse(await response.json());
    expect(reply.intent).toBe('REVIEW_PLAN');
    expect(reply.source).toBe('TEMPLATE');

    setMockScenario('error_500');
    expect((await post('/copilot/reply', body)).status).toBe(500);
  });

  it('serves corridors and name search', async () => {
    const corridors = z
      .array(CorridorSchema)
      .parse(await (await fetch(`${API}/explore/corridors`)).json());
    expect(corridors.length).toBeGreaterThanOrEqual(6);

    const search = await fetch(`${API}/explore/search?q=TIRTA&lat=-8.5069&lng=115.2625`);
    const places = z.array(NearbyPlaceSchema).parse(await search.json());
    expect(places.length).toBeGreaterThan(0);
    expect(places.length).toBeLessThanOrEqual(8);
    expect(places.map((place) => place.venue.slug)).toContain('pura-tirta-empul');
    const distances = places.map((place) => place.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));

    expect((await fetch(`${API}/explore/search?q=&lat=0&lng=0`)).status).toBe(400);
  });

  it('saves, lists and deletes a plan', async () => {
    const input: SaveTripPlanInput = {
      title: 'Saturday in Ubud',
      situation: 'PLAN',
      request: TRIP,
      changeLog: ['Moved departure to 07:30'],
    };
    const created = await post('/trips/plans', input);
    expect(created.status).toBe(201);
    const saved = SavedTripPlanSchema.parse(await created.json());
    expect(saved.id).toMatch(/^plan-[0-9a-z]+$/);
    expect(saved.stopNames[0]?.en).toBe('Tegallalang Rice Terrace');

    const list = z
      .array(SavedTripPlanSchema)
      .parse(await (await fetch(`${API}/trips/plans`)).json());
    expect(list.map((plan) => plan.id)).toEqual([saved.id]);

    const url = `${API}/trips/plans/${saved.id}`;
    expect((await fetch(url, { method: 'DELETE' })).status).toBe(403);
    expect((await fetch(url, { method: 'DELETE', headers: CSRF })).status).toBe(204);
    expect((await fetch(url, { method: 'DELETE', headers: CSRF })).status).toBe(404);
    expect(await (await fetch(`${API}/trips/plans`)).json()).toEqual([]);
  });
});
