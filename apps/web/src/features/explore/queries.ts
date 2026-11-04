import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  AreaSchema,
  FeedResponseSchema,
  NearbyResponseSchema,
  PlaceDetailSchema,
  ReverseGeocodeSchema,
  type GeoPoint,
  type VibeTag,
} from '@margi-ai/shared';
import { apiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryKeys';

const AREAS_STALE_MS = 60 * 60 * 1000;
/** ~110 m grid: map drags smaller than this reuse the cached reverse-geocode label. */
const REVERSE_GRID_DECIMALS = 3;

export interface ExploreParams {
  readonly origin: GeoPoint;
  readonly vibes: readonly VibeTag[];
  readonly at: string | undefined;
}

function paramsOf({ origin, vibes, at }: ExploreParams) {
  return {
    lat: origin.lat.toFixed(5),
    lng: origin.lng.toFixed(5),
    vibes: vibes.length > 0 ? [...vibes].sort().join(',') : undefined,
    at,
  };
}

export function useAreas() {
  return useQuery({
    queryKey: queryKeys.explore.areas,
    queryFn: ({ signal }) => apiClient('/geo/areas', { schema: z.array(AreaSchema), signal }),
    staleTime: AREAS_STALE_MS,
  });
}

export function useReverseGeocode(point: GeoPoint | null) {
  const lat = point ? Number(point.lat.toFixed(REVERSE_GRID_DECIMALS)) : 0;
  const lng = point ? Number(point.lng.toFixed(REVERSE_GRID_DECIMALS)) : 0;
  return useQuery({
    queryKey: queryKeys.explore.reverse(lat, lng),
    queryFn: ({ signal }) =>
      apiClient('/geo/reverse', { schema: ReverseGeocodeSchema, params: { lat, lng }, signal }),
    enabled: point !== null,
    placeholderData: keepPreviousData,
    staleTime: AREAS_STALE_MS,
  });
}

export function useNearby(params: ExploreParams | null) {
  const query = params ? paramsOf(params) : {};
  return useQuery({
    queryKey: queryKeys.explore.nearby(query),
    queryFn: ({ signal }) =>
      apiClient('/explore/nearby', { schema: NearbyResponseSchema, params: query, signal }),
    enabled: params !== null,
    // Keep the previous pins on screen while a new visit time or mood is fetched.
    placeholderData: keepPreviousData,
  });
}

export function usePlaceDetail(venueId: string | null, params: ExploreParams | null) {
  const query = params ? paramsOf(params) : {};
  return useQuery({
    queryKey: queryKeys.explore.place(venueId ?? '', query),
    queryFn: ({ signal }) =>
      apiClient(`/explore/places/${venueId ?? ''}`, {
        schema: PlaceDetailSchema,
        params: query,
        signal,
      }),
    enabled: venueId !== null && params !== null,
  });
}

/**
 * Endless feed of every destination. The same `seed` always yields the same order, so pages
 * never repeat within a round. A starting point is optional: with it cards carry distances.
 */
export function useFeedPages(seed: string, origin: GeoPoint | null, at: string | undefined) {
  const where = origin ? { lat: origin.lat.toFixed(4), lng: origin.lng.toFixed(4) } : {};
  return useInfiniteQuery({
    queryKey: ['explore', 'feed', seed, where, at] as const,
    queryFn: ({ pageParam, signal }) =>
      apiClient('/explore/feed', {
        schema: FeedResponseSchema,
        params: { seed, offset: pageParam, limit: 6, ...where, ...(at ? { at } : {}) },
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
    staleTime: 5 * 60 * 1000,
  });
}
