import { z } from 'zod';
import {
  applyTripChange,
  CopilotIntentSchema,
  MAX_TRIP_STOPS,
  toWita,
  type CopilotIntent,
  type CopilotRequest,
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
import type { ChatToolSpec } from '../llm/openrouter.client';

const SuggestInput = z.object({
  intent: CopilotIntentSchema.exclude(['GREETING', 'EXPLAIN', 'UNKNOWN']).describe(
    'What to optimise: REVIEW_PLAN, STUCK_IN_TRAFFIC, BEST_TIME, QUIETER, ADD_FOOD or SUNSET.',
  ),
});
const SearchInput = z.object({
  query: z.string().min(2).max(60).describe('Part of a place name, in Indonesian or English.'),
});
const NoInput = z.object({});
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
    .describe('Place ids from search_places, in visiting order. Needed for SET_STOPS, ADD_STOP, SWAP_STOP.'),
  stopIndex: z.number().int().min(0).optional().describe('0-based stop position for SWAP_STOP and REMOVE_STOP.'),
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
      'Find attractions or local businesses by name near the traveller. Returns each place id, which change_trip needs. Use it whenever the traveller names a place.',
    parameters: z.toJSONSchema(SearchInput),
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
  readonly suggestions?: {
    intent: CopilotIntent;
    items: TripSuggestion[];
  };
}

function clock(iso: string): string {
  return toWita(iso).toFormat('HH:mm');
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
    stops: plan.stops.map((stop) => ({
      name: stop.place.venue.nameEn,
      arrive: clock(stop.arriveAt),
      crowdPercent: stop.place.crowd.busynessPct,
      open: stop.place.isOpenNow,
      redZone: stop.isRedZone,
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
    const places = deps.explore.search(parsed.data.query, deps.request.trip.origin);
    return {
      facts: {
        places: places.map((place) => ({
          id: place.venue.id,
          name: place.venue.nameEn,
          category: place.venue.category,
          distanceKm: place.distanceKm,
          crowdPercent: place.crowd.busynessPct,
          open: place.isOpenNow,
        })),
      },
    };
  }
  if (name === 'change_trip') {
    const parsed = ChangeInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Invalid change arguments' } };
    return changeTrip(parsed.data, deps);
  }
  return { facts: { error: `Unknown tool ${name}` } };
}

type ChangeArgs = z.infer<typeof ChangeInput>;

function toChange(args: ChangeArgs, stopCount: number): TripChange | string {
  const places = getCatalog().places;
  const ids = args.venueIds ?? [];
  if (ids.some((id) => !places.some((place) => place.venue.id === id))) {
    return 'Unknown place id; call search_places first';
  }
  const first = ids[0];
  switch (args.kind) {
    case 'SET_STOPS':
      return ids.length > 0 ? { kind: 'SET_STOPS', venueIds: ids } : 'venueIds is required';
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
    readonly simulate: boolean;
  },
): Promise<ToolOutcome> {
  const change = toChange(args, deps.request.trip.stops.length);
  if (typeof change === 'string') return { facts: { error: change } };

  const next = applyTripChange(deps.request.trip, change);
  const after = evaluateTrip(next, await deps.trips.context(next, deps.simulate));
  const scan = scanDepartures(next, await deps.trips.context(next, deps.simulate, true));
  const calmest = scan.options[scan.bestIndex];

  const shown =
    change.kind === 'REMOVE_STOP' ? undefined : change.kind === 'SWAP_STOP' ? after.stops[change.stopIndex] : after.stops[after.stops.length - 1];
  const card: TripSuggestion = {
    id: `user_${change.kind.toLowerCase()}_${Date.now().toString(36)}`,
    change,
    reason: 'USER_REQUESTED',
    venue: shown?.place ?? null,
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
      newTrip: summarisePlan(after),
      calmestDepartureForNewTrip: calmest
        ? { departure: clock(calmest.departAt), crowdExposure: calmest.crowdExposure }
        : null,
      differenceFromCurrent: card.delta,
    },
    suggestions: { intent: 'REVIEW_PLAN', items: [card] },
  };
}
