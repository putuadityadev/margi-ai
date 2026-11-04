import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { haversineKm, isInBali, type GeoPoint } from '@margi-ai/shared';
import { HttpJsonError, httpJson } from '../common/http-json';
import { TtlCache } from '../common/ttl-cache';
import { AppConfig } from '../config/app-config.service';
import { matchScore, queryVariants } from './place-query';

/** A place a provider found, before MARGI decides whether to keep it. */
export interface PlaceCandidate {
  readonly name: string;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly source: 'osm' | 'tomtom';
  /** Provider object id, used to avoid saving the same place twice. */
  readonly externalRef: string;
  /** Regency as the provider spells it ("Kabupaten Buleleng"), when it gave one. */
  readonly regencyName: string | null;
  /** True for a named place; false for a street or a private address (never saved). */
  readonly isPoi: boolean;
  readonly sourceUrl: string | null;
}

export interface ResolveOutcome {
  readonly candidates: readonly PlaceCandidate[];
  /** True when every provider that was tried failed, so "nothing found" would be a guess. */
  readonly unavailable: boolean;
}

const TOMTOM_URL = 'https://api.tomtom.com/search/2/search';
/** Nominatim's public service allows one request a second for the whole application. */
const NOMINATIM_GAP_MS = 1_100;
const NOMINATIM_MAX_QUEUE = 3;
const PROVIDER_TIMEOUT_MS = 6_000;
const TOMTOM_NEARBY_URL = 'https://api.tomtom.com/search/2/nearbySearch/.json';
const NEARBY_FOOD_RADIUS_M = 4_000;
const RESULT_LIMIT = 6;
/** An OSM result covering this share of the query is good enough to skip the second provider. */
const GOOD_MATCH = 0.8;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** Bali's bounding box: Nominatim viewbox is left,top,right,bottom; TomTom takes the two corners. */
const BALI_VIEWBOX = '114.4,-8.0,115.8,-9.2';

const NominatimSchema = z.array(
  z.object({
    osm_type: z.string(),
    osm_id: z.number(),
    lat: z.string(),
    lon: z.string(),
    /** `jsonv2` calls it category; older responses say class. */
    category: z.string().optional(),
    class: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    display_name: z.string(),
    address: z
      .object({
        county: z.string().optional(),
        city: z.string().optional(),
        state_district: z.string().optional(),
      })
      .partial()
      .optional(),
  }),
);

const TomTomSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({ lat: z.number(), lon: z.number() }),
      poi: z.object({ name: z.string() }).optional(),
      address: z
        .object({
          freeformAddress: z.string().optional(),
          municipality: z.string().optional(),
          countrySecondarySubdivision: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

/** Streets and house-level results describe where a person lives, not a place to visit. */
function isNamedPlaceOsm(osmClass: string | undefined, osmType: string | undefined): boolean {
  if (osmClass === 'highway' || osmClass === 'boundary') return false;
  if (osmClass === 'place') {
    return !['house', 'plot', 'block', 'neighbourhood', 'quarter', 'city_block'].includes(
      osmType ?? '',
    );
  }
  if (osmClass === 'building') {
    return !['house', 'residential', 'apartments', 'detached', 'dormitory', 'yes'].includes(
      osmType ?? '',
    );
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Finds a place by name when MARGI's own catalogue does not have it. OpenStreetMap (Nominatim)
 * goes first: its data may be stored with attribution, which is how a place becomes reusable.
 * TomTom Search is the second source. Every coordinate comes from a provider; a language model
 * never supplies one.
 */
@Injectable()
export class PlaceResolverService {
  private readonly logger = new Logger(PlaceResolverService.name);
  private readonly cache = new TtlCache<readonly PlaceCandidate[]>(CACHE_TTL_MS, 500);
  private lastNominatimAt = 0;
  private nominatimQueue: Promise<void> = Promise.resolve();
  private nominatimWaiting = 0;

  constructor(private readonly config: AppConfig) {}

  get isConfigured(): boolean {
    return true;
  }

  async resolve(query: string, near: GeoPoint): Promise<ResolveOutcome> {
    const variants = queryVariants(query);
    if (variants.length === 0) return { candidates: [], unavailable: false };

    let failures = 0;
    let attempts = 0;
    for (const variant of variants) {
      const cacheKey = variant.toLowerCase();
      const cached = this.cache.get(cacheKey);
      if (cached && cached.length > 0) return { candidates: cached, unavailable: false };

      const found: PlaceCandidate[] = [];
      for (const provider of ['osm', 'tomtom'] as const) {
        attempts += 1;
        try {
          found.push(
            ...(provider === 'osm'
              ? await this.searchOsm(variant, near)
              : await this.searchTomTom(variant, near)),
          );
        } catch (error: unknown) {
          failures += 1;
          const status = error instanceof HttpJsonError ? error.status : null;
          this.logger.warn({ provider, status }, 'Place lookup failed');
        }
        // OSM first (its data may be stored); ask TomTom too unless OSM already has a good match.
        if (found.some((c) => matchScore(variant, c.name, c.address).nameScore >= GOOD_MATCH))
          break;
      }
      if (found.length > 0) {
        const unique = dedupe(found).filter((candidate) => isInBali(candidate));
        if (unique.length > 0) {
          this.cache.set(cacheKey, unique);
          return { candidates: unique, unavailable: false };
        }
      }
    }
    return { candidates: [], unavailable: attempts > 0 && failures === attempts };
  }

  /** Restaurants and warung around a point, nearest first (TomTom category search). */
  async nearbyFood(point: GeoPoint): Promise<readonly PlaceCandidate[]> {
    const key = this.config.providers.tomTomKey;
    if (!key) return [];
    const params = new URLSearchParams({
      key,
      lat: String(point.lat),
      lon: String(point.lng),
      radius: String(NEARBY_FOOD_RADIUS_M),
      categorySet: '7315',
      limit: '5',
      language: 'id-ID',
    });
    try {
      const body = await httpJson(`${TOMTOM_NEARBY_URL}?${params.toString()}`, {
        timeoutMs: PROVIDER_TIMEOUT_MS,
      });
      return tomTomCandidates(TomTomSchema.parse(body)).filter((candidate) => isInBali(candidate));
    } catch (error: unknown) {
      const status = error instanceof HttpJsonError ? error.status : null;
      this.logger.warn({ provider: 'tomtom-nearby', status }, 'Nearby food lookup failed');
      return [];
    }
  }

  private async searchOsm(query: string, near: GeoPoint): Promise<PlaceCandidate[]> {
    if (this.nominatimWaiting >= NOMINATIM_MAX_QUEUE) return [];
    await this.nominatimSlot();
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: query,
      countrycodes: 'id',
      viewbox: BALI_VIEWBOX,
      bounded: '1',
      limit: String(RESULT_LIMIT),
      addressdetails: '1',
      'accept-language': 'id,en',
    });
    const body = await httpJson(
      `${this.config.providers.nominatimUrl}/search?${params.toString()}`,
      {
        timeoutMs: PROVIDER_TIMEOUT_MS,
        headers: { 'user-agent': this.config.providers.userAgent, referer: this.config.appUrl },
      },
    );
    return NominatimSchema.parse(body)
      .map((item): PlaceCandidate => {
        const label = item.display_name.split(',')[0]?.trim() ?? item.display_name;
        const regency =
          item.address?.county ?? item.address?.city ?? item.address?.state_district ?? null;
        return {
          name: item.name?.trim() || label,
          address: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
          source: 'osm',
          externalRef: `osm:${item.osm_type}:${item.osm_id}`,
          regencyName: regency,
          isPoi: isNamedPlaceOsm(item.category ?? item.class, item.type),
          sourceUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
        };
      })
      .sort((a, b) => haversineKm(near, a) - haversineKm(near, b));
  }

  private async searchTomTom(query: string, near: GeoPoint): Promise<PlaceCandidate[]> {
    const key = this.config.providers.tomTomKey;
    if (!key) return [];
    const params = new URLSearchParams({
      key,
      countrySet: 'ID',
      limit: String(RESULT_LIMIT),
      language: 'id-ID',
      idxSet: 'POI,Geo',
      lat: String(near.lat),
      lon: String(near.lng),
      topLeft: '-8.0,114.4',
      btmRight: '-9.2,115.8',
    });
    const body = await httpJson(
      `${TOMTOM_URL}/${encodeURIComponent(query)}.json?${params.toString()}`,
      { timeoutMs: PROVIDER_TIMEOUT_MS },
    );
    return tomTomCandidates(TomTomSchema.parse(body));
  }

  /** Serialises Nominatim calls so the whole app stays under one request a second. */
  private async nominatimSlot(): Promise<void> {
    this.nominatimWaiting += 1;
    const previous = this.nominatimQueue;
    let release: () => void = () => undefined;
    this.nominatimQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await previous;
      const wait = this.lastNominatimAt + NOMINATIM_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastNominatimAt = Date.now();
    } finally {
      this.nominatimWaiting -= 1;
      release();
    }
  }
}

/** Drops results that are the same place twice (same name within 150 m). */
function dedupe(candidates: readonly PlaceCandidate[]): PlaceCandidate[] {
  const kept: PlaceCandidate[] = [];
  for (const candidate of candidates) {
    const twin = kept.some(
      (other) =>
        other.name.toLowerCase() === candidate.name.toLowerCase() &&
        haversineKm(other, candidate) < 0.15,
    );
    if (!twin) kept.push(candidate);
  }
  return kept;
}

/** Maps TomTom results to candidates. */
function tomTomCandidates(parsed: z.infer<typeof TomTomSchema>): PlaceCandidate[] {
  return parsed.results.map((item): PlaceCandidate => {
    const address = item.address?.freeformAddress ?? '';
    const name = item.poi?.name ?? item.address?.municipality ?? address;
    return {
      name,
      address,
      lat: item.position.lat,
      lng: item.position.lon,
      source: 'tomtom',
      externalRef: `tomtom:${item.id}`,
      regencyName: item.address?.countrySecondarySubdivision ?? item.address?.municipality ?? null,
      isPoi: item.type === 'POI' || item.type === 'Geography',
      sourceUrl: null,
    };
  });
}
