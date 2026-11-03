import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import type { LegOverride } from '@margi-ai/shared/engine';
import type { GeoPoint } from '@margi-ai/shared';
import { AppException } from '../common/app.exception';
import { httpJson } from '../common/http-json';
import { TtlCache } from '../common/ttl-cache';
import { AppConfig } from '../config/app-config.service';

const TOMTOM_BASE = 'https://api.tomtom.com/routing/1/calculateRoute';
const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
const ROUTE_TIMEOUT_MS = 4_000;
/** Routes are stable for a day; the traffic part is bucketed to 15 minutes (DATA-SOURCES §1). */
const ROUTE_TTL_MS = 15 * 60 * 1000;
const DEPARTURE_BUCKET_MS = 15 * 60 * 1000;
/** A departure within this window of "now" is treated as live traffic, otherwise historic. */
const LIVE_WINDOW_MS = 20 * 60 * 1000;
const MAX_PATH_POINTS = 120;
const COORD_DECIMALS = 4;

const TomTomSchema = z.object({
  routes: z
    .array(
      z.object({
        summary: z.object({
          lengthInMeters: z.number(),
          travelTimeInSeconds: z.number(),
          trafficDelayInSeconds: z.number().optional(),
          noTrafficTravelTimeInSeconds: z.number().optional(),
        }),
        legs: z.array(
          z.object({ points: z.array(z.object({ latitude: z.number(), longitude: z.number() })) }),
        ),
      }),
    )
    .min(1),
});

const OrsSchema = z.object({
  features: z
    .array(
      z.object({
        properties: z.object({ summary: z.object({ distance: z.number(), duration: z.number() }) }),
        geometry: z.object({
          coordinates: z.array(z.tuple([z.number(), z.number()]).rest(z.number())),
        }),
      }),
    )
    .min(1),
});

function keyOf(point: GeoPoint): string {
  return `${point.lat.toFixed(COORD_DECIMALS)},${point.lng.toFixed(COORD_DECIMALS)}`;
}

function downsample(points: GeoPoint[]): GeoPoint[] {
  if (points.length <= MAX_PATH_POINTS) return points;
  const step = (points.length - 1) / (MAX_PATH_POINTS - 1);
  return Array.from(
    { length: MAX_PATH_POINTS },
    (_, index) => points[Math.round(index * step)] as GeoPoint,
  );
}

/** Raised when no routing provider could route a leg. The API answers 503; it never guesses. */
export class RoutingUnavailableError extends AppException {
  constructor(message: string) {
    super('SERVICE_UNAVAILABLE', message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/**
 * Routed leg figures from real providers (DATA-SOURCES §1): TomTom (traffic-aware) first,
 * OpenRouteService (free-flow) second. If neither answers, the request fails with
 * `RoutingUnavailableError` so the client shows an error state instead of invented numbers.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly cache = new TtlCache<LegOverride>(ROUTE_TTL_MS, 1_000);

  constructor(private readonly config: AppConfig) {}

  /**
   * Fetches routed figures for each consecutive pair of `points` and returns a synchronous
   * lookup for the engine.
   * @throws RoutingUnavailableError when any pair cannot be routed by a real provider.
   */
  async prefetch(
    points: readonly GeoPoint[],
    departAt: Date,
  ): Promise<(from: GeoPoint, to: GeoPoint) => LegOverride | undefined> {
    const pairs = points.slice(1).map((to, index) => ({ from: points[index] as GeoPoint, to }));
    const results = await Promise.all(pairs.map((pair) => this.leg(pair.from, pair.to, departAt)));
    const table = new Map<string, LegOverride>();
    pairs.forEach((pair, index) => {
      const leg = results[index];
      if (!leg) throw new RoutingUnavailableError('Routing provider unavailable');
      table.set(`${keyOf(pair.from)}>${keyOf(pair.to)}`, leg);
    });
    return (from, to) => table.get(`${keyOf(from)}>${keyOf(to)}`);
  }

  private async leg(from: GeoPoint, to: GeoPoint, departAt: Date): Promise<LegOverride | null> {
    const bucket = Math.floor(departAt.getTime() / DEPARTURE_BUCKET_MS);
    const cacheKey = `${keyOf(from)}>${keyOf(to)}@${bucket}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const isLive = Math.abs(departAt.getTime() - Date.now()) <= LIVE_WINDOW_MS;
    const result =
      (await this.viaTomTom(from, to, departAt, isLive)) ?? (await this.viaOrs(from, to)) ?? null;
    // Only real results are cached: a failed lookup must be retried, not remembered.
    if (result) this.cache.set(cacheKey, result);
    return result;
  }

  private async viaTomTom(
    from: GeoPoint,
    to: GeoPoint,
    departAt: Date,
    isLive: boolean,
  ): Promise<LegOverride | null> {
    const key = this.config.providers.tomTomKey;
    if (!key) return null;
    const locations = `${from.lat},${from.lng}:${to.lat},${to.lng}`;
    const params = new URLSearchParams({
      key,
      traffic: 'true',
      travelMode: 'car',
      computeTravelTimeFor: 'all',
      ...(isLive ? {} : { departAt: departAt.toISOString() }),
    });
    try {
      const raw = await httpJson(`${TOMTOM_BASE}/${locations}/json?${params.toString()}`, {
        timeoutMs: ROUTE_TIMEOUT_MS,
        headers: { 'user-agent': this.config.providers.userAgent },
      });
      const route = TomTomSchema.parse(raw).routes[0];
      if (!route) return null;
      const { summary } = route;
      const freeFlowSeconds = summary.noTrafficTravelTimeInSeconds ?? summary.travelTimeInSeconds;
      // Travel time minus free-flow time covers live traffic now and historic traffic for a later
      // departure; `trafficDelayInSeconds` alone reads 0 when only historic data applies.
      const delayMinutes = Math.round(
        Math.max(0, summary.travelTimeInSeconds - freeFlowSeconds) / 60,
      );
      const path = route.legs.flatMap((leg) =>
        leg.points.map((point) => ({ lat: point.latitude, lng: point.longitude })),
      );
      return {
        distanceKm: Math.round(summary.lengthInMeters / 100) / 10,
        freeFlowMinutes: Math.max(1, Math.round(freeFlowSeconds / 60)),
        // A zero delay can mean "no traffic data here"; only a positive delay overrides the
        // curated corridor window, so corridors keep working where TomTom has no traffic data.
        ...(delayMinutes > 0 ? { liveDelayMinutes: delayMinutes } : {}),
        path: downsample(path),
        tier: isLive ? 'LIVE' : 'HISTORIC',
      };
    } catch (error: unknown) {
      this.logger.warn(
        { detail: error instanceof Error ? error.message : 'unknown' },
        'TomTom failed',
      );
      return null;
    }
  }

  private async viaOrs(from: GeoPoint, to: GeoPoint): Promise<LegOverride | null> {
    const key = this.config.providers.orsKey;
    if (!key) return null;
    try {
      const raw = await httpJson(ORS_URL, {
        method: 'POST',
        timeoutMs: ROUTE_TIMEOUT_MS,
        headers: { authorization: key },
        body: {
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        },
      });
      const feature = OrsSchema.parse(raw).features[0];
      if (!feature) return null;
      const { distance, duration } = feature.properties.summary;
      return {
        distanceKm: Math.round(distance / 100) / 10,
        freeFlowMinutes: Math.max(1, Math.round(duration / 60)),
        path: downsample(feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))),
        tier: 'ESTIMATE',
      };
    } catch (error: unknown) {
      this.logger.warn(
        { detail: error instanceof Error ? error.message : 'unknown' },
        'ORS failed',
      );
      return null;
    }
  }
}
