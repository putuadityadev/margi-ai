import { z } from 'zod';
import { TelemetryTierSchema } from './telemetry';
import { VenueLiteSchema } from './venue';

/**
 * Traveller-facing mood tags used by the map-first explore flow (DECISIONS D-025).
 * A venue carries one or more tags; the traveller may filter by any subset.
 */
export const VibeTagSchema = z.enum([
  'SPIRITUAL',
  'NATURE',
  'BEACH',
  'RICE_FIELDS',
  'WATERFALL',
  'HERITAGE',
  'SUNSET',
  'CULINARY',
]);
export type VibeTag = z.infer<typeof VibeTagSchema>;

export const BusynessKeySchema = z.enum([
  'low',
  'below_average',
  'average',
  'above_average',
  'high',
]);

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

/**
 * Parses a comma separated vibe list from a query string. Unknown tags are dropped,
 * duplicates removed, so a hand-edited URL can never fail the request.
 */
export function parseVibeList(raw: string | null | undefined): VibeTag[] {
  if (!raw) return [];
  const tags = new Set<VibeTag>();
  for (const part of raw.split(',')) {
    const parsed = VibeTagSchema.safeParse(part.trim().toUpperCase());
    if (parsed.success) tags.add(parsed.data);
  }
  return [...tags];
}

/** Default and maximum scan radius around the traveller, in kilometres. */
export const EXPLORE_RADIUS_KM = Object.freeze({ default: 40, max: 120 });

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(EXPLORE_RADIUS_KM.max).default(EXPLORE_RADIUS_KM.default),
  vibes: z
    .string()
    .optional()
    .transform((raw) => parseVibeList(raw)),
  /** Planned visit instant; omitted means "now". Lets a night-time visitor plan tomorrow morning. */
  at: z.iso.datetime({ offset: true }).optional(),
});
export type NearbyQuery = z.infer<typeof NearbyQuerySchema>;

/**
 * Crowd reading for the current WITA hour. `busynessPct` may exceed 100 during a surge
 * (BRD §7.1); `tier` is always shown so forecast or simulated data is never passed off as live.
 */
export const CrowdReadingSchema = z.object({
  busynessPct: z.number().int().min(0).max(150),
  level: BusynessKeySchema,
  tier: TelemetryTierSchema,
  hourWita: z.number().int().min(0).max(23),
  /**
   * What the figure is built from. `MODEL` is the forecast model alone (curve, holidays,
   * ceremonies, season); `MODEL_TRAFFIC` also reflects live congestion on the road beside the
   * place, an indirect sign of arrivals and not a head count. Absent on older payloads.
   */
  basis: z.enum(['MODEL', 'MODEL_TRAFFIC']).optional(),
});
export type CrowdReading = z.infer<typeof CrowdReadingSchema>;

export const NearbyPlaceSchema = z.object({
  venue: VenueLiteSchema,
  /** Empty for places outside the curated catalogue (kind OTHER). */
  vibeTags: z.array(VibeTagSchema),
  distanceKm: z.number().min(0),
  travelMinutes: z.number().int().min(0),
  crowd: CrowdReadingSchema,
  isOpenNow: z.boolean(),
});
export type NearbyPlace = z.infer<typeof NearbyPlaceSchema>;

export const NearbyResponseSchema = z.object({
  origin: GeoPointSchema,
  radiusKm: z.number(),
  generatedAt: z.iso.datetime({ offset: true }),
  places: z.array(NearbyPlaceSchema),
});
export type NearbyResponse = z.infer<typeof NearbyResponseSchema>;

export const HourlyCrowdSchema = z.object({
  hour: z.number().int().min(0).max(23),
  busynessPct: z.number().int().min(0).max(150),
});
export type HourlyCrowd = z.infer<typeof HourlyCrowdSchema>;

/**
 * A calmer venue with a similar mood, ranked with the BRD §7.3 formula
 * (tag similarity stands in for embedding similarity in the explore flow).
 */
export const QuietAlternativeSchema = z.object({
  place: NearbyPlaceSchema,
  sharedVibes: z.array(VibeTagSchema),
  similarity: z.number().min(0).max(100),
  crowdFriction: z.number().int().min(0).max(100),
  rank: z.number(),
  crowdDropPts: z.number().int(),
});
export type QuietAlternative = z.infer<typeof QuietAlternativeSchema>;

export const PlaceDetailSchema = z.object({
  place: NearbyPlaceSchema,
  today: z.array(HourlyCrowdSchema).length(24),
  quietHours: z.array(z.number().int().min(0).max(23)).max(3),
  crowdFriction: z.number().int().min(0).max(100),
  isRedZone: z.boolean(),
  alternatives: z.array(QuietAlternativeSchema).max(5),
  nearbyMsmes: z.array(NearbyPlaceSchema).max(4),
  etiquetteTags: z.array(z.string()),
  avgDwellMinutes: z.number().int().min(0),
  typicalPeakQueueMinutes: z.number().int().min(0),
});
export type PlaceDetail = z.infer<typeof PlaceDetailSchema>;

export const PlaceDetailQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  vibes: z
    .string()
    .optional()
    .transform((raw) => parseVibeList(raw)),
  at: z.iso.datetime({ offset: true }).optional(),
});
export type PlaceDetailQuery = z.infer<typeof PlaceDetailQuerySchema>;

/** A named starting point (town or neighbourhood) used for manual location pick and labels. */
export const AreaSchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  nameId: z.string(),
  regencyId: z.string(),
  lat: z.number(),
  lng: z.number(),
  isPopularStart: z.boolean(),
});
export type Area = z.infer<typeof AreaSchema>;

export const ReverseGeocodeSchema = z.object({
  area: AreaSchema,
  distanceKm: z.number().min(0),
  isInBali: z.boolean(),
});
export type ReverseGeocode = z.infer<typeof ReverseGeocodeSchema>;

// ───────────── Feed ─────────────

/** Default map centre used when the traveller has not chosen a starting point. */
export const BALI_CENTRE = Object.freeze({ lat: -8.4095, lng: 115.1889 });

/**
 * Endless feed of every destination in a seeded shuffle: the same `seed` always walks the same
 * order, so paging by `offset` never repeats a card within a round. A starting point is
 * optional; without it distances are measured from the island centre and the app hides them.
 */
export const FeedQuerySchema = z.object({
  seed: z.string().min(1).max(40),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  limit: z.coerce.number().int().min(1).max(12).default(6),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  at: z.iso.datetime({ offset: true }).optional(),
});
export type FeedQuery = z.infer<typeof FeedQuerySchema>;

export const FeedCardSchema = z.object({
  place: NearbyPlaceSchema,
  quietHours: z.array(z.number().int().min(0).max(23)).max(3),
  /** For a busy place: a calmer one with a similar mood. */
  calmer: z
    .object({
      place: NearbyPlaceSchema,
      crowdDropPts: z.number().int(),
      similarity: z.number().min(0).max(100),
    })
    .nullable(),
});
export type FeedCard = z.infer<typeof FeedCardSchema>;

export const FeedResponseSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  /** Offset to request next; the feed never ends (it reshuffles after a full round). */
  nextOffset: z.number().int(),
  total: z.number().int(),
  cards: z.array(FeedCardSchema),
});
export type FeedResponse = z.infer<typeof FeedResponseSchema>;
