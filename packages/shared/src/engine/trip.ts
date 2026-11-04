import {
  applyTripChange,
  cfs,
  fiscalBoost,
  haversineKm,
  isOpen,
  isRedZone,
  isWithinWindow,
  MAX_TRIP_STOPS,
  rankScore,
  THRESHOLDS,
  toWita,
  travelMinutesEstimate,
  type CopilotIntent,
  type Corridor,
  type GeoPoint,
  type SuggestionReason,
  type TelemetryTier,
  type TripChange,
  type TripLeg,
  type TripMetrics,
  type TripPlan,
  type TripRequest,
  type TripStop,
  type TripStopInput,
  type TripSuggestion,
} from '../index';
import { getCatalog, vibeSimilarity, type CatalogData, type CatalogPlace } from './catalog';
import { busynessAt, ROAD_WINDING_FACTOR, toNearbyPlace, type ExploreContext } from './explore';

type WitaDateTime = ReturnType<typeof toWita>;

/** Legs that skirt a corridor still feel its jam, so the radius gets this margin, in metres. */
const CORRIDOR_TOLERANCE_M = 500;
const METRES_PER_KM = 1000;
/** BRD §7.2: the second CFS term reads the forecast two hours after arrival. */
const LOOKAHEAD_HOURS = 2;
const MSME_DEFAULT_DWELL_MIN = 30;
const DTW_DEFAULT_DWELL_MIN = 60;
const STOP_DWELL_LIMITS_MIN = Object.freeze({ min: 10, max: 360 });

/** BEST_TIME departure scan relative to the requested departure, in minutes. */
export const DEPARTURE_SCAN_MIN = Object.freeze({ earliest: -180, latest: 240, step: 30 });
/** The second BEST_TIME card stays within this shift so it fits the traveller's day. */
const NEAR_SHIFT_MIN = 60;
/** Weight of travel minutes against crowd points when comparing stop orders. */
export const REORDER_MINUTES_WEIGHT = 0.3;
/** A replacement stop must be at least this many points calmer than the stop it replaces. */
const MIN_CROWD_DROP_PTS = 15;
const SWAP_REACH_KM = 25;
/** Full trip evaluations spent per swap search; keeps the copilot reply fast. */
const MAX_SWAP_EVALUATIONS = 8;
/** A gridlock wait lasts until the corridor window ends, within these bounds (minutes). */
const GRIDLOCK_WAIT_MIN = Object.freeze({ min: 20, max: 90 });
const WAIT_MSME_REACH_KM = 3;
/** Wider ring used when no MSME sits within the preferred reach (Ubud centre has none). */
const WAIT_MSME_FALLBACK_REACH_KM = 6;
const MAX_WAIT_MSME_TRIES = 3;
const FOOD_REACH_KM = 8;
/** Warungs within the same band count as equally close, so a recipient-regency one can win. */
const FOOD_TIE_BAND_KM = 1;
const FOOD_DWELL_MIN = Object.freeze({ min: 30, max: 45 });
const MAX_FOOD_SUGGESTIONS = 3;
const MAX_FOOD_EVALUATIONS = 10;
const SUNSET_REACH_KM = 30;
/** Golden-hour arrival window in WITA and the arrival a departure shift aims for. */
export const GOLDEN_HOUR_WITA = Object.freeze({ start: '17:00', end: '18:15', target: '17:30' });
const MAX_SUNSET_SUGGESTIONS = 2;
const SHIFT_ROUNDING_MIN = 5;
const MAX_SUGGESTIONS = 3;

/** Scenario flags shared by every trip evaluation; time and origin come from the request. */
export interface TripContext {
  /** Simulation scenario: hotspots surge past 100 % and readings are labelled SIMULATION. */
  readonly surge: boolean;
  readonly tier: TelemetryTier;
  /** Same hook as `ExploreContext.crowdMultiplier`; applied to every crowd reading of the trip. */
  readonly crowdMultiplier?: (at: WitaDateTime) => number;
  /**
   * Routed figures for a leg, when the caller has them. Synchronous on purpose: the API
   * prefetches its distance table before calling the engine. Undefined means "estimate".
   */
  readonly legOverride?: (from: GeoPoint, to: GeoPoint) => LegOverride | undefined;
}

/** Routed or historical figures that replace the haversine estimate for one leg. */
export interface LegOverride {
  /** Road distance in kilometres. */
  readonly distanceKm: number;
  /** Driving minutes without any traffic delay. */
  readonly freeFlowMinutes: number;
  /** Live traffic delay in minutes; replaces the corridor penalty-window delay when defined. */
  readonly liveDelayMinutes?: number;
  /** Road geometry for drawing. */
  readonly path?: GeoPoint[];
  /** Where the figures come from. */
  readonly tier: 'LIVE' | 'HISTORIC' | 'ESTIMATE';
}

/** Thrown when a trip references a venue the mock catalogue does not know; maps to 404. */
export class UnknownVenueError extends Error {
  readonly code = 'NOT_FOUND';
  readonly venueId: string;

  constructor(venueId: string) {
    super(`Unknown venue: ${venueId}`);
    this.name = 'UnknownVenueError';
    this.venueId = venueId;
  }
}

interface CatalogIndex {
  readonly source: CatalogData;
  readonly seedsById: ReadonlyMap<string, CatalogPlace>;
  readonly recipientRegencyIds: ReadonlySet<string>;
}

let catalogIndex: CatalogIndex | undefined;

/** Lookup tables for the registered catalogue, rebuilt whenever `setCatalog` swaps it. */
function indexOfCatalog(): CatalogIndex {
  const source = getCatalog();
  if (catalogIndex?.source !== source) {
    catalogIndex = {
      source,
      seedsById: new Map(source.places.map((seed) => [seed.venue.id, seed])),
      recipientRegencyIds: new Set(
        source.regencies
          .filter((regency) => regency.phrStatus === 'RECIPIENT')
          .map((regency) => regency.id),
      ),
    };
  }
  return catalogIndex;
}

/** Catalogue entry for a venue id, or undefined when unknown. */
function findPlaceSeed(venueId: string): CatalogPlace | undefined {
  return indexOfCatalog().seedsById.get(venueId);
}

function requireSeed(venueId: string): CatalogPlace {
  const seed = findPlaceSeed(venueId);
  if (!seed) throw new UnknownVenueError(venueId);
  return seed;
}

/** True when the regency receives the PHR transfer (BRD §1). */
export function isRecipientRegency(regencyId: string): boolean {
  return indexOfCatalog().recipientRegencyIds.has(regencyId);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function isoOf(dt: WitaDateTime): string {
  const iso = dt.toISO({ suppressMilliseconds: true });
  if (!iso) throw new Error('Trip time is not a valid date');
  return iso;
}

function exploreContext(origin: GeoPoint, at: WitaDateTime, ctx: TripContext): ExploreContext {
  return {
    origin,
    at,
    vibes: [],
    surge: ctx.surge,
    tier: ctx.tier,
    ...(ctx.crowdMultiplier ? { crowdMultiplier: ctx.crowdMultiplier } : {}),
  };
}

function isInsideCorridor(point: GeoPoint, corridor: Corridor): boolean {
  const center = { lat: corridor.centerLat, lng: corridor.centerLng };
  const metres = haversineKm(point, center) * METRES_PER_KM;
  return metres <= corridor.radiusMeters + CORRIDOR_TOLERANCE_M;
}

function midpoint(a: GeoPoint, b: GeoPoint): GeoPoint {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

/** Corridors whose radius holds either endpoint or the midpoint of a straight leg. */
function corridorsOnLeg(from: GeoPoint, to: GeoPoint): Corridor[] {
  const probes = [from, to, midpoint(from, to)];
  return getCatalog().corridors.filter((corridor) =>
    probes.some((point) => isInsideCorridor(point, corridor)),
  );
}

/** Corridors around `point` whose penalty window is active at `at`, longest delay first. */
export function activeCorridorsAt(point: GeoPoint, at: WitaDateTime): Corridor[] {
  return getCatalog()
    .corridors.filter(
      (corridor) =>
        isInsideCorridor(point, corridor) && isWithinWindow(corridor.penaltyWindows, at),
    )
    .sort((a, b) => b.typicalDelayMinutes - a.typicalDelayMinutes);
}

/** Minutes from `at` until the corridor's active penalty window closes; 0 when none is active. */
export function minutesUntilWindowEnds(corridor: Corridor, at: WitaDateTime): number {
  let longest = 0;
  for (const penalty of corridor.penaltyWindows) {
    if (!isWithinWindow([penalty], at)) continue;
    const [hour = 0, minute = 0] = penalty.end.split(':').map(Number);
    let end = at.set({ hour, minute, second: 0, millisecond: 0 });
    // Overnight windows close on the next calendar day.
    if (end <= at) end = end.plus({ days: 1 });
    longest = Math.max(longest, Math.round(end.diff(at, 'minutes').minutes));
  }
  return longest;
}

interface DrivenLeg {
  readonly leg: TripLeg;
  /** Every corridor the leg touches, active or not, for drawing. */
  readonly touched: readonly Corridor[];
}

/**
 * Hops shorter than this (road km) are walked or ridden through side lanes, so they do not
 * pay a corridor's gridlock delay; e.g. stepping off Jl. Raya Ubud into a nearby warung.
 */
const WALKABLE_HOP_KM = 1.5;

function driveLeg(
  from: GeoPoint,
  to: GeoPoint,
  departAt: WitaDateTime,
  ctx: TripContext,
): DrivenLeg {
  const override = ctx.legOverride?.(from, to);
  const roadKm = override?.distanceKm ?? haversineKm(from, to) * ROAD_WINDING_FACTOR;
  const touched = corridorsOnLeg(from, to);
  const walkable = roadKm < WALKABLE_HOP_KM;
  const active = walkable
    ? []
    : touched.filter((corridor) => isWithinWindow(corridor.penaltyWindows, departAt));
  const windowDelay = active.reduce((sum, corridor) => sum + corridor.typicalDelayMinutes, 0);
  const liveDelay = override?.liveDelayMinutes;
  const corridorDelayMinutes = walkable
    ? 0
    : liveDelay !== undefined
      ? Math.max(0, Math.round(liveDelay))
      : windowDelay;
  return {
    leg: {
      distanceKm: Math.round(roadKm * 10) / 10,
      travelMinutes: override
        ? Math.max(0, Math.round(override.freeFlowMinutes))
        : travelMinutesEstimate(roadKm, false),
      corridorDelayMinutes,
      corridorIds: active.map((corridor) => corridor.id),
      ...(override?.path ? { path: override.path } : {}),
      ...(override ? { tier: override.tier } : {}),
    },
    touched,
  };
}

function defaultDwellMinutes(seed: CatalogPlace): number {
  if (seed.venue.avgDwellMinutes > 0) return seed.venue.avgDwellMinutes;
  return seed.venue.kind === 'MSME' ? MSME_DEFAULT_DWELL_MIN : DTW_DEFAULT_DWELL_MIN;
}

/** Inputs and result of the BRD §7.2 crowd friction score for one stop. */
export interface FrictionBreakdown {
  readonly bEff: number;
  readonly fPlus2: number;
  readonly corridorPenalty: number;
  readonly raw: number;
  readonly display: number;
}

function frictionAt(
  seed: CatalogPlace,
  arrivalCtx: ExploreContext,
  legDelayMinutes: number,
): FrictionBreakdown {
  const bEff = busynessAt(seed, arrivalCtx);
  const fPlus2 = busynessAt(seed, arrivalCtx, LOOKAHEAD_HOURS);
  const corridorPenalty = legDelayMinutes > 0 ? THRESHOLDS.corridorPenalty : 0;
  const score = cfs({ bEff, fPlus2, corridorPenalty });
  return { bEff, fPlus2, corridorPenalty, raw: score.raw, display: score.display };
}

/** Recomputes the CFS terms of an evaluated stop, for the copilot's glass-box trace. */
export function frictionBreakdownOf(stop: TripStop, ctx: TripContext): FrictionBreakdown {
  const seed = requireSeed(stop.place.venue.id);
  const arrivalCtx = exploreContext(stop.place.venue, toWita(stop.arriveAt), ctx);
  return frictionAt(seed, arrivalCtx, stop.leg.corridorDelayMinutes);
}

interface StopVisit {
  readonly seed: CatalogPlace;
  readonly input: TripStopInput;
  readonly from: GeoPoint;
  readonly arrival: WitaDateTime;
  readonly leg: TripLeg;
}

function visitStop(visit: StopVisit, ctx: TripContext): TripStop {
  const arrivalCtx = exploreContext(visit.from, visit.arrival, ctx);
  const place = toNearbyPlace(visit.seed, arrivalCtx);
  const friction = frictionAt(visit.seed, arrivalCtx, visit.leg.corridorDelayMinutes);
  const dwellMinutes = visit.input.dwellMinutes ?? defaultDwellMinutes(visit.seed);
  return {
    place,
    arriveAt: isoOf(visit.arrival),
    leaveAt: isoOf(visit.arrival.plus({ minutes: dwellMinutes })),
    dwellMinutes,
    leg: visit.leg,
    crowdFriction: friction.display,
    isRedZone: isRedZone({ cfsRaw: friction.raw, bEff: friction.bEff }),
  };
}

function crowdExposureOf(stops: readonly TripStop[]): number {
  const dtw = stops.filter((stop) => stop.place.venue.kind === 'DTW');
  const totalDwell = dtw.reduce((sum, stop) => sum + stop.dwellMinutes, 0);
  if (totalDwell === 0) return 0;
  const weighted = dtw.reduce(
    (sum, stop) => sum + stop.place.crowd.busynessPct * stop.dwellMinutes,
    0,
  );
  return clamp(Math.round(weighted / totalDwell), 0, 100);
}

function metricsOf(stops: readonly TripStop[], fallbackEnd: string): TripMetrics {
  return {
    totalTravelMinutes: stops.reduce((sum, stop) => sum + stop.leg.travelMinutes, 0),
    totalDelayMinutes: stops.reduce((sum, stop) => sum + stop.leg.corridorDelayMinutes, 0),
    crowdExposure: crowdExposureOf(stops),
    redZoneStops: stops.filter((stop) => stop.isRedZone).length,
    msmeStops: stops.filter((stop) => stop.place.venue.kind === 'MSME').length,
    recipientRegencyStops: stops.filter((stop) => isRecipientRegency(stop.place.venue.regencyId))
      .length,
    endAt: stops[stops.length - 1]?.leaveAt ?? fallbackEnd,
  };
}

/**
 * Drives the trip origin → stop 1 → stop 2 … in order: road distance, travel minutes,
 * corridor delays active at each leg's departure, and the crowd reading at each arrival.
 * Pure and deterministic for a given request and scenario.
 * @throws UnknownVenueError when a stop references an unknown venue id.
 */
export function evaluateTrip(request: TripRequest, ctx: TripContext): TripPlan {
  const visits = request.stops.map((input) => ({ input, seed: requireSeed(input.venueId) }));
  const touched = new Map<string, Corridor>();
  const stops: TripStop[] = [];
  let from: GeoPoint = request.origin;
  let departAt = toWita(request.departAt);

  for (const { input, seed } of visits) {
    const driven = driveLeg(from, seed.venue, departAt, ctx);
    for (const corridor of driven.touched) touched.set(corridor.id, corridor);
    const arrival = departAt.plus({
      minutes: driven.leg.travelMinutes + driven.leg.corridorDelayMinutes,
    });
    const stop = visitStop({ seed, input, from, arrival, leg: driven.leg }, ctx);
    stops.push(stop);
    from = seed.venue;
    departAt = arrival.plus({ minutes: stop.dwellMinutes });
  }

  return {
    request,
    stops,
    metrics: metricsOf(stops, isoOf(departAt)),
    corridors: [...touched.values()],
  };
}

interface Candidate {
  readonly change: TripChange;
  readonly reason: SuggestionReason;
  readonly after: TripPlan;
  /** Index in `after.stops` of the venue the change introduces, if any. */
  readonly venueIndex: number | null;
}

type Strategy = (before: TripPlan, ctx: TripContext) => Candidate[];

/** Travel plus corridor delay, in minutes. */
export function roadMinutesOf(metrics: TripMetrics): number {
  return metrics.totalTravelMinutes + metrics.totalDelayMinutes;
}

/** REORDER objective: crowd exposure points plus weighted road minutes (lower is better). */
export function reorderObjective(metrics: TripMetrics): number {
  return metrics.crowdExposure + REORDER_MINUTES_WEIGHT * roadMinutesOf(metrics);
}

function closedStopCount(plan: TripPlan): number {
  return plan.stops.filter((stop) => !stop.place.isOpenNow).length;
}

function hasClosedDtwStop(plan: TripPlan): boolean {
  return plan.stops.some((stop) => stop.place.venue.kind === 'DTW' && !stop.place.isOpenNow);
}

/** No extra red-zone stops and no extra stops reached while closed. */
function keepsPlanSafe(before: TripPlan, after: TripPlan): boolean {
  return (
    after.metrics.redZoneStops <= before.metrics.redZoneStops &&
    closedStopCount(after) <= closedStopCount(before)
  );
}

function lowersCrowd(before: TripPlan, after: TripPlan): boolean {
  return keepsPlanSafe(before, after) && after.metrics.crowdExposure < before.metrics.crowdExposure;
}

function keepsCrowd(before: TripPlan, after: TripPlan): boolean {
  return (
    keepsPlanSafe(before, after) && after.metrics.crowdExposure <= before.metrics.crowdExposure
  );
}

/** Better on crowd or on corridor delay, and not worse on the other. */
function lowersCrowdOrDelay(before: TripPlan, after: TripPlan): boolean {
  if (!keepsPlanSafe(before, after)) return false;
  const crowd = after.metrics.crowdExposure - before.metrics.crowdExposure;
  const delay = after.metrics.totalDelayMinutes - before.metrics.totalDelayMinutes;
  return (crowd < 0 && delay <= 0) || (delay < 0 && crowd <= 0);
}

function tryChange(request: TripRequest, change: TripChange, ctx: TripContext): TripPlan | null {
  const next = applyTripChange(request, change);
  return next === request ? null : evaluateTrip(next, ctx);
}

/** DTW stop with the highest forecast busyness at arrival, or null when the trip has none. */
export function busiestDtwStop(plan: TripPlan): { index: number; stop: TripStop } | null {
  let busiest: { index: number; stop: TripStop } | null = null;
  for (const [index, stop] of plan.stops.entries()) {
    if (stop.place.venue.kind !== 'DTW') continue;
    if (!busiest || stop.place.crowd.busynessPct > busiest.stop.place.crowd.busynessPct) {
      busiest = { index, stop };
    }
  }
  return busiest;
}

function venueIdsOf(plan: TripPlan): Set<string> {
  return new Set(plan.request.stops.map((stop) => stop.venueId));
}

function departureOptions(request: TripRequest, ctx: TripContext): Candidate[] {
  const options: Candidate[] = [];
  const { earliest, latest, step } = DEPARTURE_SCAN_MIN;
  for (let minutes: number = earliest; minutes <= latest; minutes += step) {
    if (minutes === 0) continue;
    const change: TripChange = { kind: 'SHIFT_DEPARTURE', minutes };
    const after = evaluateTrip(applyTripChange(request, change), ctx);
    if (hasClosedDtwStop(after)) continue;
    options.push({ change, reason: 'QUIETER_HOUR', after, venueIndex: null });
  }
  return options;
}

function shiftMinutesOf(change: TripChange): number {
  return change.kind === 'SHIFT_DEPARTURE' ? change.minutes : 0;
}

function calmestOption(options: readonly Candidate[]): Candidate | undefined {
  return [...options].sort(
    (a, b) =>
      a.after.metrics.crowdExposure - b.after.metrics.crowdExposure ||
      roadMinutesOf(a.after.metrics) - roadMinutesOf(b.after.metrics) ||
      Math.abs(shiftMinutesOf(a.change)) - Math.abs(shiftMinutesOf(b.change)),
  )[0];
}

/** Calmest departure in the scan, plus the calmest one within ±1 h when it differs. */
function bestTimeSuggestions(before: TripPlan, ctx: TripContext): Candidate[] {
  const options = departureOptions(before.request, ctx).filter((option) =>
    lowersCrowd(before, option.after),
  );
  const best = calmestOption(options);
  if (!best) return [];
  const near = calmestOption(
    options.filter((option) => Math.abs(shiftMinutesOf(option.change)) <= NEAR_SHIFT_MIN),
  );
  return near && near !== best ? [best, near] : [best];
}

/** BRD §7.3 vibe-equity rank of `candidate` as a replacement for `target`. */
export interface VibeEquityRank {
  readonly similarity: number;
  readonly crowdFriction: number;
  readonly eFiscal: number;
  readonly rank: number;
}

/**
 * Ranks `candidate` against `target` with the crowd forecast at `arrivalCtx.at` (WITA).
 * Null when either venue has no embedding, so it cannot be compared.
 */
function vibeEquityRankOf(
  target: CatalogPlace,
  candidate: CatalogPlace,
  arrivalCtx: ExploreContext,
): VibeEquityRank | null {
  const similarity = vibeSimilarity(target.venue.id, candidate.venue.id);
  if (similarity === null) return null;
  const crowdFriction = cfs({
    bEff: busynessAt(candidate, arrivalCtx),
    fPlus2: busynessAt(candidate, arrivalCtx, LOOKAHEAD_HOURS),
  }).display;
  const phrStatus = isRecipientRegency(candidate.venue.regencyId) ? 'RECIPIENT' : 'DONOR';
  const eFiscal = fiscalBoost({
    phrStatus,
    isBufferZone: candidate.venue.isBufferZone,
    isHotspot: candidate.venue.isHotspot,
  });
  return {
    similarity,
    crowdFriction,
    eFiscal,
    rank: rankScore(similarity, crowdFriction, eFiscal),
  };
}

/**
 * Rank a swap search gives `candidateId` as a replacement for `targetStop`: the candidate is
 * read at the replaced stop's arrival instant. Null when either venue is unknown.
 */
export function swapRankOf(
  targetStop: TripStop,
  candidateId: string,
  ctx: TripContext,
): VibeEquityRank | null {
  const target = findPlaceSeed(targetStop.place.venue.id);
  const candidate = findPlaceSeed(candidateId);
  if (!target || !candidate) return null;
  const arrivalCtx = exploreContext(target.venue, toWita(targetStop.arriveAt), ctx);
  return vibeEquityRankOf(target, candidate, arrivalCtx);
}

interface RankedSeed {
  readonly seed: CatalogPlace;
  readonly busyness: number;
  readonly open: boolean;
  readonly rank: number;
}

function rankedSwapSeeds(
  target: CatalogPlace,
  exclude: ReadonlySet<string>,
  arrivalCtx: ExploreContext,
): RankedSeed[] {
  return getCatalog()
    .places.filter(
      (seed) =>
        seed.venue.kind === 'DTW' &&
        !exclude.has(seed.venue.id) &&
        seed.vibeTags.some((tag) => target.vibeTags.includes(tag)) &&
        haversineKm(seed.venue, target.venue) <= SWAP_REACH_KM,
    )
    .flatMap((seed) => {
      const ranked = vibeEquityRankOf(target, seed, arrivalCtx);
      if (!ranked) return [];
      return [
        {
          seed,
          busyness: busynessAt(seed, arrivalCtx),
          open: isOpen(seed.venue.openingHours, arrivalCtx.at),
          rank: ranked.rank,
        },
      ];
    })
    .sort((a, b) => b.rank - a.rank);
}

interface SwapSearch {
  readonly before: TripPlan;
  readonly stopIndex: number;
  /** Highest forecast busyness the replacement may show at its own arrival. */
  readonly maxBusyness: number;
  readonly reason: SuggestionReason;
  readonly limit: number;
  readonly accept: (after: TripPlan) => boolean;
}

function findSwaps(search: SwapSearch, ctx: TripContext): Candidate[] {
  const { before, stopIndex } = search;
  const targetStop = before.stops[stopIndex];
  if (!targetStop) return [];
  const target = requireSeed(targetStop.place.venue.id);
  const arrivalCtx = exploreContext(target.venue, toWita(targetStop.arriveAt), ctx);
  const pool = rankedSwapSeeds(target, venueIdsOf(before), arrivalCtx)
    .filter((entry) => entry.open && entry.busyness <= search.maxBusyness)
    .slice(0, MAX_SWAP_EVALUATIONS);

  const found: Candidate[] = [];
  for (const { seed } of pool) {
    if (found.length >= search.limit) break;
    const change: TripChange = { kind: 'SWAP_STOP', stopIndex, toVenueId: seed.venue.id };
    const after = tryChange(before.request, change, ctx);
    const swapped = after?.stops[stopIndex];
    if (!after || !swapped?.place.isOpenNow) continue;
    if (swapped.place.crowd.busynessPct > search.maxBusyness || !search.accept(after)) continue;
    found.push({ change, reason: search.reason, after, venueIndex: stopIndex });
  }
  return found;
}

/** Similar-mood replacements for the busiest DTW stop, each at least 15 points calmer. */
function calmerSwaps(before: TripPlan, ctx: TripContext, limit: number): Candidate[] {
  const busiest = busiestDtwStop(before);
  if (!busiest || busiest.stop.place.crowd.busynessPct <= THRESHOLDS.calmMax) return [];
  return findSwaps(
    {
      before,
      stopIndex: busiest.index,
      maxBusyness: busiest.stop.place.crowd.busynessPct - MIN_CROWD_DROP_PTS,
      reason: busiest.stop.isRedZone ? 'RED_ZONE_AT_ARRIVAL' : 'SIMILAR_CALMER',
      limit,
      accept: (after) => lowersCrowd(before, after),
    },
    ctx,
  );
}

function permutations(size: number): number[][] {
  if (size <= 0) return [[]];
  const result: number[][] = [];
  for (const rest of permutations(size - 1)) {
    for (let at = 0; at <= rest.length; at += 1) {
      result.push([...rest.slice(0, at), size - 1, ...rest.slice(at)]);
    }
  }
  return result;
}

/** Better objective while no worse on crowd, road minutes, red zones or closures. */
function isOrderImprovement(before: TripPlan, after: TripPlan): boolean {
  return (
    keepsCrowd(before, after) &&
    roadMinutesOf(after.metrics) <= roadMinutesOf(before.metrics) &&
    reorderObjective(after.metrics) < reorderObjective(before.metrics)
  );
}

/** Exhaustive search over stop orders (at most 5! = 120). */
function reorderSuggestions(before: TripPlan, ctx: TripContext): Candidate[] {
  const size = before.request.stops.length;
  if (size < 2) return [];
  let best: Candidate | null = null;
  for (const order of permutations(size)) {
    if (order.every((value, index) => value === index)) continue;
    const change: TripChange = { kind: 'REORDER', order };
    const after = evaluateTrip(applyTripChange(before.request, change), ctx);
    if (!isOrderImprovement(before, after)) continue;
    if (!best || reorderObjective(after.metrics) < reorderObjective(best.after.metrics)) {
      best = { change, reason: 'BETTER_ORDER', after, venueIndex: null };
    }
  }
  return best ? [best] : [];
}

function byObjective(a: Candidate, b: Candidate): number {
  return reorderObjective(a.after.metrics) - reorderObjective(b.after.metrics);
}

function byCrowd(a: Candidate, b: Candidate): number {
  return a.after.metrics.crowdExposure - b.after.metrics.crowdExposure;
}

/**
 * A plan that reaches an attraction after closing is broken whatever its crowd score, so the
 * smallest departure shift that opens every stop comes first, even if it is busier.
 */
function openingFix(before: TripPlan, ctx: TripContext): Candidate[] {
  if (!hasClosedDtwStop(before)) return [];
  const [nearest] = [...departureOptions(before.request, ctx)].sort(
    (a, b) =>
      Math.abs(shiftMinutesOf(a.change)) - Math.abs(shiftMinutesOf(b.change)) ||
      a.after.metrics.crowdExposure - b.after.metrics.crowdExposure,
  );
  return nearest ? [{ ...nearest, reason: 'CLOSED_ON_ARRIVAL' }] : [];
}

const reviewSuggestions: Strategy = (before, ctx) => [
  ...openingFix(before, ctx),
  ...improvementSuggestions(before, ctx),
];

const improvementSuggestions: Strategy = (before, ctx) =>
  [
    ...calmerSwaps(before, ctx, 1),
    ...reorderSuggestions(before, ctx),
    ...bestTimeSuggestions(before, ctx).slice(0, 1),
  ].sort(byObjective);

const quieterSuggestions: Strategy = (before, ctx) =>
  [...calmerSwaps(before, ctx, 2), ...bestTimeSuggestions(before, ctx).slice(0, 1)].sort(byCrowd);

function msmesNear(point: GeoPoint, exclude: ReadonlySet<string>): CatalogPlace[] {
  const byDistance = getCatalog()
    .places.filter((seed) => seed.venue.kind === 'MSME' && !exclude.has(seed.venue.id))
    .map((seed) => ({ seed, km: haversineKm(point, seed.venue) }))
    .sort((a, b) => a.km - b.km);
  const close = byDistance.filter((entry) => entry.km <= WAIT_MSME_REACH_KM);
  const pool =
    close.length > 0
      ? close
      : byDistance.filter((entry) => entry.km <= WAIT_MSME_FALLBACK_REACH_KM);
  return pool.map((entry) => entry.seed);
}

/** Waits out the gridlock at the nearest open MSME instead of idling in the jam. */
function waitAtMsme(before: TripPlan, waitMinutes: number, ctx: TripContext): Candidate[] {
  if (before.request.stops.length >= MAX_TRIP_STOPS) return [];
  const tries = msmesNear(before.request.origin, venueIdsOf(before)).slice(0, MAX_WAIT_MSME_TRIES);
  for (const seed of tries) {
    const change: TripChange = {
      kind: 'ADD_STOP',
      atIndex: 0,
      venueId: seed.venue.id,
      dwellMinutes: waitMinutes,
    };
    const after = tryChange(before.request, change, ctx);
    if (!after?.stops[0]?.place.isOpenNow || !lowersCrowdOrDelay(before, after)) continue;
    return [{ change, reason: 'CORRIDOR_GRIDLOCK', after, venueIndex: 0 }];
  }
  return [];
}

function shiftForGridlock(before: TripPlan, waitMinutes: number, ctx: TripContext): Candidate[] {
  const change: TripChange = { kind: 'SHIFT_DEPARTURE', minutes: waitMinutes };
  const after = tryChange(before.request, change, ctx);
  if (!after || hasClosedDtwStop(after) || !lowersCrowdOrDelay(before, after)) return [];
  return [{ change, reason: 'CORRIDOR_GRIDLOCK', after, venueIndex: null }];
}

/** Replaces the first stop with a calm similar place whose leg adds no further jams. */
function calmFirstStop(
  before: TripPlan,
  originJams: ReadonlySet<string>,
  ctx: TripContext,
): Candidate[] {
  return findSwaps(
    {
      before,
      stopIndex: 0,
      maxBusyness: THRESHOLDS.calmMax,
      reason: 'SIMILAR_CALMER',
      limit: 1,
      accept: (after) =>
        (after.stops[0]?.leg.corridorIds ?? []).every((id) => originJams.has(id)) &&
        lowersCrowdOrDelay(before, after),
    },
    ctx,
  );
}

const stuckSuggestions: Strategy = (before, ctx) => {
  const departAt = toWita(before.request.departAt);
  const jams = activeCorridorsAt(before.request.origin, departAt);
  const jam = jams[0];
  if (!jam) return reviewSuggestions(before, ctx);
  const waitMinutes = clamp(
    minutesUntilWindowEnds(jam, departAt),
    GRIDLOCK_WAIT_MIN.min,
    GRIDLOCK_WAIT_MIN.max,
  );
  const originJams = new Set(jams.map((corridor) => corridor.id));
  return [
    ...waitAtMsme(before, waitMinutes, ctx),
    ...shiftForGridlock(before, waitMinutes, ctx),
    ...calmFirstStop(before, originJams, ctx),
  ];
};

interface RouteNeighbour {
  readonly seed: CatalogPlace;
  readonly stopIndex: number;
  readonly km: number;
}

function nearestStopOf(seed: CatalogPlace, plan: TripPlan): RouteNeighbour {
  let nearest: RouteNeighbour = { seed, stopIndex: 0, km: Number.POSITIVE_INFINITY };
  for (const [stopIndex, stop] of plan.stops.entries()) {
    const km = haversineKm(seed.venue, stop.place.venue);
    if (km < nearest.km) nearest = { seed, stopIndex, km };
  }
  return nearest;
}

function compareFoodNeighbours(a: RouteNeighbour, b: RouteNeighbour): number {
  const band = Math.floor(a.km / FOOD_TIE_BAND_KM) - Math.floor(b.km / FOOD_TIE_BAND_KM);
  if (band !== 0) return band;
  const equity =
    Number(isRecipientRegency(b.seed.venue.regencyId)) -
    Number(isRecipientRegency(a.seed.venue.regencyId));
  return equity !== 0 ? equity : a.km - b.km;
}

function foodNeighbours(plan: TripPlan): RouteNeighbour[] {
  const inTrip = venueIdsOf(plan);
  return getCatalog()
    .places.filter(
      (seed) =>
        seed.venue.kind === 'MSME' &&
        seed.vibeTags.includes('CULINARY') &&
        !inTrip.has(seed.venue.id),
    )
    .map((seed) => nearestStopOf(seed, plan))
    .filter((neighbour) => neighbour.km <= FOOD_REACH_KM)
    .sort(compareFoodNeighbours);
}

/** Inserts after the nearest stop; falls back to the end when that would crowd a later stop. */
function placeFoodStop(
  before: TripPlan,
  neighbour: RouteNeighbour,
  ctx: TripContext,
): Candidate | null {
  const dwellMinutes = clamp(
    defaultDwellMinutes(neighbour.seed),
    FOOD_DWELL_MIN.min,
    FOOD_DWELL_MIN.max,
  );
  const end = before.request.stops.length;
  const positions = neighbour.stopIndex + 1 >= end ? [end] : [neighbour.stopIndex + 1, end];
  for (const atIndex of positions) {
    const change: TripChange = {
      kind: 'ADD_STOP',
      atIndex,
      venueId: neighbour.seed.venue.id,
      dwellMinutes,
    };
    const after = tryChange(before.request, change, ctx);
    if (!after?.stops[atIndex]?.place.isOpenNow || !keepsCrowd(before, after)) continue;
    return { change, reason: 'SUPPORT_LOCAL', after, venueIndex: atIndex };
  }
  return null;
}

const foodSuggestions: Strategy = (before, ctx) => {
  if (before.request.stops.length >= MAX_TRIP_STOPS) return [];
  const found: Candidate[] = [];
  for (const neighbour of foodNeighbours(before).slice(0, MAX_FOOD_EVALUATIONS)) {
    if (found.length >= MAX_FOOD_SUGGESTIONS) break;
    const candidate = placeFoodStop(before, neighbour, ctx);
    if (candidate) found.push(candidate);
  }
  return found;
};

function landsInGoldenHour(stop: TripStop): boolean {
  const time = toWita(stop.arriveAt).toFormat('HH:mm');
  return time >= GOLDEN_HOUR_WITA.start && time <= GOLDEN_HOUR_WITA.end;
}

/** A sunset change may add a calm stop, but never pushes the trip past calm or adds red zones. */
function keepsSunsetCalm(before: TripPlan, after: TripPlan): boolean {
  const ceiling = Math.max(before.metrics.crowdExposure, THRESHOLDS.calmMax);
  return keepsPlanSafe(before, after) && after.metrics.crowdExposure <= ceiling;
}

function sunsetChanges(seed: CatalogPlace, plan: TripPlan): TripChange[] {
  const size = plan.request.stops.length;
  const swap: TripChange = { kind: 'SWAP_STOP', stopIndex: size - 1, toVenueId: seed.venue.id };
  if (size >= MAX_TRIP_STOPS) return [swap];
  const dwellMinutes = clamp(
    defaultDwellMinutes(seed),
    STOP_DWELL_LIMITS_MIN.min,
    STOP_DWELL_LIMITS_MIN.max,
  );
  return [{ kind: 'ADD_STOP', atIndex: size, venueId: seed.venue.id, dwellMinutes }, swap];
}

function introducedIndexOf(change: TripChange): number | null {
  if (change.kind === 'ADD_STOP') return change.atIndex;
  if (change.kind === 'SWAP_STOP') return change.stopIndex;
  return null;
}

function sunsetStops(before: TripPlan, ctx: TripContext): Candidate[] {
  const last = before.stops[before.stops.length - 1];
  if (!last) return [];
  const inTrip = venueIdsOf(before);
  const seeds = getCatalog()
    .places.filter(
      (seed) =>
        seed.vibeTags.includes('SUNSET') &&
        !inTrip.has(seed.venue.id) &&
        haversineKm(seed.venue, last.place.venue) <= SUNSET_REACH_KM,
    )
    .sort(
      (a, b) => haversineKm(a.venue, last.place.venue) - haversineKm(b.venue, last.place.venue),
    );

  const found: Candidate[] = [];
  for (const seed of seeds) {
    if (found.length >= MAX_SUNSET_SUGGESTIONS) break;
    for (const change of sunsetChanges(seed, before)) {
      const index = introducedIndexOf(change) ?? 0;
      const after = tryChange(before.request, change, ctx);
      const stop = after?.stops[index];
      if (!after || !stop || !landsInGoldenHour(stop) || !stop.place.isOpenNow) continue;
      if (stop.place.crowd.busynessPct > THRESHOLDS.calmMax || !keepsSunsetCalm(before, after)) {
        continue;
      }
      found.push({ change, reason: 'GOLDEN_HOUR', after, venueIndex: index });
      break;
    }
  }
  return found;
}

/** Shifts departure so a sunset-tagged last stop is reached around 17:30. */
function sunsetShift(before: TripPlan, ctx: TripContext): Candidate[] {
  const lastIndex = before.stops.length - 1;
  const last = before.stops[lastIndex];
  if (!last || landsInGoldenHour(last) || !last.place.vibeTags.includes('SUNSET')) return [];
  const arrival = toWita(last.arriveAt);
  const [hour = 0, minute = 0] = GOLDEN_HOUR_WITA.target.split(':').map(Number);
  const target = arrival.set({ hour, minute, second: 0, millisecond: 0 });
  const minutes = roundTo(target.diff(arrival, 'minutes').minutes, SHIFT_ROUNDING_MIN);
  const change: TripChange = { kind: 'SHIFT_DEPARTURE', minutes };
  const after = minutes === 0 ? null : tryChange(before.request, change, ctx);
  const shiftedLast = after?.stops[lastIndex];
  if (!after || !shiftedLast || !landsInGoldenHour(shiftedLast) || hasClosedDtwStop(after)) {
    return [];
  }
  if (after.metrics.redZoneStops > before.metrics.redZoneStops) return [];
  return [{ change, reason: 'GOLDEN_HOUR', after, venueIndex: lastIndex }];
}

const sunsetSuggestions: Strategy = (before, ctx) => {
  const stops = sunsetStops(before, ctx);
  return stops.length > 0 ? stops : sunsetShift(before, ctx);
};

const noSuggestions: Strategy = () => [];

const STRATEGIES: Readonly<Record<CopilotIntent, Strategy>> = {
  GREETING: noSuggestions,
  REVIEW_PLAN: reviewSuggestions,
  STUCK_IN_TRAFFIC: stuckSuggestions,
  BEST_TIME: bestTimeSuggestions,
  QUIETER: quieterSuggestions,
  ADD_FOOD: foodSuggestions,
  SUNSET: sunsetSuggestions,
  EXPLAIN: noSuggestions,
  UNKNOWN: noSuggestions,
};

function suggestionIdOf(change: TripChange): string {
  switch (change.kind) {
    case 'SHIFT_DEPARTURE':
      return `shift_${change.minutes}`;
    case 'SWAP_STOP':
      return `swap_${change.stopIndex}_${change.toVenueId}`;
    case 'REORDER':
      return `reorder_${change.order.join('-')}`;
    case 'ADD_STOP':
      return `add_${change.atIndex}_${change.venueId}`;
    case 'REMOVE_STOP':
      return `remove_${change.stopIndex}`;
    case 'SET_STOPS':
      return `set_${change.venueIds.join('_')}`;
  }
}

function toSuggestion(before: TripPlan, candidate: Candidate): TripSuggestion {
  const after = candidate.after.metrics;
  const base = before.metrics;
  const introduced =
    candidate.venueIndex === null ? undefined : candidate.after.stops[candidate.venueIndex];
  return {
    id: suggestionIdOf(candidate.change),
    change: candidate.change,
    reason: candidate.reason,
    venue: introduced?.place ?? null,
    after,
    delta: {
      crowdExposurePts: after.crowdExposure - base.crowdExposure,
      travelMinutes: roadMinutesOf(after) - roadMinutesOf(base),
      redZoneStops: after.redZoneStops - base.redZoneStops,
    },
  };
}

/**
 * Concrete, pre-computed trip edits for a copilot intent, best first (at most 3). Every
 * suggestion is re-evaluated with `evaluateTrip`; changes that do not improve their target
 * (crowd exposure or corridor delay) are dropped, so the copilot never proposes a worse plan.
 * @throws UnknownVenueError when the request references an unknown venue id.
 */
export function suggestFor(
  intent: CopilotIntent,
  request: TripRequest,
  ctx: TripContext,
): TripSuggestion[] {
  const before = evaluateTrip(request, ctx);
  const seen = new Set<string>();
  const suggestions: TripSuggestion[] = [];
  for (const candidate of STRATEGIES[intent](before, ctx)) {
    const suggestion = toSuggestion(before, candidate);
    if (seen.has(suggestion.id)) continue;
    seen.add(suggestion.id);
    suggestions.push(suggestion);
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }
  return suggestions;
}
