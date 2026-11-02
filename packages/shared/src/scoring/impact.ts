import { BUNDLE, TRAVEL_SPEED_KMH } from '../constants/scoring';

/**
 * Estimates physical waiting queue time in minutes based on venue's typical peak duration and current busyness.
 *
 * Formula (TDD §6.5 step 6):
 *   queueEstimate(v, t) = typicalPeakQueueMinutes(v) * clamp(B_eff / 100, 0, 1.2)
 */
export function queueEstimateMin(typicalPeakQueueMinutes: number, bEff: number): number {
  const ratio = Math.min(1.2, Math.max(0, bEff / 100));
  return Math.round(typicalPeakQueueMinutes * ratio);
}

/**
 * Estimates driving travel duration in minutes given distance in km and corridor peak status (TDD §6.5 step 6).
 */
export function travelMinutesEstimate(distanceKm: number, isCorridorPeak: boolean): number {
  const speed = isCorridorPeak ? TRAVEL_SPEED_KMH.corridorPeak : TRAVEL_SPEED_KMH.normal;
  if (distanceKm <= 0) {
    return 0;
  }
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}

export interface TimeSavedParams {
  readonly originQueue: number;
  readonly originCorridorDelay: number;
  readonly altQueue: number;
  readonly altTravel: number;
}

/**
 * Computes the estimated net time saved (in minutes) by taking an alternative route.
 * Returns a [low, high] range representing ±20% variation, floored at 0 (TDD §6.5 step 6).
 */
export function timeSavedRange(params: TimeSavedParams): [number, number] {
  const originTotal = params.originQueue + params.originCorridorDelay;
  const altTotal = params.altQueue + params.altTravel;
  const expected = originTotal - altTotal;
  const floored = Math.max(0, expected);
  const low = Math.max(0, Math.round(floored * 0.8));
  const high = Math.max(0, Math.round(floored * 1.2));
  return [low, high];
}

export interface BundleScoreWeights {
  readonly weightSim: number;
  readonly weightDistance: number;
}

/**
 * Scores candidate MSMEs for pairing with a primary alternative DTW.
 *
 * Formula (TDD §6.5 step 4):
 *   bundleScore = 0.6 * Sim_vibe + 0.4 * (100 - (distance / radius) * 100)
 */
export function bundleScore(
  simVibe: number,
  distanceKm: number,
  radiusKm: number = BUNDLE.radiusKm,
  weights: BundleScoreWeights = BUNDLE,
): number {
  const clampedSim = Math.min(100, Math.max(0, simVibe));
  const ratio = radiusKm > 0 ? distanceKm / radiusKm : 1;
  const distanceScore = Math.min(100, Math.max(0, (1 - ratio) * 100));
  const raw = weights.weightSim * clampedSim + weights.weightDistance * distanceScore;
  return Math.min(100, Math.max(0, raw));
}
