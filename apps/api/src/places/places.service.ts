import { Injectable } from '@nestjs/common';
import { haversineKm, type GeoPoint } from '@margi-ai/shared';
import { LearnedPlacesService } from './learned-places.service';
import { isGenericQuery, matchScore } from './place-query';
import { PlaceResolverService, type PlaceCandidate } from './place-resolver.service';

export interface PlaceOption {
  readonly name: string;
  readonly address: string;
  readonly distanceKm: number;
}

/** What a free-text place lookup produced; the caller decides how to say it. */
export type FindResult =
  /** One clear match, saved (or already known) as a place the trip can use. */
  | { readonly status: 'found'; readonly venueId: string; readonly isNew: boolean }
  /** Several plausible places; the traveller must say which (add a town or a landmark). */
  | { readonly status: 'ambiguous'; readonly options: readonly PlaceOption[] }
  | { readonly status: 'not_found' }
  /** The text names a kind of place ("warung terdekat"), not one particular place. */
  | { readonly status: 'generic' }
  /** Every lookup service failed, so "not found" would be a guess. */
  | { readonly status: 'unavailable' };

/** A match must cover everything the traveller typed, and mostly the place's own name. */
const MIN_NAME_SCORE = 0.6;
const HINT_NAME_SCORE = 0.5;
const SAME_SPOT_KM = 0.3;
const MAX_OPTIONS = 3;

function shorten(address: string): string {
  return address.length > 110 ? `${address.slice(0, 107)}...` : address;
}

/** Finds places the curated catalogue lacks, and keeps the ones a traveller clearly meant. */
@Injectable()
export class PlacesService {
  constructor(
    private readonly resolver: PlaceResolverService,
    private readonly learned: LearnedPlacesService,
  ) {}

  async find(query: string, near: GeoPoint): Promise<FindResult> {
    if (isGenericQuery(query)) return { status: 'generic' };
    const { candidates, unavailable } = await this.resolver.resolve(query, near);
    if (unavailable) return { status: 'unavailable' };

    const usable: PlaceCandidate[] = [];
    for (const candidate of candidates) {
      if (candidate.isPoi && !(await this.learned.isBlocked(candidate.externalRef))) {
        usable.push(candidate);
      }
    }
    const scored = usable
      .map((candidate) => ({
        candidate,
        ...matchScore(query, candidate.name, candidate.address),
      }))
      .sort((a, b) => b.nameScore - a.nameScore || b.fullScore - a.fullScore);

    const strong = scored.filter(
      (item) => item.fullScore >= 0.999 && item.nameScore >= MIN_NAME_SCORE,
    );
    const top = strong[0];
    if (top) {
      const rivals = strong
        .slice(1)
        .filter(
          (item) =>
            item.nameScore >= top.nameScore - 0.001 &&
            haversineKm(item.candidate, top.candidate) > SAME_SPOT_KM,
        );
      if (rivals.length === 0) {
        const row = await this.learned.learn(top.candidate);
        if (row)
          return {
            status: 'found',
            venueId: row.id,
            isNew: row.createdAt > new Date(Date.now() - 5_000),
          };
      } else {
        return this.ambiguous([top, ...rivals], near);
      }
    }

    const hints = scored.filter((item) => item.nameScore >= HINT_NAME_SCORE);
    return hints.length > 0 ? this.ambiguous(hints, near) : { status: 'not_found' };
  }

  /** The nearest food place to a point from the map services, saved so a trip can use it. */
  async nearbyFood(point: GeoPoint): Promise<string | null> {
    const candidates = await this.resolver.nearbyFood(point);
    for (const candidate of candidates) {
      if (!candidate.isPoi || (await this.learned.isBlocked(candidate.externalRef))) continue;
      const row = await this.learned.learn(candidate);
      if (row) return row.id;
    }
    return null;
  }

  private ambiguous(items: readonly { candidate: PlaceCandidate }[], near: GeoPoint): FindResult {
    return {
      status: 'ambiguous',
      options: items.slice(0, MAX_OPTIONS).map(({ candidate }) => ({
        name: candidate.name,
        address: shorten(candidate.address),
        distanceKm: Math.round(haversineKm(near, candidate) * 10) / 10,
      })),
    };
  }
}
