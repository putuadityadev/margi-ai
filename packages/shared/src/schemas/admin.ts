import { z } from 'zod';
import { OpeningHoursSchema, PenaltyWindowSchema } from '../time/opening-hours';
import { VibeTagSchema } from './explore';
import { VenueCategorySchema, VenueKindSchema } from './venue';

export const CreateVenueInputSchema = z.object({
  slug: z.string().min(1),
  kind: VenueKindSchema,
  category: VenueCategorySchema,
  nameEn: z.string().min(1),
  nameId: z.string().min(1),
  descriptionEn: z.string(),
  descriptionId: z.string(),
  regencyId: z.string(),
  corridorId: z.string().nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  isHotspot: z.boolean().default(false),
  isBufferZone: z.boolean().default(false),
  openingHours: OpeningHoursSchema,
  typicalPeakQueueMinutes: z.number().int().nonnegative().default(0),
  avgDwellMinutes: z.number().int().positive().default(60),
  priceLevel: z.number().int().min(1).max(4).nullable().optional(),
  imageUrl: z.string().min(1),
  imageCredit: z.string().nullable().optional(),
  etiquetteTags: z.array(z.string()).default([]),
  besttimeVenueId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});
export type CreateVenueInput = z.infer<typeof CreateVenueInputSchema>;

export const UpdateVenueInputSchema = CreateVenueInputSchema.partial();
export type UpdateVenueInput = z.infer<typeof UpdateVenueInputSchema>;

export const BulkHourlyForecastItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  busyness: z.number().int().min(0).max(100),
});
export type BulkHourlyForecastItem = z.infer<typeof BulkHourlyForecastItemSchema>;

export const BulkHourlyForecastInputSchema = z.object({
  forecasts: z.array(BulkHourlyForecastItemSchema),
});
export type BulkHourlyForecastInput = z.infer<typeof BulkHourlyForecastInputSchema>;

export const CreatePresetInputSchema = z.object({
  id: z.string().min(1),
  originVenueId: z.uuid(),
  titleEn: z.string().min(1),
  titleId: z.string().min(1),
  subtitleEn: z.string().min(1),
  subtitleId: z.string().min(1),
  imageUrl: z.string().min(1),
  imageSha256: z.string().min(64).max(64),
  defaultDay: z.number().int().min(0).max(6),
  defaultHour: z.number().int().min(0).max(23),
  simPeakDay: z.number().int().min(0).max(6),
  simPeakHour: z.number().int().min(0).max(23),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CreatePresetInput = z.infer<typeof CreatePresetInputSchema>;

export const CreateEtiquetteRuleInputSchema = z.object({
  id: z.string().min(1),
  tag: z.string().min(1),
  severity: z.number().int().min(1).max(3).default(1),
  textEn: z.string().min(1),
  textId: z.string().min(1),
});
export type CreateEtiquetteRuleInput = z.infer<typeof CreateEtiquetteRuleInputSchema>;

export const CreateCorridorInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  centerLat: z.number(),
  centerLng: z.number(),
  radiusMeters: z.number().int().positive(),
  typicalDelayMinutes: z.number().int().nonnegative().default(0),
  penaltyWindows: z.array(PenaltyWindowSchema),
});
export type CreateCorridorInput = z.infer<typeof CreateCorridorInputSchema>;

export const AdminStatsSchema = z.object({
  analysesPerDay: z.array(
    z.object({
      date: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  durationMs: z.object({
    p50: z.number(),
    p95: z.number(),
  }),
  tierDistribution: z.record(z.string(), z.number()),
  llmFallbackRatio: z.number().min(0).max(1),
  replayCount: z.number().int().nonnegative(),
  topRecommendedVenues: z.array(
    z.object({
      venueId: z.string(),
      name: z.string(),
      count: z.number().int().nonnegative(),
    }),
  ),
  navigateClicks: z.record(z.string(), z.number()),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

// ───────────── Place management (admin console) ─────────────

const HttpsOrLocalUrl = z
  .string()
  .max(500)
  .refine((value) => value.startsWith('https://') || value.startsWith('/'), {
    message: 'Use an https:// link or a /path on this site',
  });

export const CrowdProfileInputSchema = z.object({
  peakHour: z.number().int().min(6).max(21),
  peakBusyness: z.number().int().min(0).max(100),
  baseBusyness: z.number().int().min(0).max(100),
});

/** Default crowd curve when the admin does not set one: destinations peak higher than shops. */
export const DEFAULT_CROWD_PROFILE = Object.freeze({
  DTW: { peakHour: 11, peakBusyness: 60, baseBusyness: 10 },
  MSME: { peakHour: 10, peakBusyness: 30, baseBusyness: 4 },
  /** Not shown to travellers (kind OTHER has no forecast); a curator replaces it when promoting. */
  OTHER: { peakHour: 11, peakBusyness: 30, baseBusyness: 8 },
});

/** PENDING = learned from a traveller's search and not yet reviewed by a curator. */
export const ReviewStatusSchema = z.enum(['APPROVED', 'PENDING']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

/** A destination or local business as the curator edits it. */
export const AdminPlaceInputSchema = z.object({
  kind: VenueKindSchema,
  category: VenueCategorySchema,
  nameEn: z.string().trim().min(1).max(120),
  nameId: z.string().trim().min(1).max(120),
  descriptionEn: z.string().trim().min(10).max(600),
  descriptionId: z.string().trim().min(10).max(600),
  regencyId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** At least one mood for destinations and businesses; places of kind OTHER may have none. */
  vibeTags: z.array(VibeTagSchema).max(4),
  openingHours: OpeningHoursSchema,
  avgDwellMinutes: z.number().int().min(10).max(480).default(45),
  typicalPeakQueueMinutes: z.number().int().min(0).max(300).default(0),
  priceLevel: z.number().int().min(1).max(4).nullable().optional(),
  imageUrl: HttpsOrLocalUrl,
  imageCredit: z.string().trim().max(200).nullable().optional(),
  isHotspot: z.boolean().default(false),
  crowd: CrowdProfileInputSchema.optional(),
  etiquetteTags: z.array(z.string().max(60)).max(8).default([]),
});
export type AdminPlaceInput = z.infer<typeof AdminPlaceInputSchema>;

export const AdminPlaceUpdateSchema = AdminPlaceInputSchema.partial().extend({
  isActive: z.boolean().optional(),
  reviewStatus: ReviewStatusSchema.optional(),
});
export type AdminPlaceUpdate = z.infer<typeof AdminPlaceUpdateSchema>;

export const AdminPlaceSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  kind: VenueKindSchema,
  category: VenueCategorySchema,
  nameEn: z.string(),
  nameId: z.string(),
  descriptionEn: z.string(),
  descriptionId: z.string(),
  regencyId: z.string(),
  lat: z.number(),
  lng: z.number(),
  vibeTags: z.array(VibeTagSchema),
  openingHours: OpeningHoursSchema,
  avgDwellMinutes: z.number().int(),
  typicalPeakQueueMinutes: z.number().int(),
  priceLevel: z.number().int().nullable(),
  imageUrl: z.string(),
  imageCredit: z.string().nullable(),
  isHotspot: z.boolean(),
  crowd: CrowdProfileInputSchema,
  etiquetteTags: z.array(z.string()),
  source: z.string().nullable(),
  /** Where a learned place came from ("osm", "tomtom", "pin"); null for curated places. */
  learnedFrom: z.string().nullable(),
  reviewStatus: ReviewStatusSchema,
  isActive: z.boolean(),
  /** Whether the description embedding exists; without it the place is left out of "calmer alternatives". */
  hasEmbedding: z.boolean(),
  updatedAt: z.string(),
});
export type AdminPlace = z.infer<typeof AdminPlaceSchema>;

export const AdminPlaceListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  kind: VenueKindSchema.optional(),
  regencyId: z.string().optional(),
  /** `pending` lists only learned places waiting for review. */
  review: z.enum(['all', 'pending']).default('all'),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminPlaceListQuery = z.infer<typeof AdminPlaceListQuerySchema>;

export const AdminPlaceListSchema = z.object({
  items: z.array(AdminPlaceSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type AdminPlaceList = z.infer<typeof AdminPlaceListSchema>;
