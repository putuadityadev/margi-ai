import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AnalysisResult } from '@margi-ai/shared';
import { apiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryKeys';

export interface UseHistoryOptions {
  enabled?: boolean;
}

export function useHistory(options: UseHistoryOptions = {}) {
  return useQuery<AnalysisResult[]>({
    queryKey: queryKeys.me.analyses(),
    queryFn: async () => {
      const res = await apiClient<{ items: AnalysisResult[]; nextCursor: string | null }>(
        '/me/analyses',
      );
      return res.items;
    },
    enabled: options.enabled ?? true,
  });
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient<void>(`/me/analyses/${id}`, {
        method: 'DELETE',
      });
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.analyses() });
    },
  });
}

export function useDeleteAllAnalyses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient<void>('/me/analyses', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.analyses() });
    },
  });
}
