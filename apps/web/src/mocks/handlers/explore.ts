import { http } from 'msw';
import {
  GeoPointSchema,
  haversineKm,
  isInBali,
  NearbyQuerySchema,
  NearbyResponseSchema,
  PlaceDetailQuerySchema,
  PlaceDetailSchema,
  ReverseGeocodeSchema,
  toWita,
  type Area,
  type GeoPoint,
  type VibeTag,
} from '@margi-ai/shared';
import { MOCK_AREAS } from '../data/areas';
import { buildPlaceDetail, findNearby, type ExploreContext } from '../pipeline/explore';
import { apiError, ok } from '../respond';
import { getScenarioConfig } from '../scenario';

function queryOf(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams);
}

function contextFor(origin: GeoPoint, vibes: readonly VibeTag[], at?: string): ExploreContext {
  const { scenario } = getScenarioConfig();
  const surge = scenario === 'surge';
  return {
    origin,
    vibes,
    at: toWita(at ?? new Date()),
    surge,
    tier: surge || scenario === 'simulate' ? 'SIMULATION' : 'FORECAST',
  };
}

function nearestArea(point: GeoPoint): { area: Area; distanceKm: number } | null {
  let best: { area: Area; distanceKm: number } | null = null;
  for (const area of MOCK_AREAS) {
    const distanceKm = haversineKm(point, area);
    if (!best || distanceKm < best.distanceKm) best = { area, distanceKm };
  }
  return best;
}

export const exploreHandlers = [
  http.get('*/api/v1/explore/nearby', async ({ request }) => {
    if (getScenarioConfig().scenario === 'error_500') {
      return apiError('INTERNAL', 500, 'Explore service failed');
    }
    const query = NearbyQuerySchema.safeParse(queryOf(request));
    if (!query.success) {
      return apiError('VALIDATION_FAILED', 400, 'Invalid nearby query');
    }
    const { lat, lng, radiusKm, vibes, at } = query.data;
    const ctx = contextFor({ lat, lng }, vibes, at);
    return ok(
      NearbyResponseSchema.parse({
        origin: { lat, lng },
        radiusKm,
        generatedAt: ctx.at.toISO() ?? new Date().toISOString(),
        places: findNearby(ctx, radiusKm),
      }),
    );
  }),

  http.get('*/api/v1/explore/places/:venueId', async ({ request, params }) => {
    const query = PlaceDetailQuerySchema.safeParse(queryOf(request));
    if (!query.success) {
      return apiError('VALIDATION_FAILED', 400, 'Invalid place query');
    }
    const { lat, lng, vibes, at } = query.data;
    const detail = buildPlaceDetail(String(params.venueId), contextFor({ lat, lng }, vibes, at));
    if (!detail) {
      return apiError('NOT_FOUND', 404, 'Place not found');
    }
    return ok(PlaceDetailSchema.parse(detail));
  }),

  http.get('*/api/v1/geo/areas', () => ok(MOCK_AREAS)),

  http.get('*/api/v1/geo/reverse', async ({ request }) => {
    const raw = queryOf(request);
    const point = GeoPointSchema.safeParse({ lat: Number(raw.lat), lng: Number(raw.lng) });
    if (!point.success) {
      return apiError('VALIDATION_FAILED', 400, 'Invalid coordinates');
    }
    const nearest = nearestArea(point.data);
    if (!nearest) {
      return apiError('NOT_FOUND', 404, 'No areas configured');
    }
    return ok(
      ReverseGeocodeSchema.parse({
        area: nearest.area,
        distanceKm: Math.round(nearest.distanceKm * 10) / 10,
        isInBali: isInBali(point.data),
      }),
    );
  }),
];
