import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  CopilotReplySchema,
  CorridorSchema,
  DepartureScanSchema,
  NearbyPlaceSchema,
  SavedTripPlanSchema,
  TripPlanSchema,
  type CopilotRequest,
  type GeoPoint,
  type SaveTripPlanInput,
  type TripSituation,
  type TripRequest,
} from '@margi-ai/shared';
import { apiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryKeys';

const CORRIDORS_STALE_MS = 60 * 60 * 1000;
const SEARCH_MIN_CHARS = 2;

/** Evaluates the current trip. POST, but side-effect free, so it is cached as a query. */
export function useTripPlan(request: TripRequest | null) {
  return useQuery({
    queryKey: queryKeys.trip.plan(request ? JSON.stringify(request) : ''),
    queryFn: ({ signal }) =>
      apiClient('/trips/evaluate', {
        method: 'POST',
        body: request,
        schema: TripPlanSchema,
        signal,
      }),
    enabled: request !== null,
    placeholderData: keepPreviousData,
  });
}

/** Crowd on arrival for every departure slot of the trip's day (chart data). */
export function useDepartureScan(request: TripRequest | null) {
  return useQuery({
    queryKey: queryKeys.trip.departures(
      request ? JSON.stringify({ ...request, departAt: request.departAt.slice(0, 10) }) : '',
    ),
    queryFn: ({ signal }) =>
      apiClient('/trips/departures', {
        method: 'POST',
        body: request,
        schema: DepartureScanSchema,
        signal,
      }),
    enabled: request !== null,
    placeholderData: keepPreviousData,
  });
}

/**
 * Proactive review of the current plan, shown as a banner before the traveller asks.
 * Same endpoint as the chat, cached per plan, so opening it in the chat costs nothing.
 */
export function useTripInsight(
  request: TripRequest | null,
  situation: TripSituation,
  locale: 'en' | 'id',
) {
  return useQuery({
    queryKey: queryKeys.trip.insight(request ? JSON.stringify(request) : '', locale),
    queryFn: ({ signal }) =>
      apiClient('/copilot/reply', {
        method: 'POST',
        body: { trip: request, situation, intent: 'REVIEW_PLAN', locale },
        schema: CopilotReplySchema,
        signal,
      }),
    enabled: request !== null,
    staleTime: Infinity,
    retry: 0,
  });
}

export function useCorridors() {
  return useQuery({
    queryKey: queryKeys.trip.corridors,
    queryFn: ({ signal }) =>
      apiClient('/explore/corridors', { schema: z.array(CorridorSchema), signal }),
    staleTime: CORRIDORS_STALE_MS,
  });
}

export function usePlaceSearch(query: string, near: GeoPoint | null) {
  const q = query.trim();
  return useQuery({
    queryKey: queryKeys.trip.search(q, near?.lat ?? 0, near?.lng ?? 0),
    queryFn: ({ signal }) =>
      apiClient('/explore/search', {
        schema: z.array(NearbyPlaceSchema),
        params: { q, lat: near?.lat, lng: near?.lng },
        signal,
      }),
    enabled: near !== null && q.length >= SEARCH_MIN_CHARS,
    placeholderData: keepPreviousData,
  });
}

export function useCopilot() {
  return useMutation({
    mutationFn: (request: CopilotRequest) =>
      apiClient('/copilot/reply', { method: 'POST', body: request, schema: CopilotReplySchema }),
  });
}

export function useSavedPlans() {
  return useQuery({
    queryKey: queryKeys.trip.saved,
    queryFn: ({ signal }) =>
      apiClient('/trips/plans', { schema: z.array(SavedTripPlanSchema), signal }),
  });
}

export function useSavePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveTripPlanInput) =>
      apiClient('/trips/plans', { method: 'POST', body: input, schema: SavedTripPlanSchema }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.trip.saved }),
  });
}

export function useDeletePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) =>
      apiClient(`/trips/plans/${encodeURIComponent(planId)}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.trip.saved }),
  });
}
