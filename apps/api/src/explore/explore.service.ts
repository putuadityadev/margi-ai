import { Injectable } from '@nestjs/common';
import {
  haversineKm,
  toWita,
  type FeedCard,
  type GeoPoint,
  type NearbyPlace,
  type VibeTag,
} from '@margi-ai/shared';
import {
  buildPlaceDetail,
  findNearby,
  getCatalog,
  toNearbyPlace,
  type ExploreContext,
  type TripContext,
} from '@margi-ai/shared/engine';
import { CatalogService } from '../catalog/catalog.service';
import { ContextService } from '../context/context.service';
import { TrafficSignalService } from '../crowd/traffic-signal.service';

const SEARCH_LIMIT = 8;
const AREA_RADIUS_KM = 15;
const AREA_LIMIT = 6;
/** A place counts as busy for the "calmer instead" hint from this reading up. */
const FEED_BUSY_PCT = 60;
const FEED_MIN_DROP_PTS = 15;
/** A visit counts as "now" (eligible for the live traffic signal) within this window. */
const LIVE_WINDOW_MS = 30 * 60 * 1000;
/** Only places already modelled this busy, plus hotspots, get a live lookup (quota, DATA-SOURCES §1). */
const LIVE_LOOKUP_MIN_BUSYNESS = 40;
const LIVE_LOOKUP_MAX_PLACES = 15;

/** Lowercase and strip diacritics so "Pura Tirta Empul" matches "pura tirta empül". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Builds engine contexts that carry the real-world crowd multiplier (holidays, ceremonies). */
@Injectable()
export class ExploreService {
  constructor(
    private readonly context: ContextService,
    private readonly traffic: TrafficSignalService,
    private readonly catalog: CatalogService,
  ) {}

  /** `simulate` is the judge stress-test toggle (BR-06): hotspots surge and readings say so. */
  exploreContext(
    origin: GeoPoint,
    vibes: readonly VibeTag[],
    at?: string,
    simulate = false,
  ): ExploreContext {
    return {
      origin,
      vibes,
      at: toWita(at ?? new Date()),
      surge: simulate,
      tier: simulate ? 'SIMULATION' : 'FORECAST',
      crowdMultiplier: this.context.crowdMultiplier,
    };
  }

  tripContext(simulate = false): Omit<TripContext, 'legOverride'> {
    return {
      surge: simulate,
      tier: simulate ? 'SIMULATION' : 'FORECAST',
      crowdMultiplier: this.context.crowdMultiplier,
    };
  }

  /** True when a visit at `at` (default: now) is close enough to now for live traffic to apply. */
  private isNow(at: string | undefined): boolean {
    return at === undefined || Math.abs(Date.parse(at) - Date.now()) <= LIVE_WINDOW_MS;
  }

  /**
   * Nearby places, with live congestion folded in for the busiest ones when the visit is now.
   * Places without a usable signal keep the plain model reading and the `MODEL` label.
   */
  async nearby(
    ctx: ExploreContext,
    radiusKm: number,
    at: string | undefined,
  ): Promise<NearbyPlace[]> {
    const modelled = findNearby(ctx, radiusKm);
    if (ctx.surge || !this.isNow(at)) return modelled;
    const candidates = modelled
      .filter(
        (place) =>
          place.isOpenNow &&
          (place.venue.isHotspot || place.crowd.busynessPct >= LIVE_LOOKUP_MIN_BUSYNESS),
      )
      .slice(0, LIVE_LOOKUP_MAX_PLACES)
      .map((place) => ({ id: place.venue.id, lat: place.venue.lat, lng: place.venue.lng }));
    const liveCongestion = await this.traffic.congestion(candidates);
    return liveCongestion.size === 0 ? modelled : findNearby({ ...ctx, liveCongestion }, radiusKm);
  }

  /** Context for one place's detail, with its live congestion when the visit is now. */
  async placeContext(
    ctx: ExploreContext,
    venueId: string,
    at: string | undefined,
  ): Promise<ExploreContext> {
    if (ctx.surge || !this.isNow(at)) return ctx;
    const seed = getCatalog().places.find((place) => place.venue.id === venueId);
    if (!seed) return ctx;
    const liveCongestion = await this.traffic.congestion([
      { id: venueId, lat: seed.venue.lat, lng: seed.venue.lng },
    ]);
    return liveCongestion.size === 0 ? ctx : { ...ctx, liveCongestion };
  }

  /** One place as a card relative to `near`, or null when the id is unknown. */
  placeById(id: string, near: GeoPoint): NearbyPlace | null {
    const seed = getCatalog().places.find((place) => place.venue.id === id);
    return seed ? toNearbyPlace(seed, this.exploreContext(near, [])) : null;
  }

  /** Name search over every active place (attractions and local businesses), nearest first. */
  search(query: string, near: GeoPoint): NearbyPlace[] {
    const needle = fold(query);
    const ctx = this.exploreContext(near, []);
    return getCatalog()
      .places.filter(
        (seed) =>
          seed.venue.isActive !== false &&
          (fold(seed.venue.nameEn).includes(needle) || fold(seed.venue.nameId).includes(needle)),
      )
      .map((seed) => toNearbyPlace(seed, ctx))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, SEARCH_LIMIT);
  }

  /**
   * Places in a named area or regency ("Kintamani", "Tabanan"): the traveller names a region, not a
   * venue. Well-known attractions come first. Null when the text is not a known area.
   */
  inArea(query: string, near: GeoPoint): { label: string; places: NearbyPlace[] } | null {
    const needle = fold(query)
      .replace(/^(kabupaten|kota|desa|area|daerah)\s+/, '')
      .trim();
    if (needle.length < 3) return null;
    const matches = (en: string, id: string): boolean =>
      [fold(en), fold(id)].some(
        (name) => name === needle || (name.length >= 4 && needle.includes(name)),
      );
    const catalog = getCatalog();
    const area = this.catalog.areas.find((candidate) =>
      matches(candidate.nameEn, candidate.nameId),
    );
    const regency = catalog.regencies.find((candidate) =>
      matches(candidate.nameEn, candidate.nameId),
    );
    const ctx = this.exploreContext(near, []);
    // Places learned from searches have no forecast and are not area highlights.
    const curated = catalog.places.filter((seed) => seed.venue.kind !== 'OTHER');

    const attractionsOf = (seeds: typeof catalog.places) => {
      const attractions = seeds.filter((seed) => seed.venue.kind === 'DTW');
      return attractions.length > 0 ? attractions : seeds;
    };
    const rank = (seeds: typeof catalog.places, centre: GeoPoint): NearbyPlace[] =>
      [...attractionsOf(seeds)]
        .sort(
          (a, b) =>
            Number(b.venue.isHotspot) - Number(a.venue.isHotspot) ||
            haversineKm(centre, a.venue) - haversineKm(centre, b.venue),
        )
        .slice(0, AREA_LIMIT)
        .map((seed) => toNearbyPlace(seed, ctx));

    if (area) {
      const around = curated.filter((seed) => haversineKm(area, seed.venue) <= AREA_RADIUS_KM);
      if (attractionsOf(around).some((seed) => seed.venue.kind === 'DTW') || !regency) {
        return around.length > 0 ? { label: area.nameEn, places: rank(around, area) } : null;
      }
    }
    if (regency) {
      const inside = curated.filter((seed) => seed.venue.regencyId === regency.id);
      if (inside.length > 0) return { label: regency.nameEn, places: rank(inside, near) };
    }
    return null;
  }

  /**
   * One page of the endless feed: every active destination in a seeded shuffle. Round `n` of the
   * feed is shuffled with `seed:n`, so a full pass shows each place once before any repeats.
   */
  feedPage(
    ctx: ExploreContext,
    seed: string,
    offset: number,
    limit: number,
  ): { cards: FeedCard[]; total: number; nextOffset: number } {
    const destinations = getCatalog()
      .places.filter(
        (seedPlace) => seedPlace.venue.kind === 'DTW' && seedPlace.venue.isActive !== false,
      )
      .map((seedPlace) => seedPlace.venue.id)
      .sort();
    const total = destinations.length;
    const cards: FeedCard[] = [];
    if (total === 0) return { cards, total, nextOffset: offset };
    const rounds = new Map<number, string[]>();
    for (let index = offset; index < offset + limit; index += 1) {
      const round = Math.floor(index / total);
      let order = rounds.get(round);
      if (!order) {
        order = seededShuffle(destinations, `${seed}:${round}`);
        rounds.set(round, order);
      }
      const id = order[index % total];
      const detail = id ? buildPlaceDetail(id, ctx) : null;
      if (!detail) continue;
      const busy = detail.place.crowd.busynessPct >= FEED_BUSY_PCT;
      const alternative = busy
        ? detail.alternatives.find(
            (candidate) =>
              candidate.place.venue.kind === 'DTW' &&
              candidate.place.isOpenNow &&
              candidate.crowdDropPts >= FEED_MIN_DROP_PTS,
          )
        : undefined;
      cards.push({
        place: detail.place,
        quietHours: detail.quietHours,
        calmer: alternative
          ? {
              place: alternative.place,
              crowdDropPts: alternative.crowdDropPts,
              similarity: Math.round(alternative.similarity),
            }
          : null,
      });
    }
    return { cards, total, nextOffset: offset + limit };
  }
}

/** Deterministic Fisher-Yates shuffle (mulberry32 seeded from a string hash). */
function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  let state = hash >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [result[index], result[swap]] = [result[swap] as T, result[index] as T];
  }
  return result;
}
