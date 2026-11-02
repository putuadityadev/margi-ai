import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTripInput, SavedTrip, UpdateTripInput } from '@margi-ai/shared';
import { apiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryKeys';

export interface UseTripsOptions {
  enabled?: boolean;
}

export function useTrips(options: UseTripsOptions = {}) {
  return useQuery<SavedTrip[]>({
    queryKey: queryKeys.me.trips,
    queryFn: async () => {
      const res = await apiClient<{ items: SavedTrip[] }>('/me/trips');
      return res.items;
    },
    enabled: options.enabled ?? true,
  });
}

export function useTrip(id: string | undefined, options: UseTripsOptions = {}) {
  return useQuery<SavedTrip>({
    queryKey: id ? queryKeys.me.trip(id) : ['me', 'trips', 'none'],
    queryFn: async () => {
      if (!id) throw new Error('Missing trip id');
      const res = await apiClient<{ trip: SavedTrip }>(`/me/trips/${id}`);
      return res.trip;
    },
    enabled: Boolean(id) && (options.enabled ?? true),
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      const res = await apiClient<{ trip: SavedTrip }>('/me/trips', {
        method: 'POST',
        body: input,
      });
      return res.trip;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.trips });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTripInput }) => {
      const res = await apiClient<{ trip: SavedTrip }>(`/me/trips/${id}`, {
        method: 'PATCH',
        body: data,
      });
      return res.trip;
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.trips });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.trip(updated.id) });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient<void>(`/me/trips/${id}`, {
        method: 'DELETE',
      });
      return id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.trips });
      queryClient.removeQueries({ queryKey: queryKeys.me.trip(id) });
    },
  });
}
