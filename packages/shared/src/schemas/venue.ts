import { z } from 'zod';
import { OpeningHoursSchema, type OpeningHoursMap } from '../time/opening-hours';

export { OpeningHoursSchema };
export type { OpeningHoursMap as OpeningHours };

export const RegencyPhrStatusSchema = z.enum(['DONOR', 'RECIPIENT']);
export type RegencyPhrStatus = z.infer<typeof RegencyPhrStatusSchema>;

export const RegencySchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  nameId: z.string(),
  phrStatus: RegencyPhrStatusSchema,
});
export type Regency = z.infer<typeof RegencySchema>;

/**
 * DTW = attraction, MSME = local business. OTHER is a place the traveller named that the curated
 * catalogue does not cover (a school, an office, a friend's warung): it is routed and planned but
 * has no crowd forecast until a curator reviews it.
 */
export const VenueKindSchema = z.enum(['DTW', 'MSME', 'OTHER']);
export type VenueKind = z.infer<typeof VenueKindSchema>;

export const VenueCategorySchema = z.enum([
  'TEMPLE',
  'NATURE',
  'WATERFALL',
  'RICE_TERRACE',
  'BEACH',
  'FOREST',
  'VILLAGE',
  'VIEWPOINT',
  'LAKE',
  'STREET_CORRIDOR',
  'CULINARY',
  'COFFEE',
  'CRAFT',
  'OTHER',
]);
export type VenueCategory = z.infer<typeof VenueCategorySchema>;

/**
 * Compact representation of a Bali destination or MSME for client delivery (TDD §10.2).
 */
export const VenueLiteSchema = z.object({
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
  imageUrl: z.string(),
  imageCredit: z.string().nullable().optional(),
  /** Commons file page and licence deed for the photo, when it is a third-party image. */
  imageSourceUrl: z.string().nullable().optional(),
  imageLicenseUrl: z.string().nullable().optional(),
  /** Data provenance for imported businesses (ODbL attribution): "openstreetmap" and the OSM object URL. */
  source: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  priceLevel: z.number().nullable().optional(),
  isHotspot: z.boolean(),
  isBufferZone: z.boolean(),
});
export type VenueLite = z.infer<typeof VenueLiteSchema>;
