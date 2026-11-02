import { z } from 'zod';

/**
 * Single aesthetic / atmosphere dimension extracted by Agent 1 (TDD §6.3).
 */
export const VibeDimensionSchema = z.object({
  label: z.string().max(60),
  descriptors: z.array(z.string().max(40)).min(2).max(6),
  intensity: z.number().min(0).max(1),
});

export type VibeDimension = z.infer<typeof VibeDimensionSchema>;

/**
 * Complete visual atmosphere profile generated from image analysis (TDD §6.3).
 */
export const VibeProfileSchema = z.object({
  isTravelScene: z.boolean(),
  sceneSummary: z.string().max(200),
  topography: VibeDimensionSchema,
  architecture: VibeDimensionSchema,
  lighting: VibeDimensionSchema,
  activity: VibeDimensionSchema,
  visualDensity: VibeDimensionSchema,
  detectedLandmarkGuess: z.string().max(80).nullable(),
  confidence: z.number().min(0).max(1),
});

export type VibeProfile = z.infer<typeof VibeProfileSchema>;
