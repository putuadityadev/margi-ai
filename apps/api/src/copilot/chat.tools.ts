import { z } from 'zod';
import { MAX_TRIP_STOPS, VibeTagSchema, type GeoPoint, type NearbyPlace } from '@margi-ai/shared';
import { buildPlaceDetail, getCatalog } from '@margi-ai/shared/engine';
import type { ExploreService } from '../explore/explore.service';
import type { PlacesService } from '../places/places.service';
import type { ChatToolSpec } from '../llm/openrouter.client';
import { departureAt } from './copilot.tools';
import { hasNoForecast, lookupFreePlace, noForecastFacts } from './place-lookup';

const SearchInput = z.object({
  query: z
    .string()
    .min(2)
    .max(60)
    .describe(
      'A place name or an area such as "Ubud" or "Tabanan", exactly as the traveller wrote it. Never add a town, regency or any detail they did not say.',
    ),
});
const NearbyInput = z.object({
  vibe: VibeTagSchema.optional().describe('Mood filter, e.g. BEACH, SUNSET, WATERFALL.'),
  kind: z
    .enum(['attraction', 'food', 'any'])
    .default('attraction')
    .describe('attraction = destinations, food = warung and cafes, any = both.'),
  limit: z.number().int().min(1).max(6).default(5),
});
const InfoInput = z.object({
  id: z.string().describe('Place id from search_places or nearby_places.'),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .describe('24-hour WITA time to check, e.g. "16:00". Omit for the visit time in use.'),
  day: z.enum(['today', 'tomorrow']).default('today'),
});
const ShowInput = z.object({
  ids: z
    .array(z.string())
    .min(1)
    .max(MAX_TRIP_STOPS)
    .describe('Place ids to show to the traveller as cards, best first.'),
});

export const CHAT_TOOLS: readonly ChatToolSpec[] = [
  {
    name: 'search_places',
    description:
      'Resolve a place name or an area (Ubud, Tabanan, Kintamani) into real places with ids. An area returns its best-known attractions. Also finds any other place on the map (a school, an office, a warung). If nothing is found or several places match, tell the traveller; never substitute.',
    parameters: z.toJSONSchema(SearchInput),
  },
  {
    name: 'nearby_places',
    description:
      'The calmest open places around the traveller right now (or at the visit time), optionally by mood or food. Use it for "somewhere quiet", "good for sunset", "a warung nearby".',
    parameters: z.toJSONSchema(NearbyInput),
  },
  {
    name: 'place_info',
    description:
      'Details of one place: crowd at a given time, quietest hours, whether it is open, visit length, queue, etiquette, calmer similar places and local businesses nearby.',
    parameters: z.toJSONSchema(InfoInput),
  },
  {
    name: 'show_places',
    description:
      'Show up to 4 places to the traveller as tappable cards (they can add them to a plan). Call it whenever you recommend specific places, with ids you got from a tool.',
    parameters: z.toJSONSchema(ShowInput),
  },
];

export interface ChatToolOutcome {
  readonly facts: unknown;
  /** Set when a named place was found nowhere (the app offers a map pin). */
  readonly pinQuery?: string;
  /** Places the tool surfaced, so ids the model later shows resolve to real objects. */
  readonly seen?: readonly NearbyPlace[];
  /** Places to show as cards when the model asked for them. */
  readonly shown?: readonly string[];
  /** Fallback cards when the model shows none: what this tool found, best first. */
  readonly candidates?: readonly NearbyPlace[];
}

function brief(place: NearbyPlace): Record<string, unknown> {
  if (hasNoForecast(place)) return noForecastFacts(place);
  return {
    id: place.venue.id,
    name: place.venue.nameEn,
    category: place.venue.category,
    distanceKm: place.distanceKm,
    travelMinutes: place.travelMinutes,
    crowdPercent: place.crowd.busynessPct,
    crowdLevel: place.crowd.level,
    open: place.isOpenNow,
  };
}

function hourText(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export interface ChatToolDeps {
  readonly explore: ExploreService;
  readonly places: PlacesService;
  readonly origin: GeoPoint;
  /** Visit instant in use (undefined = now). */
  readonly at: string | undefined;
  /** Every place surfaced so far in this conversation turn. */
  readonly known: ReadonlyMap<string, NearbyPlace>;
}

/** Executes one chat tool with engine code; arguments are validated, errors are readable facts. */
export async function runChatTool(
  name: string,
  rawArguments: string,
  deps: ChatToolDeps,
): Promise<ChatToolOutcome> {
  let args: unknown;
  try {
    args = JSON.parse(rawArguments || '{}');
  } catch {
    return { facts: { error: 'Arguments were not valid JSON' } };
  }
  const ctx = deps.explore.exploreContext(deps.origin, [], deps.at);

  if (name === 'search_places') {
    const parsed = SearchInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Query too short' } };
    const area = deps.explore.inArea(parsed.data.query, deps.origin);
    if (area) {
      return {
        facts: { areaMatch: area.label, places: area.places.map(brief) },
        seen: area.places,
        candidates: area.places,
      };
    }
    const places = deps.explore.search(parsed.data.query, deps.origin);
    if (places.length === 0) {
      const lookup = await lookupFreePlace(parsed.data.query, deps.origin, deps);
      return {
        facts: lookup.facts,
        seen: lookup.places,
        candidates: lookup.places,
        ...(lookup.pinQuery ? { pinQuery: lookup.pinQuery } : {}),
      };
    }
    return { facts: { places: places.map(brief) }, seen: places, candidates: places };
  }

  if (name === 'nearby_places') {
    const parsed = NearbyInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Invalid filter' } };
    const { vibe, kind, limit } = parsed.data;
    const nearby = await deps.explore.nearby(ctx, 40, deps.at);
    const picked = nearby
      .filter((place) => place.isOpenNow)
      .filter((place) =>
        kind === 'attraction'
          ? place.venue.kind === 'DTW'
          : kind === 'food'
            ? place.venue.kind === 'MSME'
            : true,
      )
      .filter((place) => !vibe || place.vibeTags.includes(vibe))
      .sort(
        (a, b) =>
          a.crowd.busynessPct +
          a.travelMinutes * 0.4 -
          (b.crowd.busynessPct + b.travelMinutes * 0.4),
      )
      .slice(0, limit);
    return {
      facts:
        picked.length > 0
          ? { places: picked.map(brief) }
          : { places: [], note: 'Nothing open matches.' },
      seen: picked,
      candidates: picked,
    };
  }

  if (name === 'place_info') {
    const parsed = InfoInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Invalid place_info arguments' } };
    const { id, time, day } = parsed.data;
    if (!getCatalog().places.some((place) => place.venue.id === id)) {
      return { facts: { error: 'Unknown place id; call search_places first' } };
    }
    const when = time ? departureAt(time, day) : deps.at;
    const detail = buildPlaceDetail(id, deps.explore.exploreContext(deps.origin, [], when));
    if (!detail) return { facts: { error: 'Place not found' } };
    const peak = detail.today.reduce((best, hour) =>
      hour.busynessPct > best.busynessPct ? hour : best,
    );
    const seen = [
      detail.place,
      ...detail.alternatives.slice(0, 2).map((alternative) => alternative.place),
      ...detail.nearbyMsmes.slice(0, 2),
    ];
    return {
      facts: {
        ...brief(detail.place),
        askedFor: time ? `${time} ${day}` : 'visit time in use',
        quietestHours: detail.quietHours.map(hourText),
        busiestHour: { time: hourText(peak.hour), crowdPercent: peak.busynessPct },
        visitMinutes: detail.avgDwellMinutes,
        peakQueueMinutes: detail.typicalPeakQueueMinutes,
        etiquette: detail.etiquetteTags,
        calmerSimilarPlaces: detail.alternatives.slice(0, 2).map((alternative) => ({
          ...brief(alternative.place),
          crowdPointsCalmer: alternative.crowdDropPts,
        })),
        localBusinessesNearby: detail.nearbyMsmes.slice(0, 2).map(brief),
      },
      seen,
      candidates: [detail.place],
    };
  }

  if (name === 'show_places') {
    const parsed = ShowInput.safeParse(args);
    if (!parsed.success) return { facts: { error: 'Invalid ids' } };
    const known = parsed.data.ids.filter((id) => deps.known.has(id));
    if (known.length === 0) return { facts: { error: 'None of those ids came from a tool' } };
    return { facts: { shown: known.length }, shown: known.slice(0, 4) };
  }

  return { facts: { error: `Unknown tool ${name}` } };
}
