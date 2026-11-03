import { z } from 'zod';
import {
  CopilotIntentSchema,
  toWita,
  type CopilotRequest,
  type TripPlan,
  type TripSuggestion,
} from '@margi-ai/shared';
import { scanDepartures, suggestFor, type TripContext } from '@margi-ai/shared/engine';
import type { ExploreService } from '../explore/explore.service';
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
      'Find attractions or local businesses by name near the traveller. Use it when the traveller names a place that is not in the trip.',
    parameters: z.toJSONSchema(SearchInput),
  },
];

/** What a tool call produced: compact facts for the model plus the typed objects for the reply. */
export interface ToolOutcome {
  readonly facts: unknown;
  readonly suggestions?: {
    intent: z.infer<typeof SuggestInput>['intent'];
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
export function runTool(
  name: string,
  rawArguments: string,
  deps: {
    readonly request: CopilotRequest;
    readonly ctx: TripContext;
    readonly plan: TripPlan;
    readonly explore: ExploreService;
  },
): ToolOutcome {
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
          name: place.venue.nameEn,
          distanceKm: place.distanceKm,
          crowdPercent: place.crowd.busynessPct,
          open: place.isOpenNow,
        })),
      },
    };
  }
  return { facts: { error: `Unknown tool ${name}` } };
}
