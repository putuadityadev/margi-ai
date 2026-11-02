// BRD §7.3: The 6 recipient regencies receiving PHR equalization subsidies in Bali
export const RECIPIENT_REGENCIES = Object.freeze([
  'BANGLI',
  'KARANGASEM',
  'BULELENG',
  'TABANAN',
  'KLUNGKUNG',
  'JEMBRANA',
] as const);

export type RecipientRegency = (typeof RECIPIENT_REGENCIES)[number];

// Donor regencies generating major tourism revenue (Badung, Denpasar, Gianyar)
export const DONOR_REGENCIES = Object.freeze(['BADUNG', 'DENPASAR', 'GIANYAR'] as const);

export type DonorRegency = (typeof DONOR_REGENCIES)[number];

export const ALL_REGENCIES = Object.freeze([...DONOR_REGENCIES, ...RECIPIENT_REGENCIES] as const);

export type BaliRegency = (typeof ALL_REGENCIES)[number];

// TDD §5: MSME categories bundled by Agent 3
export const MSME_CATEGORIES = Object.freeze(['WARUNG', 'CAFE', 'CRAFT_WORKSHOP'] as const);

export type MsmeCategory = (typeof MSME_CATEGORIES)[number];

// TDD §5: Primary destination categories (DTW)
export const DTW_CATEGORIES = Object.freeze([
  'TEMPLE',
  'WATERFALL',
  'RICE_TERRACE',
  'CULTURAL_VILLAGE',
  'BEACH',
  'NATURE_LEISURE',
] as const);

export type DtwCategory = (typeof DTW_CATEGORIES)[number];

// TDD §5 & Clarification C-10: Hotspot corridor categories
export const CORRIDOR_CATEGORIES = Object.freeze(['STREET_CORRIDOR'] as const);

export type CorridorCategory = (typeof CORRIDOR_CATEGORIES)[number];

export const ALL_VENUE_CATEGORIES = Object.freeze([
  ...DTW_CATEGORIES,
  ...MSME_CATEGORIES,
  ...CORRIDOR_CATEGORIES,
] as const);

export type AllVenueCategory = (typeof ALL_VENUE_CATEGORIES)[number];

// TDD §13.7: Supported interface locales
export const SUPPORTED_LOCALES = Object.freeze(['en', 'id'] as const);
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

// TDD §7.1, Clarification C-03: Official Bali timezone
export const WITA_ZONE = 'Asia/Makassar' as const;
