import {
  detourKm,
  distanceToPathKm,
  haversineKm,
  pointsAlongPath,
  type GeoPoint,
  type NearbyPlace,
} from '@margi-ai/shared';
import { getCatalog, type CatalogPlace } from '@margi-ai/shared/engine';
import type { ExploreService } from '../explore/explore.service';
import type { PlacesService } from '../places/places.service';
import type { FoodSearchOptions, PlaceCandidate } from '../places/place-resolver.service';
import { foldText } from '../places/place-query';

/** Around one point: how far a food place may be. */
const AROUND_KM = 4;
/** Along a leg: how far from the road a food place may be. */
const CORRIDOR_KM = 1.5;
/** Points sampled along a leg for the map search, as fractions of its length. */
const LEG_SAMPLES = [0.2, 0.5, 0.8] as const;
const SAMPLE_RADIUS_M = { min: 1_500, max: 4_000 } as const;
/** Curated businesses have a crowd forecast, so they win ties within this distance. */
const CURATED_PREFERENCE_KM = 0.5;
/** Words that say "food" without naming a dish; they are not searched for. */
const FOOD_FILLER = new Set([
  'nasi',
  'makan',
  'makanan',
  'warung',
  'tempat',
  'restoran',
  'restaurant',
  'enak',
  'lokal',
  'local',
  'yang',
  'food',
]);
const COFFEE_WORDS = /\b(n?gopi|kopi|coffee|cafe|kafe|ngafe)\b/;

export interface FoodQuery {
  /** One point = around it; two or more = along that road. */
  readonly path: readonly GeoPoint[];
  /** The dish or drink in the traveller's words; empty for any local food. */
  readonly dish?: string;
  readonly exclude: ReadonlySet<string>;
  readonly limit: number;
}

export interface FoodFound {
  readonly place: NearbyPlace;
  /** Straight-line kilometres from the point, or extra kilometres of the detour on a leg. */
  readonly km: number;
  readonly curated: boolean;
}

type DishFilter =
  | { readonly kind: 'any' }
  | { readonly kind: 'coffee' }
  | { readonly kind: 'words'; readonly words: readonly string[] };

/** What the traveller asked to eat, reduced to words worth searching for. */
export function dishFilter(dish: string | undefined): DishFilter {
  const folded = foldText(dish ?? '');
  if (COFFEE_WORDS.test(folded)) return { kind: 'coffee' };
  const words = folded.split(' ').filter((word) => word.length > 1 && !FOOD_FILLER.has(word));
  return words.length > 0 ? { kind: 'words', words } : { kind: 'any' };
}

function curatedMatches(seed: CatalogPlace, filter: DishFilter): boolean {
  const { venue } = seed;
  if (venue.kind !== 'MSME' || venue.isActive === false) return false;
  if (filter.kind === 'coffee') return venue.category === 'COFFEE';
  const isFood = venue.category === 'CULINARY' || venue.category === 'COFFEE';
  if (filter.kind === 'any') return isFood;
  const text = foldText(`${venue.nameEn} ${venue.nameId} ${venue.descriptionEn ?? ''}`);
  return filter.words.every((word) => text.includes(word));
}

/** Map search terms: TomTom's POI search for a dish, a plain category search otherwise. */
function mapOptions(filter: DishFilter): FoodSearchOptions {
  if (filter.kind === 'coffee') return { categories: 'cafe' };
  if (filter.kind === 'words') return { dish: filter.words.join(' ') };
  return {};
}

/**
 * Local food around a point or along one leg of a trip: curated local businesses first (they
 * have a crowd forecast), then map results, ranked by distance or by detour. Map places that are
 * returned are saved as places without a forecast (D-035) so cards and trips can use them.
 * Every distance comes from geometry here, never from the language model.
 */
export async function findFood(
  query: FoodQuery,
  deps: { readonly places: PlacesService; readonly explore: ExploreService },
): Promise<FoodFound[]> {
  const from = query.path[0];
  const to = query.path[query.path.length - 1];
  if (!from || !to) return [];
  const along = query.path.length > 1;
  const reachKm = along ? CORRIDOR_KM : AROUND_KM;
  const score = (point: GeoPoint): number =>
    along ? detourKm(from, point, to) : haversineKm(from, point);
  const filter = dishFilter(query.dish);

  const curated = getCatalog()
    .places.filter((seed) => !query.exclude.has(seed.venue.id) && curatedMatches(seed, filter))
    .filter((seed) => distanceToPathKm(seed.venue, query.path) <= reachKm)
    .map((seed) => ({ id: seed.venue.id, km: score(seed.venue) - CURATED_PREFERENCE_KM }));

  const legKm = along ? haversineKm(from, to) : 0;
  const centres = along ? pointsAlongPath(query.path, LEG_SAMPLES) : [from];
  const radiusM = along
    ? Math.round(Math.min(SAMPLE_RADIUS_M.max, Math.max(SAMPLE_RADIUS_M.min, (legKm * 1_000) / 4)))
    : AROUND_KM * 1_000;
  // Sequential on purpose: the map provider limits requests per second.
  const found: PlaceCandidate[][] = [];
  for (const centre of centres) {
    found.push(await deps.places.foodAround(centre, { radiusM, ...mapOptions(filter) }));
  }
  const mapped = uniqueCandidates(found.flat())
    .filter((candidate) => distanceToPathKm(candidate, query.path) <= reachKm)
    .filter((candidate) => !curated.some((item) => sameSpot(item.id, candidate)))
    .map((candidate) => ({ candidate, km: score(candidate) }));

  const ranked = [
    ...curated.map((item) => ({ ...item, candidate: null })),
    ...mapped.map((item) => ({ id: null, ...item })),
  ]
    .sort((a, b) => a.km - b.km)
    .slice(0, query.limit);

  const results: FoodFound[] = [];
  for (const item of ranked) {
    const id = item.id ?? (item.candidate ? await deps.places.keep(item.candidate) : null);
    const place = id ? deps.explore.placeById(id, from) : null;
    if (!place || query.exclude.has(place.venue.id)) continue;
    results.push({
      place,
      km: Math.round(score(place.venue) * 10) / 10,
      curated: item.id !== null,
    });
  }
  return results;
}

function uniqueCandidates(candidates: readonly PlaceCandidate[]): PlaceCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.externalRef)) return false;
    seen.add(candidate.externalRef);
    return true;
  });
}

/** True when a map result is a curated business already listed (same name within 150 m). */
function sameSpot(venueId: string, candidate: PlaceCandidate): boolean {
  const seed = getCatalog().places.find((place) => place.venue.id === venueId);
  if (!seed) return false;
  return (
    haversineKm(seed.venue, candidate) < 0.15 &&
    foldText(seed.venue.nameEn) === foldText(candidate.name)
  );
}
