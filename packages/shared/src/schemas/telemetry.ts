import { z } from 'zod';

/**
 * 3-Tier crowd data classification (TDD §8.1, Prisma TelemetryTier).
 */
export const TelemetryTierSchema = z.enum(['LIVE', 'FORECAST', 'SIMULATION']);
export type TelemetryTier = z.infer<typeof TelemetryTierSchema>;

/**
 * Snapshot of crowd telemetry evaluated at an arrival instant (TDD §8.1, §10.2).
 */
export const TelemetrySnapshotSchema = z.object({
  busynessNow: z.number().nullable(),
  forecastNow: z.number(),
  forecastPlus2: z.number(),
  bEff: z.number(),
  tier: TelemetryTierSchema,
  synthetic: z.boolean(),
  hourlyCurve: z.array(z.number()).length(24),
  arrivalHours: z.array(z.number()),
  departureHours: z.array(z.number()),
  isOpen: z.boolean(),
});

export type TelemetrySnapshot = z.infer<typeof TelemetrySnapshotSchema>;
