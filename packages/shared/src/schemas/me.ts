import { z } from 'zod';

export const UpdateProfileInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  locale: z.enum(['en', 'id']).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const CreateTripInputSchema = z.object({
  analysisId: z.uuid(),
  title: z.string().min(1).max(120),
  note: z.string().max(500).optional(),
  venueId: z.uuid(),
  msmeVenueIds: z.array(z.uuid()).max(2).default([]),
});
export type CreateTripInput = z.infer<typeof CreateTripInputSchema>;

export const UpdateTripInputSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  note: z.string().max(500).nullable().optional(),
  msmeVenueIds: z.array(z.uuid()).max(2).optional(),
});
export type UpdateTripInput = z.infer<typeof UpdateTripInputSchema>;

export const ClaimAnalysisInputSchema = z.object({
  guestSessionId: z.string().min(1).optional(),
});
export type ClaimAnalysisInput = z.infer<typeof ClaimAnalysisInputSchema>;

export const SavedTripSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
  analysisId: z.string().uuid(),
  venueId: z.string().uuid(),
  msmeVenueIds: z.array(z.string().uuid()).default([]),
  title: z.string(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type SavedTrip = z.infer<typeof SavedTripSchema>;
