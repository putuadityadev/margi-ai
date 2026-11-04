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
const FEED_CATEGORY_CAP = 3;
const FEED_CONTRAST_LIMIT = 4;
/** A well-known place counts as busy for the "instead of" pairing from this reading up. */
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
      const around = catalog.places.filter(
        (seed) => haversineKm(area, seed.venue) <= AREA_RADIUS_KM,
      );
      if (attractionsOf(around).some((seed) => seed.venue.kind === 'DTW') || !regency) {
        return around.length > 0 ? { label: area.nameEn, places: rank(around, area) } : null;
      }
    }
    if (regency) {
      const inside = catalog.places.filter((seed) => seed.venue.regencyId === regency.id);
      if (inside.length > 0) return { label: regency.nameEn, places: rank(inside, near) };
    }
    return null;
  }

  /**
   * Discovery feed: for each busy well-known place nearby, a calmer place with a similar mood
   * ("instead of"), interleaved with the calmest open attractions around the traveller. Per-category
   * caps keep it varied.
   */
  async feed(
    ctx: ExploreContext,
    radiusKm: number,
    at: string | undefined,
    limit: number,
  ): Promise<FeedCard[]> {
    const attractions = (await this.nearby(ctx, radiusKm, at)).filter(
      (place) => place.venue.kind === 'DTW',
    );
    const used = new Set<string>();
    const perCategory = new Map<string, number>();
    const take = (place: NearbyPlace): boolean => {
      const count = perCategory.get(place.venue.category) ?? 0;
      if (used.has(place.venue.id) || count >= FEED_CATEGORY_CAP) return false;
      used.add(place.venue.id);
      perCategory.set(place.venue.category, count + 1);
      return true;
    };

    const insteadOf: FeedCard[] = [];
    const busiest = attractions
      .filter((place) => place.venue.isHotspot && place.crowd.busynessPct >= FEED_BUSY_PCT)
      .sort((a, b) => b.crowd.busynessPct - a.crowd.busynessPct)
      .slice(0, FEED_CONTRAST_LIMIT);
    for (const busy of busiest) {
      const detail = buildPlaceDetail(busy.venue.id, ctx);
      const alternative = detail?.alternatives.find(
        (candidate) =>
          candidate.place.isOpenNow &&
          candidate.place.venue.kind === 'DTW' &&
          candidate.crowdDropPts >= FEED_MIN_DROP_PTS &&
          !used.has(candidate.place.venue.id),
      );
      if (!alternative || !take(alternative.place)) continue;
      const card = this.feedCard(alternative.place, ctx, 'INSTEAD_OF');
      if (card) {
        insteadOf.push({
          ...card,
          instead: {
            place: busy,
            crowdDropPts: alternative.crowdDropPts,
            similarity: Math.round(alternative.similarity),
          },
        });
      }
    }

    const calm = attractions
      .filter((place) => place.isOpenNow)
      .sort((a, b) => a.crowd.busynessPct - b.crowd.busynessPct || a.distanceKm - b.distanceKm);
    const cards: FeedCard[] = [];
    const calmCards: FeedCard[] = [];
    for (const place of calm) {
      if (calmCards.length + insteadOf.length >= limit) break;
      if (!take(place)) continue;
      const card = this.feedCard(place, ctx, 'CALM_NOW');
      if (card) calmCards.push(card);
    }
    // Alternate the two kinds so the feed does not open with five near-identical cards.
    for (let index = 0; cards.length < limit; index += 1) {
      const a = insteadOf[index];
      const b = calmCards[index];
      if (!a && !b) break;
      if (a) cards.push(a);
      if (b && cards.length < limit) cards.push(b);
    }
    return cards;
  }

  private feedCard(
    place: NearbyPlace,
    ctx: ExploreContext,
    kind: FeedCard['kind'],
  ): FeedCard | null {
    const detail = buildPlaceDetail(place.venue.id, ctx);
    if (!detail) return null;
    return {
      kind,
      place: detail.place,
      vibeTags: detail.place.vibeTags,
      today: detail.today,
      quietHours: detail.quietHours,
      instead: null,
      msme: detail.nearbyMsmes[0] ?? null,
      etiquetteTags: detail.etiquetteTags,
    };
  }
}
