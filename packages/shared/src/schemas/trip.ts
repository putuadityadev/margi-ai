import { z } from 'zod';
import { PenaltyWindowSchema } from '../time/opening-hours';
import { GeoPointSchema, NearbyPlaceSchema } from './explore';

/**
 * Trip planner and MARGI Copilot contract (DECISIONS D-026).
 * Every number in these payloads is computed by code; the copilot only writes `text`.
 */

/** Why the traveller opened the planner. */
export const TripSituationSchema = z.enum(['PLAN', 'STUCK_IN_TRAFFIC', 'HAS_PLAN']);
export type TripSituation = z.infer<typeof TripSituationSchema>;

/** Hard limit on stops per trip; keeps re-ordering search exhaustive (5! = 120 orders). */
export const MAX_TRIP_STOPS = 5;

/** A gridlock-prone road segment with its daily penalty windows (TDD §5, BRD §7.2). */
export const CorridorSchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  nameId: z.string(),
  centerLat: z.number(),
  centerLng: z.number(),
  radiusMeters: z.number().int().positive(),
  typicalDelayMinutes: z.number().int().nonnegative(),
  penaltyWindows: z.array(PenaltyWindowSchema),
  /** Polyline used to draw the corridor on the map. */
  path: z.array(GeoPointSchema).min(2),
});
export type Corridor = z.infer<typeof CorridorSchema>;

export const TripStopInputSchema = z.object({
  venueId: z.uuid(),
  dwellMinutes: z.number().int().min(10).max(360).optional(),
});
export type TripStopInput = z.infer<typeof TripStopInputSchema>;

/** What the client sends to evaluate, optimise or discuss a trip. */
export const TripRequestSchema = z.object({
  origin: GeoPointSchema,
  originLabel: z.string().max(80),
  departAt: z.iso.datetime({ offset: true }),
  stops: z.array(TripStopInputSchema).min(1).max(MAX_TRIP_STOPS),
});
export type TripRequest = z.infer<typeof TripRequestSchema>;

export const TripLegSchema = z.object({
  distanceKm: z.number().min(0),
  travelMinutes: z.number().int().min(0),
  /** Extra minutes from corridors whose penalty window is active when the leg is driven. */
  corridorDelayMinutes: z.number().int().min(0),
  corridorIds: z.array(z.string()),
  /** Routed road geometry for drawing, when the planner had one. */
  path: z.array(GeoPointSchema).optional(),
  /** Source of the distance and time figures; absent on plain estimates from older clients. */
  tier: z.enum(['LIVE', 'HISTORIC', 'ESTIMATE']).optional(),
});
export type TripLeg = z.infer<typeof TripLegSchema>;

export const TripStopSchema = z.object({
  /** Place with its crowd reading evaluated at the arrival instant. */
  place: NearbyPlaceSchema,
  arriveAt: z.iso.datetime({ offset: true }),
  leaveAt: z.iso.datetime({ offset: true }),
  dwellMinutes: z.number().int().min(0),
  /** Leg driven from the previous point (the origin for the first stop). */
  leg: TripLegSchema,
  crowdFriction: z.number().int().min(0).max(100),
  isRedZone: z.boolean(),
});
export type TripStop = z.infer<typeof TripStopSchema>;

export const TripMetricsSchema = z.object({
  totalTravelMinutes: z.number().int().min(0),
  totalDelayMinutes: z.number().int().min(0),
  /** Dwell-weighted mean busyness across DTW stops, 0–100 (lower is calmer). */
  crowdExposure: z.number().int().min(0).max(100),
  redZoneStops: z.number().int().min(0),
  msmeStops: z.number().int().min(0),
  /** Stops in regencies that receive the 10 % PHR transfer (BRD §1). */
  recipientRegencyStops: z.number().int().min(0),
  endAt: z.iso.datetime({ offset: true }),
});
export type TripMetrics = z.infer<typeof TripMetricsSchema>;

export const TripPlanSchema = z.object({
  request: TripRequestSchema,
  stops: z.array(TripStopSchema),
  metrics: TripMetricsSchema,
  /** Corridors crossed by any leg, for drawing and warnings. */
  corridors: z.array(CorridorSchema),
});
export type TripPlan = z.infer<typeof TripPlanSchema>;

/** One concrete edit the copilot can propose; the client applies it with `applyTripChange`. */
export const TripChangeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('SHIFT_DEPARTURE'), minutes: z.number().int() }),
  z.object({
    kind: z.literal('SWAP_STOP'),
    stopIndex: z.number().int().min(0),
    toVenueId: z.uuid(),
  }),
  /** Replaces the whole itinerary, e.g. "I want to go to Kintamani instead". */
  z.object({
    kind: z.literal('SET_STOPS'),
    venueIds: z.array(z.uuid()).min(1).max(MAX_TRIP_STOPS),
    /** New departure time, when the traveller asked for one in the same breath. */
    departAt: z.iso.datetime({ offset: true }).optional(),
  }),
  z.object({ kind: z.literal('REORDER'), order: z.array(z.number().int().min(0)).min(2) }),
  z.object({
    kind: z.literal('ADD_STOP'),
    atIndex: z.number().int().min(0),
    venueId: z.uuid(),
    dwellMinutes: z.number().int().min(10).max(360),
  }),
  z.object({ kind: z.literal('REMOVE_STOP'), stopIndex: z.number().int().min(0) }),
]);
export type TripChange = z.infer<typeof TripChangeSchema>;

export const SuggestionReasonSchema = z.enum([
  'RED_ZONE_AT_ARRIVAL',
  'CORRIDOR_GRIDLOCK',
  'QUIETER_HOUR',
  'SIMILAR_CALMER',
  'SUPPORT_LOCAL',
  'BETTER_ORDER',
  'GOLDEN_HOUR',
  'CLOSED_ON_ARRIVAL',
  /** The traveller asked for this change in their own words. */
  'USER_REQUESTED',
]);
export type SuggestionReason = z.infer<typeof SuggestionReasonSchema>;

export const TripSuggestionSchema = z.object({
  id: z.string(),
  change: TripChangeSchema,
  reason: SuggestionReasonSchema,
  /** Venue the change introduces (swap target or added stop), for the card preview. */
  venue: NearbyPlaceSchema.nullable(),
  /** Every stop of the new itinerary, for cards that replace the whole trip. */
  venues: z.array(NearbyPlaceSchema).max(MAX_TRIP_STOPS).optional(),
  /** Metrics of the trip after applying the change. */
  after: TripMetricsSchema,
  delta: z.object({
    crowdExposurePts: z.number().int(),
    travelMinutes: z.number().int(),
    redZoneStops: z.number().int(),
  }),
});
export type TripSuggestion = z.infer<typeof TripSuggestionSchema>;

export const CopilotIntentSchema = z.enum([
  'GREETING',
  'REVIEW_PLAN',
  'STUCK_IN_TRAFFIC',
  'BEST_TIME',
  'QUIETER',
  'ADD_FOOD',
  'SUNSET',
  'EXPLAIN',
  'UNKNOWN',
]);
export type CopilotIntent = z.infer<typeof CopilotIntentSchema>;

export const CopilotRequestSchema = z.object({
  trip: TripRequestSchema,
  situation: TripSituationSchema,
  /** Free text typed by the traveller. */
  message: z.string().trim().max(500).optional(),
  /** Intent of a tapped quick reply; skips intent detection. */
  intent: CopilotIntentSchema.optional(),
  locale: z.enum(['en', 'id']),
  /** Recent turns (oldest first) so follow-ups such as "why still Mertasari?" keep their context. */
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(700) }))
    .max(8)
    .optional(),
});
export type CopilotRequest = z.infer<typeof CopilotRequestSchema>;

/** Glass-box step shown under "How did MARGI decide?". */
export const CopilotTraceStepSchema = z.object({
  code: z.string(),
  label: z.string().max(80),
  detail: z.string().max(200),
});
export type CopilotTraceStep = z.infer<typeof CopilotTraceStepSchema>;

export const CopilotReplySchema = z.object({
  intent: CopilotIntentSchema,
  text: z.string().max(700),
  /** TEMPLATE when the narrative came from the fallback catalogue, so the UI can label it. */
  source: z.enum(['LLM', 'TEMPLATE']),
  plan: TripPlanSchema,
  suggestions: z.array(TripSuggestionSchema).max(3),
  quickReplies: z
    .array(z.object({ intent: CopilotIntentSchema, label: z.string().max(40) }))
    .max(4),
  trace: z.array(CopilotTraceStepSchema).max(6),
});
export type CopilotReply = z.infer<typeof CopilotReplySchema>;

export const SaveTripPlanInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  situation: TripSituationSchema,
  request: TripRequestSchema,
  /** Human-readable log of applied copilot changes, oldest first. */
  changeLog: z.array(z.string().max(200)).max(50),
});
export type SaveTripPlanInput = z.infer<typeof SaveTripPlanInputSchema>;

export const SavedTripPlanSchema = SaveTripPlanInputSchema.extend({
  id: z.string(),
  savedAt: z.iso.datetime({ offset: true }),
  metrics: TripMetricsSchema,
  stopNames: z.array(z.object({ en: z.string(), id: z.string() })),
});
export type SavedTripPlan = z.infer<typeof SavedTripPlanSchema>;

export const PlaceSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** Returns `items` arranged by `order`, or null when `order` is not a permutation of its indexes. */
function reorderBy<T>(items: readonly T[], order: readonly number[]): T[] | null {
  if (order.length !== items.length) return null;
  const seen = new Set(order);
  if (seen.size !== items.length || order.some((index) => index >= items.length)) return null;
  return order.map((index) => items[index] as T);
}

/**
 * Applies a copilot change to a trip request. Pure and shared, so the client, the mock
 * layer and the API produce the same trip. Invalid changes return the request unchanged.
 */
export function applyTripChange(request: TripRequest, change: TripChange): TripRequest {
  const stops = request.stops;
  switch (change.kind) {
    case 'SHIFT_DEPARTURE': {
      const shifted = new Date(Date.parse(request.departAt) + change.minutes * 60_000);
      return { ...request, departAt: toOffsetIso(shifted, request.departAt) };
    }
    case 'SET_STOPS':
      return {
        ...request,
        stops: change.venueIds.map((venueId) => ({ venueId })),
        ...(change.departAt ? { departAt: change.departAt } : {}),
      };
    case 'SWAP_STOP': {
      if (change.stopIndex >= stops.length) return request;
      return {
        ...request,
        stops: stops.map((stop, index) =>
          index === change.stopIndex ? { venueId: change.toVenueId } : stop,
        ),
      };
    }
    case 'REORDER': {
      const reordered = reorderBy(stops, change.order);
      return reordered ? { ...request, stops: reordered } : request;
    }
    case 'ADD_STOP': {
      if (stops.length >= MAX_TRIP_STOPS) return request;
      const at = Math.min(change.atIndex, stops.length);
      const added = { venueId: change.venueId, dwellMinutes: change.dwellMinutes };
      return { ...request, stops: [...stops.slice(0, at), added, ...stops.slice(at)] };
    }
    case 'REMOVE_STOP': {
      if (stops.length <= 1 || change.stopIndex >= stops.length) return request;
      return { ...request, stops: stops.filter((_, index) => index !== change.stopIndex) };
    }
  }
}

/** Formats `date` as ISO 8601 keeping the UTC offset of `template` (e.g. +08:00 for WITA). */
function toOffsetIso(date: Date, template: string): string {
  const match = /([+-])(\d{2}):(\d{2})$/.exec(template);
  if (!match) return date.toISOString();
  const sign = match[1] === '-' ? -1 : 1;
  const offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3]));
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  return `${local.toISOString().slice(0, 19)}${match[0]}`;
}

/** One candidate departure time and the trip it produces (computed by code). */
export const DepartureOptionSchema = z.object({
  departAt: z.iso.datetime({ offset: true }),
  crowdExposure: z.number().int().min(0).max(100),
  roadMinutes: z.number().int().min(0),
  closedStops: z.number().int().min(0),
  redZoneStops: z.number().int().min(0),
});
export type DepartureOption = z.infer<typeof DepartureOptionSchema>;

/** Departure scan across the trip's day; `bestIndex` is −1 when every option hits a closed stop. */
export const DepartureScanSchema = z.object({
  options: z.array(DepartureOptionSchema),
  bestIndex: z.number().int().min(-1),
});
export type DepartureScan = z.infer<typeof DepartureScanSchema>;

/**
 * Deterministic plan review (no LLM): the suggestions MARGI found for the current trip. Drives
 * the "MARGI found N improvements" banner without spending any model quota.
 */
export const TripInsightSchema = z.object({
  suggestions: z.array(TripSuggestionSchema).max(3),
});
export type TripInsight = z.infer<typeof TripInsightSchema>;
