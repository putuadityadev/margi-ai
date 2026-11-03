import type {
  Corridor,
  OpeningHours,
  Regency,
  VenueLite,
  VibeProfile,
  VibeTag,
} from '../schemas/index';

/** A venue as the engine reads it: the public card plus planning attributes. */
export interface CatalogVenue extends VenueLite {
  readonly openingHours: OpeningHours;
  readonly typicalPeakQueueMinutes: number;
  readonly avgDwellMinutes: number;
  readonly etiquetteTags: string[];
  vibeProfile?: VibeProfile;
  isActive?: boolean;
}

/** Hourly crowd curve parameters (0-100 scale) used to synthesise the forecast. */
export interface CrowdProfile {
  /** WITA hour 6-19 when the place is busiest. */
  readonly peakHour: number;
  /** 0-100 on a weekday; hotspots 80-98, hidden gems 15-40. */
  readonly peakBusyness: number;
  /** 3-25, early-morning floor. */
  readonly baseBusyness: number;
}

/** One place the explore and trip engines can reason about. */
export interface CatalogPlace {
  readonly venue: CatalogVenue;
  readonly vibeTags: readonly VibeTag[];
  readonly crowd: CrowdProfile;
}

/** Reference data the engine reads at call time. */
export interface CatalogData {
  readonly places: readonly CatalogPlace[];
  readonly corridors: readonly Corridor[];
  readonly regencies: readonly Regency[];
}

let current: CatalogData | undefined;

/**
 * Registers the catalogue the engine reads from.
 *
 * This is deliberately process-global state: the MVP runs as a single instance, so one shared
 * registry is simpler than threading a catalogue through every engine call. The API calls it
 * at start-up (and after a catalogue refresh); web mocks and tests call it before using the
 * engine. Engine code must call `getCatalog()` at call time, never at module load.
 */
export function setCatalog(data: CatalogData): void {
  current = data;
}

/**
 * The registered catalogue.
 * @throws Error when `setCatalog` has not been called yet.
 */
export function getCatalog(): CatalogData {
  if (!current) {
    throw new Error('Engine catalogue is not set: call setCatalog() at start-up before using it.');
  }
  return current;
}
