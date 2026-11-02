import { z } from 'zod';
import { TelemetrySnapshotSchema, TelemetryTierSchema } from './telemetry';
import { RegencySchema, VenueLiteSchema } from './venue';
import { VibeProfileSchema } from './vibe';

export const EtiquetteBriefSchema = z.object({
  id: z.string(),
  text: z.string(),
  severity: z.number().int().min(1).max(3),
});
export type EtiquetteBrief = z.infer<typeof EtiquetteBriefSchema>;

export const MsmeBundleItemSchema = z.object({
  venue: VenueLiteSchema.extend({
    distanceKm: z.number(),
  }),
  simVibe: z.number().min(0).max(100),
  snapshot: TelemetrySnapshotSchema,
  pairingReason: z.string(),
});
export type MsmeBundleItem = z.infer<typeof MsmeBundleItemSchema>;

export const RouteCardRelaxedSchema = z.object({
  step: z.number().int().min(0).max(2),
  reasons: z.array(z.string()),
});
export type RouteCardRelaxed = z.infer<typeof RouteCardRelaxedSchema>;

export const RouteCardSchema = z.object({
  venue: VenueLiteSchema.extend({
    regency: RegencySchema,
    distanceKm: z.number(),
    travelMinEstimate: z.number(),
  }),
  simVibe: z.number().min(0).max(100),
  topMatchingDimensions: z.array(z.string()),
  cfs: z.number().min(0).max(100),
  rank: z.number().min(0).max(100),
  fiscalBoost: z.boolean(),
  snapshot: TelemetrySnapshotSchema,
  whyItMatches: z.string(),
  bestTimeTip: z.string(),
  msme: z.array(MsmeBundleItemSchema),
  impact: z.object({
    timeSavedMin: z.tuple([z.number(), z.number()]),
    supportsMsmeCount: z.number().int().nonnegative(),
  }),
  etiquette: z.array(EtiquetteBriefSchema),
  relaxed: RouteCardRelaxedSchema.optional(),
  mapsUrl: z.string().url(),
});
export type RouteCard = z.infer<typeof RouteCardSchema>;

export const AnalysisStatusSchema = z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED']);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const AnalysisSimulationMetaSchema = z.object({
  virtualTime: z.string(),
  surgePct: z.number(),
});
export type AnalysisSimulationMeta = z.infer<typeof AnalysisSimulationMetaSchema>;

export const AnalysisResultSchema = z.object({
  id: z.uuid(),
  status: AnalysisStatusSchema,
  locale: z.enum(['en', 'id']),
  simulate: z.boolean(),
  simulation: AnalysisSimulationMetaSchema.optional(),
  input: z.object({
    presetId: z.string().optional(),
    origin: VenueLiteSchema,
    arrivalAt: z.string(),
  }),
  vibe: VibeProfileSchema,
  origin: z.object({
    venue: VenueLiteSchema,
    snapshot: TelemetrySnapshotSchema,
    cfs: z.number(),
    redZone: z.boolean(),
    queueEstimateMin: z.number(),
  }),
  insight: z.string(),
  micro: z.array(RouteCardSchema),
  regional: z.array(RouteCardSchema),
  disclaimers: z.array(z.string()),
  meta: z.object({
    totalMs: z.number(),
    models: z.record(z.string(), z.string()),
    tiersUsed: z.array(TelemetryTierSchema),
    isReplay: z.boolean(),
    relaxedStep: z.number().int(),
  }),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * Validated multipart/body input for creating a new MARGI AI analysis (TDD §10.2).
 */
export const CreateAnalysisInputSchema = z.object({
  presetId: z.string().optional(),
  originVenueId: z.uuid().optional(),
  arrivalAt: z.iso.datetime().optional(),
  simulate: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  locale: z.enum(['en', 'id']).default('en'),
  saveImage: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});
export type CreateAnalysisInput = z.infer<typeof CreateAnalysisInputSchema>;
