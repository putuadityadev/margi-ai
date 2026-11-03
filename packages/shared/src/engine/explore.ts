import {
  cfs,
  classifyBusyness,
  EXPLORE_RADIUS_KM,
  fiscalBoost,
  haversineKm,
  isOpen,
  isRedZone,
  NearbyPlaceSchema,
  pickQuietHours,
  rankScore,
  tagSimilarity,
  THRESHOLDS,
  travelMinutesEstimate,
  type GeoPoint,
  type NearbyPlace,
  type PlaceDetail,
  type QuietAlternative,
  type TelemetryTier,
  type VibeTag,
} from '../index';
import type { toWita } from '../index';
import { getCatalog, type CatalogPlace } from './catalog';

type WitaDateTime = ReturnType<typeof toWita>;

/** Straight-line distance understates Bali's winding roads; this factor approximates road distance. */
export const ROAD_WINDING_FACTOR = 1.35;
/** Weekend days (WITA, 0 = Monday) carry more domestic visitors. */
const WEEKEND_CROWD_MULTIPLIER = 1.2;
/** Bell-curve width of the synthetic hourly forecast, in hours squared. */
const CURVE_SPREAD_H2 = 25;
const MIN_NEARBY_RESULTS = 8;
const MAX_NEARBY_RESULTS = 40;
const MAX_ALTERNATIVES = 3;
/** A quieter alternative must be at least this many points calmer than the selected place. */
const MIN_CROWD_DROP_PTS = 15;
/** Extra reach beyond the selected place's own distance when searching alternatives. */
const ALTERNATIVE_EXTRA_REACH_KM = 25;
const MSME_REACH_KM = 6;
const MAX_MSMES = 3;

export interface ExploreContext {
  readonly origin: GeoPoint;
  readonly at: WitaDateTime;
  readonly vibes: readonly VibeTag[];
  /** Simulation scenario: hotspots surge past 100 % and every reading is labelled SIMULATION. */
  readonly surge: boolean;
  readonly tier: TelemetryTier;
  /**
   * Extra crowd factor for the instant asked about (holiday, ceremony, weather), applied after
   * the weekend multiplier. Defaults to 1. Receives a WITA date-time and must be deterministic
   * per calendar day and hour, because curves are memoised on its value.
   */
  readonly crowdMultiplier?: (at: WitaDateTime) => number;
}

/**
 * Curves depend only on the place and the WITA calendar day, and the trip planner asks for the
 * same ones hundreds of times while comparing stop orders, so they are memoised per day.
 */
const curveCache = new Map<string, readonly number[]>();
const CURVE_CACHE_MAX_ENTRIES = 2000;

function computeCrowdCurve(seed: CatalogPlace, at: WitaDateTime, multiplier: number): number[] {
  const weekend = (at.weekday >= 6 ? WEEKEND_CROWD_MULTIPLIER : 1) * multiplier;
  const { peakHour, peakBusyness, baseBusyness } = seed.crowd;
  return Array.from({ length: 24 }, (_, hour) => {
    if (!isOpen(seed.venue.openingHours, at.set({ hour, minute: 30 }))) return 0;
    const offset = hour - peakHour;
    const factor = Math.max(0, 1 - (offset * offset) / CURVE_SPREAD_H2);
    const value = baseBusyness + (peakBusyness - baseBusyness) * factor * weekend;
    return Math.min(100, Math.max(0, Math.round(value)));
  });
}

/**
 * 24-hour synthetic forecast for the day of `at`. Closed hours read 0. `multiplier` scales the
 * peak lift (it is applied with the weekend factor) and is part of the memoisation key.
 */
export function crowdCurve(seed: CatalogPlace, at: WitaDateTime, multiplier = 1): number[] {
  const key = `${seed.venue.id}|${at.toISODate() ?? ''}|${multiplier}`;
  let curve = curveCache.get(key);
  if (!curve) {
    if (curveCache.size >= CURVE_CACHE_MAX_ENTRIES) curveCache.clear();
    curve = computeCrowdCurve(seed, at, multiplier);
    curveCache.set(key, curve);
  }
  return [...curve];
}

/** Forecast busyness (0-100, or the surge value) of `seed` at `ctx.at` plus `hourOffset` hours. */
export function busynessAt(seed: CatalogPlace, ctx: ExploreContext, hourOffset = 0): number {
  const instant = ctx.at.plus({ hours: hourOffset });
  const multiplier = ctx.crowdMultiplier?.(instant) ?? 1;
  const value = crowdCurve(seed, instant, multiplier)[instant.hour] ?? 0;
  if (ctx.surge && seed.venue.isHotspot && value > 0) return THRESHOLDS.surgePct;
  return value;
}

/** Map-card view of `seed` with distance from `ctx.origin` and the crowd reading at `ctx.at`. */
export function toNearbyPlace(seed: CatalogPlace, ctx: ExploreContext): NearbyPlace {
  const distanceKm = haversineKm(ctx.origin, seed.venue);
  const busynessPct = busynessAt(seed, ctx);
  const venue = seed.venue;
  return NearbyPlaceSchema.parse({
    venue: {
      id: venue.id,
      slug: venue.slug,
      kind: venue.kind,
      category: venue.category,
      nameEn: venue.nameEn,
      nameId: venue.nameId,
      descriptionEn: venue.descriptionEn,
      descriptionId: venue.descriptionId,
      regencyId: venue.regencyId,
      lat: venue.lat,
      lng: venue.lng,
      imageUrl: venue.imageUrl,
      imageCredit: venue.imageCredit ?? null,
      priceLevel: venue.priceLevel ?? null,
      isHotspot: venue.isHotspot,
      isBufferZone: venue.isBufferZone,
    },
    vibeTags: [...seed.vibeTags],
    distanceKm: Math.round(distanceKm * 10) / 10,
    travelMinutes: travelMinutesEstimate(distanceKm * ROAD_WINDING_FACTOR, false),
    crowd: {
      busynessPct,
      level: classifyBusyness(busynessPct),
      tier: ctx.tier,
      hourWita: ctx.at.hour,
    },
    isOpenNow: isOpen(venue.openingHours, ctx.at),
  });
}

function matchesVibes(seed: CatalogPlace, vibes: readonly VibeTag[]): boolean {
  if (vibes.length === 0) return seed.venue.kind === 'DTW';
  // MSMEs only join the map when the traveller asks for food or coffee.
  if (seed.venue.kind === 'MSME' && !vibes.includes('CULINARY')) return false;
  return seed.vibeTags.some((tag) => vibes.includes(tag));
}

/**
 * Places around the traveller, nearest first. When the radius holds too few matches
 * (a traveller at the island's edge), the nearest matches beyond it are returned instead.
 */
export function findNearby(
  ctx: ExploreContext,
  radiusKm: number = EXPLORE_RADIUS_KM.default,
): NearbyPlace[] {
  const matches = getCatalog()
    .places.filter((seed) => matchesVibes(seed, ctx.vibes))
    .map((seed) => toNearbyPlace(seed, ctx))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const inside = matches.filter((place) => place.distanceKm <= radiusKm);
  const picked =
    inside.length >= MIN_NEARBY_RESULTS ? inside : matches.slice(0, MIN_NEARBY_RESULTS);
  return picked.slice(0, MAX_NEARBY_RESULTS);
}

function crowdFrictionOf(seed: CatalogPlace, ctx: ExploreContext) {
  return cfs({ bEff: busynessAt(seed, ctx), fPlus2: busynessAt(seed, ctx, 2) });
}

function rankAlternatives(
  target: CatalogPlace,
  targetPlace: NearbyPlace,
  ctx: ExploreContext,
): QuietAlternative[] {
  const reachKm = targetPlace.distanceKm + ALTERNATIVE_EXTRA_REACH_KM;
  const targetBusyness = targetPlace.crowd.busynessPct;

  return (
    getCatalog()
      .places.filter(
        (seed) =>
          seed.venue.kind === 'DTW' &&
          seed.venue.id !== target.venue.id &&
          seed.vibeTags.some((tag) => target.vibeTags.includes(tag)),
      )
      .map((seed) => {
        const place = toNearbyPlace(seed, ctx);
        const similarity = tagSimilarity(target.vibeTags, seed.vibeTags);
        const friction = crowdFrictionOf(seed, ctx).display;
        const phrStatus = getCatalog().regencies.find(
          (r) => r.id === seed.venue.regencyId,
        )?.phrStatus;
        const eFiscal = fiscalBoost({
          ...(phrStatus ? { phrStatus } : {}),
          isBufferZone: seed.venue.isBufferZone,
          isHotspot: seed.venue.isHotspot,
        });
        return {
          place,
          sharedVibes: seed.vibeTags.filter((tag) => target.vibeTags.includes(tag)),
          similarity: Math.round(similarity),
          crowdFriction: friction,
          rank: Math.round(rankScore(similarity, friction, eFiscal) * 10) / 10,
          crowdDropPts: targetBusyness - place.crowd.busynessPct,
        };
      })
      // A busy target needs clearly calmer options; a calm target gets similar calm places.
      .filter(
        (alt) =>
          alt.place.isOpenNow &&
          alt.place.distanceKm <= reachKm &&
          (targetBusyness > THRESHOLDS.calmMax
            ? alt.crowdDropPts >= MIN_CROWD_DROP_PTS
            : alt.place.crowd.busynessPct <= THRESHOLDS.calmMax),
      )
      .sort((a, b) => b.rank - a.rank)
      .slice(0, MAX_ALTERNATIVES)
  );
}

function nearbyMsmesOf(target: CatalogPlace, ctx: ExploreContext): NearbyPlace[] {
  return getCatalog()
    .places.filter(
      (seed) =>
        seed.venue.kind === 'MSME' && haversineKm(seed.venue, target.venue) <= MSME_REACH_KM,
    )
    .sort((a, b) => haversineKm(a.venue, target.venue) - haversineKm(b.venue, target.venue))
    .slice(0, MAX_MSMES)
    .map((seed) => toNearbyPlace(seed, ctx));
}

/** Full detail for one place, or null when the id is unknown. */
export function buildPlaceDetail(venueId: string, ctx: ExploreContext): PlaceDetail | null {
  const seed = getCatalog().places.find((candidate) => candidate.venue.id === venueId);
  if (!seed) return null;

  const place = toNearbyPlace(seed, ctx);
  // The multiplier may differ per hour, so each hour reads a curve built with its own factor.
  const curve = Array.from({ length: 24 }, (_, hour) => {
    const instant = ctx.at.set({ hour, minute: 30 });
    const value = crowdCurve(seed, instant, ctx.crowdMultiplier?.(instant) ?? 1)[hour] ?? 0;
    return ctx.surge && seed.venue.isHotspot && value > 0 ? THRESHOLDS.surgePct : value;
  });
  const friction = crowdFrictionOf(seed, ctx);
  const quiet = pickQuietHours(curve, seed.venue.openingHours, ctx.at, {
    windowHours: 6,
    count: 3,
  });

  return {
    place,
    today: curve.map((busynessPct, hour) => ({ hour, busynessPct })),
    quietHours: quiet.arrivalHours.filter((hour) => (curve[hour] ?? 0) > 0),
    crowdFriction: friction.display,
    isRedZone: isRedZone({ cfsRaw: friction.raw, bEff: place.crowd.busynessPct }),
    alternatives: rankAlternatives(seed, place, ctx),
    nearbyMsmes: seed.venue.kind === 'DTW' ? nearbyMsmesOf(seed, ctx) : [],
    etiquetteTags: [...seed.venue.etiquetteTags],
    avgDwellMinutes: seed.venue.avgDwellMinutes,
    typicalPeakQueueMinutes: seed.venue.typicalPeakQueueMinutes,
  };
}
