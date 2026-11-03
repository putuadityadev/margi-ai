import { simVibeFromCosine } from '../scoring/similarity';
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

let embeddings: Readonly<Record<string, readonly number[]>> = {};

/**
 * Registers the description embeddings keyed by venue id. Like the catalogue this is process-global
 * state set at start-up; a venue without an entry is simply not comparable (no tag fallback, D-029).
 */
export function setEmbeddings(map: Readonly<Record<string, readonly number[]>>): void {
  embeddings = map;
}

/** The registered embedding of a venue, or undefined when it has none. */
export function getEmbedding(venueId: string): readonly number[] | undefined {
  return embeddings[venueId];
}

function cosine(a: readonly number[], b: readonly number[]): number | null {
  if (a.length === 0 || a.length !== b.length) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? null : dot / denominator;
}

/**
 * Vibe similarity of two venues on the calibrated 0-100 scale (TDD �7.3): cosine similarity of
 * their description embeddings passed through `simVibeFromCosine`.
 * @returns null when either venue has no (comparable) embedding.
 */
export function vibeSimilarity(venueIdA: string, venueIdB: string): number | null {
  const a = embeddings[venueIdA];
  const b = embeddings[venueIdB];
  if (!a || !b) return null;
  const cos = cosine(a, b);
  return cos === null ? null : simVibeFromCosine(cos);
}
