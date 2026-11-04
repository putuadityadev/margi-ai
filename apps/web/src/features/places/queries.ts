import { useMutation } from '@tanstack/react-query';
import {
  PinPlaceResponseSchema,
  type PinPlaceRequest,
  type PinPlaceResponse,
} from '@margi-ai/shared';
import { apiClient } from '../../lib/apiClient';

/** Saves a place the traveller marked on the map because search could not find it. */
export function usePinPlace() {
  return useMutation<PinPlaceResponse, Error, PinPlaceRequest>({
    mutationFn: (request) =>
      apiClient('/places/pin', { method: 'POST', body: request, schema: PinPlaceResponseSchema }),
  });
}
