// BRD §7.2: w1 (effective crowd) + w2 (projected crowd) + w3 (corridor penalty) = 1.00
export const CFS_WEIGHTS = Object.freeze({
  w1: 0.5,
  w2: 0.3,
  w3: 0.2,
});

// BRD §7.3: alpha (aesthetic similarity) + beta (crowd ease) + gamma (fiscal equity) = 1.00
export const RANK_WEIGHTS = Object.freeze({
  alpha: 0.5,
  beta: 0.35,
  gamma: 0.15,
});

export interface ScoringThresholds {
  readonly redZone: number;
  readonly calmMax: number;
  readonly simMin: number;
  readonly corridorPenalty: number;
  readonly surgePct: number;
}

// TDD §7: core threshold boundaries for crowd classification, trigger zones, and simulation
export const THRESHOLDS: Readonly<ScoringThresholds> = Object.freeze({
  // CFS or bEff >= 75 triggers Red Zone diversion recommendation (BRD §7.2)
  redZone: 75,
  // Candidates must have bEff <= 35 to qualify as calm alternatives (BRD §7.2)
  calmMax: 35,
  // Minimum calibrated aesthetic similarity percentage for Step 0 (BRD §7.3)
  simMin: 70,
  // Gridlock penalty added to CFS when inside critical corridor penalty window (BRD §7.2)
  corridorPenalty: 25,
  // Effective busyness percentage injected for simulated viral surge (TDD §8.4)
  surgePct: 115,
});

export type BusynessKey = 'low' | 'below_average' | 'average' | 'above_average' | 'high';

// TDD §7: ordered relative crowd categories from BestTime telemetry mapping
export const BUSYNESS_CLASSES: readonly Readonly<{ max: number; key: BusynessKey }>[] =
  Object.freeze([
    Object.freeze({ max: 20, key: 'low' }),
    Object.freeze({ max: 35, key: 'below_average' }),
    Object.freeze({ max: 60, key: 'average' }),
    Object.freeze({ max: 74, key: 'above_average' }),
    Object.freeze({ max: 100, key: 'high' }),
  ]);

// TDD §7.3: linear calibration bounds for raw text embedding cosine similarities
// Measured on the 123-place catalogue with google/gemini-embedding-001 @ 768 dims (T-096): cosines
// of pairs sharing a mood tag span 0.62-0.88 (median 0.72, p90 0.79); unrelated pairs sit near 0.63.
// The earlier 0.20/0.85 bounds mapped that whole range to 73-100, so nothing was distinguishable.
// 0.60/0.90 puts unrelated places near 10, same-category places near 75 and near-twins above 90.
// Re-measure and update COS_FLOOR/COS_CEIL if the embedding model changes.
export const COSINE_CALIBRATION = Object.freeze({
  floor: 0.6,
  ceil: 0.9,
});

export interface RelaxationStep {
  readonly step: 0 | 1 | 2;
  readonly simMin: number;
  readonly bEffMax: number;
  readonly microRadiusMinKm: number;
  readonly microRadiusMaxKm: number;
}

// TDD §6.5 table: 3-tier relaxation ladder applied when candidates < 2
export const RELAXATION_LADDER: readonly RelaxationStep[] = Object.freeze([
  Object.freeze({ step: 0, simMin: 70, bEffMax: 35, microRadiusMinKm: 1.0, microRadiusMaxKm: 3.0 }),
  Object.freeze({ step: 1, simMin: 62, bEffMax: 35, microRadiusMinKm: 0.8, microRadiusMaxKm: 4.0 }),
  Object.freeze({ step: 2, simMin: 55, bEffMax: 45, microRadiusMinKm: 0.5, microRadiusMaxKm: 5.0 }),
]);

// TDD §6.5 step 4: Micro-MSME bundling radius and composition weights (0.6 + 0.4 = 1.0)
export const BUNDLE = Object.freeze({
  maxPerCard: 2,
  radiusKm: 3,
  regionalFallbackRadiusKm: 5,
  weightSim: 0.6,
  weightDistance: 0.4,
});

// TDD §6.5 step 6: estimated speeds in km/h for arrival and travel estimates
export const TRAVEL_SPEED_KMH = Object.freeze({
  corridorPeak: 18,
  normal: 30,
});

// TDD §8.4: baseline busyness fallback by venue category when forecast rows are missing
export const CATEGORY_BASELINE_BUSYNESS = Object.freeze({
  TEMPLE: 25,
  WATERFALL: 20,
  RICE_TERRACE: 25,
  CULTURAL_VILLAGE: 25,
  BEACH: 30,
  STREET_CORRIDOR: 45,
  NATURE_LEISURE: 20,
  WARUNG: 25,
  CAFE: 30,
  CRAFT_WORKSHOP: 20,
});

// TDD §6.3 step 5: candidate set size retrieved from pgvector
export const TOP_K = 20;

// TDD §6.5 step 3: maximum recommendation cards shown per tab
export const MAX_RECOMMENDATIONS_PER_TAB = 3;

// TDD §6.5 step 3: diversity rule maximum venues with identical category per tab
export const MAX_SAME_CATEGORY = 2;

export interface ScoringConfigOverrides {
  readonly cosFloor?: number;
  readonly cosCeil?: number;
  readonly simSurgePercent?: number;
  readonly corridorPenalty?: number;
}

export interface ResolvedScoringConfig {
  readonly cfsWeights: typeof CFS_WEIGHTS;
  readonly rankWeights: typeof RANK_WEIGHTS;
  readonly thresholds: Readonly<ScoringThresholds>;
  readonly cosineCalibration: {
    readonly floor: number;
    readonly ceil: number;
  };
  readonly relaxationLadder: typeof RELAXATION_LADDER;
  readonly bundle: typeof BUNDLE;
  readonly travelSpeedKmh: typeof TRAVEL_SPEED_KMH;
  readonly topK: number;
  readonly maxRecommendationsPerTab: number;
  readonly maxSameCategory: number;
}

/**
 * Resolves scoring weights and thresholds, applying validated environment overrides.
 * Throws when calibration ranges or penalty values are invalid.
 */
export function resolveScoringConfig(
  overrides: ScoringConfigOverrides = {},
): Readonly<ResolvedScoringConfig> {
  const floor = overrides.cosFloor ?? COSINE_CALIBRATION.floor;
  const ceil = overrides.cosCeil ?? COSINE_CALIBRATION.ceil;

  if (typeof floor !== 'number' || Number.isNaN(floor) || floor < -1 || floor > 1) {
    throw new Error(`Invalid cosFloor: ${floor}. Must be a valid float between -1 and 1.`);
  }

  if (typeof ceil !== 'number' || Number.isNaN(ceil) || ceil < -1 || ceil > 1) {
    throw new Error(`Invalid cosCeil: ${ceil}. Must be a valid float between -1 and 1.`);
  }

  if (floor >= ceil) {
    throw new Error(
      `Invalid cosine calibration: cosFloor (${floor}) must be strictly less than cosCeil (${ceil}).`,
    );
  }

  const surgePct = overrides.simSurgePercent ?? THRESHOLDS.surgePct;
  if (typeof surgePct !== 'number' || Number.isNaN(surgePct) || surgePct < 100) {
    throw new Error(`Invalid simSurgePercent: ${surgePct}. Must be >= 100.`);
  }

  const corridorPenalty = overrides.corridorPenalty ?? THRESHOLDS.corridorPenalty;
  if (typeof corridorPenalty !== 'number' || Number.isNaN(corridorPenalty) || corridorPenalty < 0) {
    throw new Error(`Invalid corridorPenalty: ${corridorPenalty}. Must be >= 0.`);
  }

  return Object.freeze({
    cfsWeights: CFS_WEIGHTS,
    rankWeights: RANK_WEIGHTS,
    thresholds: Object.freeze({
      ...THRESHOLDS,
      corridorPenalty,
      surgePct,
    }),
    cosineCalibration: Object.freeze({
      floor,
      ceil,
    }),
    relaxationLadder: RELAXATION_LADDER,
    bundle: BUNDLE,
    travelSpeedKmh: TRAVEL_SPEED_KMH,
    topK: TOP_K,
    maxRecommendationsPerTab: MAX_RECOMMENDATIONS_PER_TAB,
    maxSameCategory: MAX_SAME_CATEGORY,
  });
}
