import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  DepartureScanSchema,
  TripInsightSchema,
  CopilotReplySchema,
  CopilotRequestSchema,
  CorridorSchema,
  haversineKm,
  NearbyPlaceSchema,
  PlaceSearchQuerySchema,
  SavedTripPlanSchema,
  SaveTripPlanInputSchema,
  toWita,
  TripPlanSchema,
  TripRequestSchema,
  type NearbyPlace,
  type SavedTripPlan,
} from '@margi-ai/shared';
import { MOCK_CORRIDORS } from '../data/corridors';
import { EXPLORE_PLACES } from '../data/places';
import {
  buildCopilotReply,
  evaluateTrip,
  scanDepartures,
  suggestFor,
  toNearbyPlace,
  UnknownVenueError,
  type TripContext,
} from '@margi-ai/shared/engine';
import { apiError, checkCsrf, ok } from '../respond';
import { getScenarioConfig } from '../scenario';

/** Simulated LLM latency (a real tool-calling reply takes a few seconds), in ms. */
const COPILOT_THINK_MS = 1800;
const NO_CONTENT_LATENCY_MS = 100;
const MAX_SEARCH_RESULTS = 8;
const PLANS_STORAGE_KEY = 'margi_mock_trip_plans';
const SavedPlansSchema = z.array(SavedTripPlanSchema);

function tripContext(): TripContext {
  const { scenario } = getScenarioConfig();
  const surge = scenario === 'surge';
  return { surge, tier: surge || scenario === 'simulate' ? 'SIMULATION' : 'FORECAST' };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    // A malformed body is a validation failure, reported by the schema check below.
    return null;
  }
}

function queryOf(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

/** Lower-case, accent-free form so "pura" matches "Purá" and vice versa. */
function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function searchPlaces(q: string, lat: number, lng: number): NearbyPlace[] {
  const needle = foldText(q);
  const ctx = { origin: { lat, lng }, at: toWita(new Date()), vibes: [], ...tripContext() };
  return EXPLORE_PLACES.filter(
    (seed) =>
      foldText(seed.venue.nameEn).includes(needle) || foldText(seed.venue.nameId).includes(needle),
  )
    .sort((a, b) => haversineKm(ctx.origin, a.venue) - haversineKm(ctx.origin, b.venue))
    .slice(0, MAX_SEARCH_RESULTS)
    .map((seed) => toNearbyPlace(seed, ctx));
}

// Guest-first saved plans: sessionStorage when available, memory otherwise (private mode, Node).
let memoryPlans: SavedTripPlan[] = [];

function readPlans(): SavedTripPlan[] {
  try {
    const raw = globalThis.sessionStorage.getItem(PLANS_STORAGE_KEY);
    if (raw === null) return [];
    const parsed = SavedPlansSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return memoryPlans;
  }
}

function writePlans(plans: SavedTripPlan[]): void {
  memoryPlans = plans;
  try {
    globalThis.sessionStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // Storage unavailable or full: the in-memory copy above stays authoritative.
  }
}

function newPlanId(): string {
  const entropy = Math.floor(Math.random() * 36 ** 4).toString(36);
  return `plan-${Date.now().toString(36)}${entropy}`;
}

function notFoundIfUnknownVenue(error: unknown): Promise<Response> {
  if (error instanceof UnknownVenueError) {
    return apiError('NOT_FOUND', 404, `Unknown venue ${error.venueId}`);
  }
  throw error;
}

/** Trip planner and MARGI Copilot endpoints (DECISIONS D-026). */
export const tripHandlers = [
  http.post('*/api/v1/trips/evaluate', async ({ request }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;
    const body = TripRequestSchema.safeParse(await readJson(request));
    if (!body.success) return apiError('VALIDATION_FAILED', 400, 'Invalid trip request');
    try {
      return await ok(TripPlanSchema.parse(evaluateTrip(body.data, tripContext())));
    } catch (error) {
      return notFoundIfUnknownVenue(error);
    }
  }),

  http.post('*/api/v1/trips/insight', async ({ request }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;
    const body = TripRequestSchema.safeParse(await readJson(request));
    if (!body.success) return apiError('VALIDATION_FAILED', 400, 'Invalid trip request');
    try {
      const suggestions = suggestFor('REVIEW_PLAN', body.data, tripContext());
      return await ok(TripInsightSchema.parse({ suggestions }));
    } catch (error) {
      return notFoundIfUnknownVenue(error);
    }
  }),

  http.post('*/api/v1/trips/departures', async ({ request }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;
    const body = TripRequestSchema.safeParse(await readJson(request));
    if (!body.success) return apiError('VALIDATION_FAILED', 400, 'Invalid trip request');
    try {
      return await ok(DepartureScanSchema.parse(scanDepartures(body.data, tripContext())));
    } catch (error) {
      return notFoundIfUnknownVenue(error);
    }
  }),

  http.post('*/api/v1/copilot/reply', async ({ request }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;
    const { scenario, latencyMultiplier } = getScenarioConfig();
    if (scenario === 'error_500') return apiError('INTERNAL', 500, 'Copilot failed');
    const body = CopilotRequestSchema.safeParse(await readJson(request));
    if (!body.success) return apiError('VALIDATION_FAILED', 400, 'Invalid copilot request');
    if (latencyMultiplier > 0) await delay(COPILOT_THINK_MS * latencyMultiplier);
    try {
      return await ok(CopilotReplySchema.parse(buildCopilotReply(body.data, tripContext())));
    } catch (error) {
      return notFoundIfUnknownVenue(error);
    }
  }),

  http.get('*/api/v1/explore/corridors', () => ok(z.array(CorridorSchema).parse(MOCK_CORRIDORS))),

  http.get('*/api/v1/explore/search', ({ request }) => {
    const query = PlaceSearchQuerySchema.safeParse(queryOf(request));
    if (!query.success) return apiError('VALIDATION_FAILED', 400, 'Invalid search query');
    const { q, lat, lng } = query.data;
    return ok(z.array(NearbyPlaceSchema).parse(searchPlaces(q, lat, lng)));
  }),

  http.get('*/api/v1/trips/plans', () => ok(SavedPlansSchema.parse(readPlans()))),

  http.post('*/api/v1/trips/plans', async ({ request }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;
    const body = SaveTripPlanInputSchema.safeParse(await readJson(request));
    if (!body.success) return apiError('VALIDATION_FAILED', 400, 'Invalid trip plan');
    try {
      const plan = evaluateTrip(body.data.request, tripContext());
      const saved = SavedTripPlanSchema.parse({
        ...body.data,
        id: newPlanId(),
        savedAt: toWita(new Date()).toISO({ suppressMilliseconds: true }),
        metrics: plan.metrics,
        stopNames: plan.stops.map((stop) => ({
          en: stop.place.venue.nameEn,
          id: stop.place.venue.nameId,
        })),
      });
      writePlans([saved, ...readPlans()]);
      return await ok(saved, { status: 201 });
    } catch (error) {
      return notFoundIfUnknownVenue(error);
    }
  }),

  http.delete('*/api/v1/trips/plans/:id', async ({ request, params }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;
    const plans = readPlans();
    const remaining = plans.filter((plan) => plan.id !== String(params.id));
    if (remaining.length === plans.length) return apiError('NOT_FOUND', 404, 'Plan not found');
    writePlans(remaining);
    const { latencyMultiplier } = getScenarioConfig();
    if (latencyMultiplier > 0) await delay(NO_CONTENT_LATENCY_MS * latencyMultiplier);
    return new HttpResponse(null, { status: 204 });
  }),
];
