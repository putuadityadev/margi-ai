import { z } from 'zod';
import {
  applyTripChange,
  haversineKm,
  CopilotIntentSchema,
  MAX_TRIP_STOPS,
  toWita,
  type CopilotIntent,
  type CopilotRequest,
  type NearbyPlace,
  type TripChange,
  type TripPlan,
  type TripSuggestion,
} from '@margi-ai/shared';
import {
  evaluateTrip,
  getCatalog,
  roadMinutesOf,
  scanDepartures,
  suggestFor,
  type TripContext,
} from '@margi-ai/shared/engine';
import type { ExploreService } from '../explore/explore.service';
import type { TripsService } from '../trips/trips.service';
import type { PlacesService } from '../places/places.service';
import type { ChatToolSpec } from '../llm/openrouter.client';
import { hasNoForecast, lookupFreePlace, noForecastFacts } from './place-lookup';

const SuggestInput = z.object({
  intent: CopilotIntentSchema.exclude(['GREETING', 'EXPLAIN', 'UNKNOWN']).describe(
    'What to optimise: REVIEW_PLAN, STUCK_IN_TRAFFIC, BEST_TIME, QUIETER, ADD_FOOD or SUNSET.',
  ),
});
const SearchInput = z.object({
  query: z
    .string()
    .min(2)
    .max(60)
    .describe(
      'The place name exactly as the traveller wrote it, in Indonesian or English. Never add a town, regency or any detail they did not say.',
    ),
});
const NoInput = z.object({});
const DepartureInput = z.object({
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .describe('Departure time as 24-hour WITA, e.g. "06:00".'),
  day: z.enum(['today', 'tomorrow']).default('today').describe('Which day the traveller means.'),
});
const ChangeInput = z.object({
  kind: z
    .enum(['SET_STOPS', 'ADD_STOP', 'SWAP_STOP', 'REMOVE_STOP'])
    .describe(
      'SET_STOPS replaces the whole itinerary (traveller wants to go somewhere else); ADD_STOP appends one place; SWAP_STOP replaces the stop at stopIndex; REMOVE_STOP drops the stop at stopIndex.',
    ),
  venueIds: z
    .array(z.string())
    .max(MAX_TRIP_STOPS)
    .optional()
    .describe(
      'Place ids from search_places, in visiting order. Needed for SET_STOPS, ADD_STOP, SWAP_STOP.',
    ),
  stopIndex: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('0-based stop position for SWAP_STOP and REMOVE_STOP.'),
  departTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .describe(
      'Only with SET_STOPS: new departure time (24-hour WITA) when the traveller gave one.',
    ),
  day: z.enum(['today', 'tomorrow']).optional().describe('Day for departTime; default today.'),
  addFood: z
    .boolean()
    .optional()
    .describe(
      'Only with SET_STOPS: also add the nearest warung or cafe next to the LAST stop of the new itinerary. Use it for "and stop by a warung nearby"; never search a generic words such as "warung terdekat".',
    ),
});

export const COPILOT_TOOLS: readonly ChatToolSpec[] = [
  {
    name: 'suggest_changes',
    description:
      'Compute up to 3 concrete changes to the current trip (shift departure, swap a stop for a calmer similar place, reorder, add a local warung). Returns the exact crowd and time effect of each. Call this before recommending anything.',
    parameters: z.toJSONSchema(SuggestInput),
  },
  {
    name: 'scan_departures',
    description:
      'Crowd exposure of the whole trip for every 30-minute departure slot of the day, with the calmest slot where every stop is open.',
    parameters: z.toJSONSchema(NoInput),
  },
  {
    name: 'search_places',
    description:
      'Resolve what the traveller names into real places with ids. Works for a place name ("Tirta Empul"), for an area or regency ("Tabanan", "Kintamani") and for any other place on the map such as a school, office or warung ("SMA Negeri Bali Mandara"). Call it once per name. If nothing is found or several places match, tell the traveller; never substitute another place silently.',
    parameters: z.toJSONSchema(SearchInput),
  },
  {
    name: 'check_departure',
    description:
      'What-if for the CURRENT trip at a specific departure time on today or tomorrow (e.g. "what about 06:00?"): crowd at each stop on arrival, road time with the traffic forecast, whether stops are open, and when the trip ends. Returns a card to shift the departure.',
    parameters: z.toJSONSchema(DepartureInput),
  },
  {
    name: 'change_trip',
    description:
      'Change the trip as the traveller asked (go somewhere else, add a stop, swap or drop one) and compute the exact result: crowd, road time, and the calmest departure for the NEW trip. Returns a card the traveller can apply. Use only ids returned by search_places.',
    parameters: z.toJSONSchema(ChangeInput),
  },
];

/** What a tool call produced: compact facts for the model plus the typed objects for the reply. */
export interface ToolOutcome {
  readonly facts: unknown;
  /** Set when a named place was found nowhere (the app offers a map pin). */
  readonly pinQuery?: string;
  readonly suggestions?: {
    intent: CopilotIntent;
    items: TripSuggestion[];
  };
}

function clock(iso: string): string {
  return toWita(iso).toFormat('HH:mm');
}

/** WITA instant for "HH:mm today/tomorrow" as an ISO string with the +08:00 offset. */
export function departureAt(time: string, day: 'today' | 'tomorrow'): string {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return (
    toWita(new Date())
      .startOf('day')
      .plus({ days: day === 'tomorrow' ? 1 : 0 })
      .set({ hour, minute })
      .toISO() ?? ''
  );
}

function describePlace(place: NearbyPlace): Record<string, unknown> {
  if (hasNoForecast(place)) return noForecastFacts(place);
  return {
    id: place.venue.id,
    name: place.venue.nameEn,
    category: place.venue.category,
    distanceKm: place.distanceKm,
    crowdPercent: place.crowd.busynessPct,
    open: place.isOpenNow,
  };
}

function describeSuggestion(suggestion: TripSuggestion, plan: TripPlan): Record<string, unknown> {
  const { change } = suggestion;
  const stopName = (index: number): string => plan.stops[index]?.place.venue.nameEn ?? 'a stop';
  const target = suggestion.venue?.venue.nameEn;
  const action =
    change.kind === 'SHIFT_DEPARTURE'
      ? `shift departure by ${change.minutes} minutes`
      : change.kind === 'SWAP_STOP'
        ? `replace ${stopName(change.stopIndex)} with ${target ?? 'a calmer place'}`
        : change.kind === 'ADD_STOP'
          ? `add ${target ?? 'a local stop'} for ${change.dwellMinutes} minutes`
          : change.kind === 'REMOVE_STOP'
            ? `skip ${stopName(change.stopIndex)}`
            : change.kind === 'SET_STOPS'
              ? 'replace the whole trip'
              : 'reorder the stops';
  return {
    id: suggestion.id,
    action,
    reason: suggestion.reason,
    crowdPointsChange: suggestion.delta.crowdExposurePts,
    roadMinutesChange: suggestion.delta.travelMinutes,
    redZoneStopsChange: suggestion.delta.redZoneStops,
    crowdAfter: suggestion.after.crowdExposure,
  };
}

/** Snapshot of the current plan that the model may quote from. */
export function summarisePlan(plan: TripPlan): Record<string, unknown> {
  return {
    departure: clock(plan.request.departAt),
    from: plan.request.originLabel,
    crowdExposure: plan.metrics.crowdExposure,
    roadMinutes: plan.metrics.totalTravelMinutes + plan.metrics.totalDelayMinutes,
    redZoneStops: plan.metrics.redZoneStops,
    endsAt: clock(plan.metrics.endAt),
    tripHours:
      Math.round(
        ((Date.parse(plan.metrics.endAt) - Date.parse(plan.request.departAt)) / 3_600_000) * 10,
      ) / 10,
    stops: plan.stops.map((stop) => ({
      name: stop.place.venue.nameEn,
      arrive: clock(stop.arriveAt),
      ...(hasNoForecast(stop.place)
        ? { forecast: 'none' }
        : {
            crowdPercent: stop.place.crowd.busynessPct,
            open: stop.place.isOpenNow,
            redZone: stop.isRedZone,
          }),
      jamDelayMinutes: stop.leg.corridorDelayMinutes,
    })),
  };
}

/**
 * Executes one model-requested tool with engine code. Arguments come from the model and are
 * validated before use; an invalid call returns an error object the model can read.
 */
export async function runTool(
  name: string,
  rawArguments: string,
  deps: {
    readonly request: CopilotRequest;
    readonly ctx: TripContext;
    readonly plan: TripPlan;
    readonly explore: ExploreService;
    readonly trips: TripsService;
    readonly places: PlacesService;
    readonly simulate: boolean;
  },
): Promise<ToolOutcome> {
  let args: unknown;
  try {
    args = JSON.parse(rawArguments || '{}');
  } catch {
    return { facts: { error: 'Arguments were not valid JSON' } };
  }

  if (name === 'suggest_changes') {
    const parsed = SuggestInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Unknown intent' } };
    const items = suggestFor(parsed.data.intent, deps.request.trip, deps.ctx);
    return {
      facts: { suggestions: items.map((item) => describeSuggestion(item, deps.plan)) },
      suggestions: { intent: parsed.data.intent, items },
    };
  }
  if (name === 'scan_departures') {
    const scan = scanDepartures(deps.request.trip, deps.ctx);
    const best = scan.options[scan.bestIndex];
    return {
      facts: {
        calmest: best
          ? { departure: clock(best.departAt), crowdExposure: best.crowdExposure }
          : null,
        current: {
          departure: clock(deps.request.trip.departAt),
          crowdExposure: deps.plan.metrics.crowdExposure,
        },
      },
    };
  }
  if (name === 'search_places') {
    const parsed = SearchInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Query too short' } };
    const origin = deps.request.trip.origin;
    const area = deps.explore.inArea(parsed.data.query, origin);
    if (area) {
      return { facts: { areaMatch: area.label, places: area.places.map(describePlace) } };
    }
    const places = deps.explore.search(parsed.data.query, origin);
    if (places.length === 0) {
      const lookup = await lookupFreePlace(parsed.data.query, origin, deps);
      return { facts: lookup.facts, ...(lookup.pinQuery ? { pinQuery: lookup.pinQuery } : {}) };
    }
    return { facts: { places: places.map(describePlace) } };
  }
  if (name === 'check_departure') {
    const parsed = DepartureInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Use a 24-hour time like 06:00' } };
    return checkDeparture(parsed.data, deps);
  }
  if (name === 'change_trip') {
    const parsed = ChangeInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Invalid change arguments' } };
    return changeTrip(parsed.data, deps);
  }
  return { facts: { error: `Unknown tool ${name}` } };
}

type ChangeArgs = z.infer<typeof ChangeInput>;

/** A local business within this distance of the last stop counts as "nearby" for a food stop. */
const FOOD_REACH_KM = 6;

/**
 * The nearest warung or cafe to the last stop: the curated local businesses first, then the map
 * services (saved as a place without a forecast). Null when neither has one.
 */
async function findFoodNear(
  venueIds: readonly string[],
  places: PlacesService,
): Promise<{ id: string; name: string; km: number; forecast: 'curated' | 'none' } | null> {
  const catalog = getCatalog().places;
  const last = catalog.find((place) => place.venue.id === venueIds[venueIds.length - 1]);
  if (!last) return null;
  const curated = catalog
    .filter(
      (place) =>
        place.venue.kind === 'MSME' &&
        place.venue.isActive !== false &&
        !venueIds.includes(place.venue.id),
    )
    .map((place) => ({ place, km: haversineKm(last.venue, place.venue) }))
    .filter((item) => item.km <= FOOD_REACH_KM)
    .sort((a, b) => a.km - b.km)[0];
  if (curated) {
    return {
      id: curated.place.venue.id,
      name: curated.place.venue.nameEn,
      km: Math.round(curated.km * 10) / 10,
      forecast: 'curated',
    };
  }
  const id = await places.nearbyFood(last.venue);
  // Re-read the catalogue: a place saved just now was registered after `catalog` was taken.
  const place = id ? getCatalog().places.find((item) => item.venue.id === id) : undefined;
  if (!place) return null;
  return {
    id: place.venue.id,
    name: place.venue.nameEn,
    km: Math.round(haversineKm(last.venue, place.venue) * 10) / 10,
    forecast: 'none',
  };
}

function toChange(args: ChangeArgs, stopCount: number): TripChange | string {
  const places = getCatalog().places;
  const ids = args.venueIds ?? [];
  if (ids.some((id) => !places.some((place) => place.venue.id === id))) {
    return 'Unknown place id; call search_places first';
  }
  const first = ids[0];
  switch (args.kind) {
    case 'SET_STOPS':
      if (ids.length === 0) return 'venueIds is required';
      return {
        kind: 'SET_STOPS',
        venueIds: ids,
        ...(args.departTime ? { departAt: departureAt(args.departTime, args.day ?? 'today') } : {}),
      };
    case 'ADD_STOP': {
      if (!first) return 'venueIds is required';
      if (stopCount >= MAX_TRIP_STOPS) return `A trip holds at most ${MAX_TRIP_STOPS} stops`;
      const dwell = places.find((place) => place.venue.id === first)?.venue.avgDwellMinutes ?? 45;
      return {
        kind: 'ADD_STOP',
        atIndex: stopCount,
        venueId: first,
        dwellMinutes: Math.min(360, Math.max(10, dwell)),
      };
    }
    case 'SWAP_STOP':
      if (!first || args.stopIndex === undefined || args.stopIndex >= stopCount) {
        return 'stopIndex and one venue id are required';
      }
      return { kind: 'SWAP_STOP', stopIndex: args.stopIndex, toVenueId: first };
    case 'REMOVE_STOP':
      if (args.stopIndex === undefined || args.stopIndex >= stopCount || stopCount <= 1) {
        return 'A valid stopIndex is required and one stop must remain';
      }
      return { kind: 'REMOVE_STOP', stopIndex: args.stopIndex };
  }
}

/**
 * Applies the traveller's requested change to a copy of the trip, re-routes it with real
 * providers, and returns the computed outcome plus a ready-to-apply card. Names resolve through
 * ids and every number comes from the engine, never from the model.
 */
async function changeTrip(
  args: ChangeArgs,
  deps: {
    readonly request: CopilotRequest;
    readonly plan: TripPlan;
    readonly trips: TripsService;
    readonly places: PlacesService;
    readonly simulate: boolean;
  },
): Promise<ToolOutcome> {
  const base = toChange(args, deps.request.trip.stops.length);
  if (typeof base === 'string') return { facts: { error: base } };
  let change: TripChange = base;
  let foodStop: Record<string, unknown> | null = null;
  if (args.addFood && base.kind === 'SET_STOPS' && base.venueIds.length < MAX_TRIP_STOPS) {
    const found = await findFoodNear(base.venueIds, deps.places);
    if (found) {
      change = { ...base, venueIds: [...base.venueIds, found.id] };
      foodStop = { name: found.name, kmFromLastStop: found.km, forecast: found.forecast };
    } else {
      foodStop = { none: 'No warung or cafe was found near the last stop' };
    }
  }

  const next = applyTripChange(deps.request.trip, change);
  const after = evaluateTrip(next, await deps.trips.context(next, deps.simulate));
  const scan = scanDepartures(next, await deps.trips.context(next, deps.simulate, true));
  const calmest = scan.options[scan.bestIndex];

  const shown =
    change.kind === 'REMOVE_STOP'
      ? undefined
      : change.kind === 'SWAP_STOP'
        ? after.stops[change.stopIndex]
        : after.stops[after.stops.length - 1];
  const card: TripSuggestion = {
    id: `user_${change.kind.toLowerCase()}_${Date.now().toString(36)}`,
    change,
    reason: 'USER_REQUESTED',
    venue: shown?.place ?? null,
    ...(change.kind === 'SET_STOPS' ? { venues: after.stops.map((stop) => stop.place) } : {}),
    after: after.metrics,
    delta: {
      crowdExposurePts: after.metrics.crowdExposure - deps.plan.metrics.crowdExposure,
      travelMinutes: roadMinutesOf(after.metrics) - roadMinutesOf(deps.plan.metrics),
      redZoneStops: after.metrics.redZoneStops - deps.plan.metrics.redZoneStops,
    },
  };
  return {
    facts: {
      requested: change.kind,
      ...(foodStop ? { foodStop } : {}),
      newTrip: summarisePlan(after),
      calmestDepartureForNewTrip: calmest
        ? { departure: clock(calmest.departAt), crowdExposure: calmest.crowdExposure }
        : null,
      differenceFromCurrent: card.delta,
    },
    suggestions: { intent: 'REVIEW_PLAN', items: [card] },
  };
}

/**
 * "What if I leave at 06:00?": evaluates the current trip at that departure with the real routing
 * forecast and returns the effect plus a card that shifts the departure.
 */
async function checkDeparture(
  args: z.infer<typeof DepartureInput>,
  deps: {
    readonly request: CopilotRequest;
    readonly plan: TripPlan;
    readonly trips: TripsService;
    readonly simulate: boolean;
  },
): Promise<ToolOutcome> {
  const trip = deps.request.trip;
  const when = departureAt(args.time, args.day);
  const next = { ...trip, departAt: when };
  const after = evaluateTrip(next, await deps.trips.context(next, deps.simulate));
  const card: TripSuggestion = {
    id: `user_depart_${args.day}_${args.time.replace(':', '')}`,
    change: {
      kind: 'SHIFT_DEPARTURE',
      minutes: Math.round((Date.parse(when) - Date.parse(trip.departAt)) / 60_000),
    },
    reason: 'USER_REQUESTED',
    venue: null,
    after: after.metrics,
    delta: {
      crowdExposurePts: after.metrics.crowdExposure - deps.plan.metrics.crowdExposure,
      travelMinutes: roadMinutesOf(after.metrics) - roadMinutesOf(deps.plan.metrics),
      redZoneStops: after.metrics.redZoneStops - deps.plan.metrics.redZoneStops,
    },
  };
  return {
    facts: {
      asked: `${args.time} ${args.day}`,
      alreadyPassed: Date.parse(when) < Date.now(),
      tripAtThatTime: summarisePlan(after),
      differenceFromCurrent: card.delta,
    },
    suggestions: { intent: 'BEST_TIME', items: [card] },
  };
}
