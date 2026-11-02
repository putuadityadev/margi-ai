import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import {
  CreatePresetInputSchema,
  RegencySchema,
  VenueLiteSchema,
  type CreatePresetInput,
  type Regency,
  type VenueLite,
} from '@margi-ai/shared';
import { apiClient } from '../../lib/apiClient';
import { queryKeys } from '../../lib/queryKeys';

export interface SystemStatusData {
  telemetry: { live: boolean; message?: string };
  llm: string;
  version: string;
  commit?: string;
}

export function usePresets(): UseQueryResult<CreatePresetInput[], Error> {
  return useQuery({
    queryKey: queryKeys.presets.all,
    queryFn: () =>
      apiClient<CreatePresetInput[]>('/presets', {
        schema: z.array(CreatePresetInputSchema),
      }),
  });
}

export function useOrigins(): UseQueryResult<VenueLite[], Error> {
  return useQuery({
    queryKey: queryKeys.origins.all,
    queryFn: () =>
      apiClient<VenueLite[]>('/origins', {
        schema: z.array(VenueLiteSchema),
      }),
  });
}

export function useRegencies(): UseQueryResult<Regency[], Error> {
  return useQuery({
    queryKey: queryKeys.regencies.all,
    queryFn: () =>
      apiClient<Regency[]>('/regencies', {
        schema: z.array(RegencySchema),
      }),
  });
}

export function useSystemStatus(): UseQueryResult<SystemStatusData, Error> {
  return useQuery({
    queryKey: queryKeys.system.status,
    queryFn: () => apiClient<SystemStatusData>('/system/status'),
  });
}

export function useVenueForecast(venueId?: string): UseQueryResult<number[][], Error> {
  return useQuery({
    queryKey: venueId
      ? queryKeys.venues.forecast(venueId)
      : (['venues', 'none', 'forecast'] as const),
    queryFn: () => apiClient<number[][]>(`/venues/${venueId}/forecast`),
    enabled: Boolean(venueId),
  });
}
