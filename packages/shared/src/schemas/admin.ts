import { z } from 'zod';
import { OpeningHoursSchema, PenaltyWindowSchema } from '../time/opening-hours';
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
