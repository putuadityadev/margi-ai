import { Injectable } from '@nestjs/common';
import { toWita, type GeoPoint, type NearbyPlace, type VibeTag } from '@margi-ai/shared';
import {
  findNearby,
  getCatalog,
  toNearbyPlace,
  type ExploreContext,
  type TripContext,
} from '@margi-ai/shared/engine';
import { ContextService } from '../context/context.service';

const SEARCH_LIMIT = 8;

/** Lowercase and strip diacritics so "Pura Tirta Empul" matches "pura tirta empül". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Builds engine contexts that carry the real-world crowd multiplier (holidays, ceremonies). */
@Injectable()
export class ExploreService {
  constructor(private readonly context: ContextService) {}

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

  nearby(ctx: ExploreContext, radiusKm: number): NearbyPlace[] {
    return findNearby(ctx, radiusKm);
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
}
