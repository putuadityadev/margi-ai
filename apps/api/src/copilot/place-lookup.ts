import type { GeoPoint, NearbyPlace } from '@margi-ai/shared';
import type { ExploreService } from '../explore/explore.service';
import type { PlacesService } from '../places/places.service';

/** What the assistant is told about a place that has no crowd forecast. */
const NO_FORECAST_NOTE =
  'Not in the MARGI catalogue (found on a map service). Road time is real, but there is no crowd forecast and no opening hours: never quote a crowd figure or say it is open or closed.';

export interface LookupOutcome {
  readonly facts: Record<string, unknown>;
  readonly places: readonly NearbyPlace[];
  /** Set when nothing matched anywhere, so the app can offer to mark the place on the map. */
  readonly pinQuery?: string;
}

/** True for a place outside the curated catalogue (no forecast to report). */
export function hasNoForecast(place: NearbyPlace): boolean {
  return place.venue.kind === 'OTHER';
}

/** Facts for a place without a forecast: no crowd figure and no open/closed claim. */
export function noForecastFacts(place: NearbyPlace): Record<string, unknown> {
  return {
    id: place.venue.id,
    name: place.venue.nameEn,
    address: place.venue.descriptionEn,
    distanceKm: place.distanceKm,
    travelMinutes: place.travelMinutes,
    forecast: 'none',
    note: NO_FORECAST_NOTE,
  };
}

/**
 * Looks a named place up beyond the catalogue: saved places first (the caller already searched
 * them), then OpenStreetMap and TomTom. Every outcome is described as facts the model must follow;
 * nothing is invented and a lookup failure is reported as a failure, not as "not found".
 */
export async function lookupFreePlace(
  query: string,
  origin: GeoPoint,
  deps: { readonly places: PlacesService; readonly explore: ExploreService },
): Promise<LookupOutcome> {
  const result = await deps.places.find(query, origin);

  if (result.status === 'found') {
    const place = deps.explore.placeById(result.venueId, origin);
    if (place) {
      return {
        facts: { places: [noForecastFacts(place)], foundOnMap: true },
        places: [place],
      };
    }
  }
  if (result.status === 'generic') {
    return {
      facts: {
        places: [],
        note: 'That words a kind of place or "nearest", not the name of one place, so it was not searched on the map. For "stop at a warung nearby" use change_trip with addFood on the new trip, or nearby_places; for anything else ask the traveller for the name or the area.',
      },
      places: [],
    };
  }
  if (result.status === 'ambiguous') {
    return {
      facts: {
        places: [],
        ambiguous: result.options,
        note: 'Several places could match. Tell the traveller these options (name and address) and ask which one they mean; they may add a town or a landmark, or mark the place on the map if none of these is it. Do not choose for them.',
      },
      places: [],
      pinQuery: query.slice(0, 60),
    };
  }
  if (result.status === 'unavailable') {
    return {
      facts: {
        places: [],
        error: 'Place lookup is temporarily unavailable',
        note: 'Tell the traveller to try again in a moment. Do not guess a place.',
      },
      places: [],
    };
  }
  return {
    facts: {
      places: [],
      notFound: query,
      note: 'No catalogue place or map result has this name. Say so plainly, do not pick another place, and tell the traveller they can mark the place on the map or name a nearby landmark or town.',
    },
    places: [],
    pinQuery: query.slice(0, 60),
  };
}
