import { COSINE_CALIBRATION } from '../constants/scoring';

export interface CosineCalibrationBounds {
  readonly floor: number;
  readonly ceil: number;
}

/**
 * Calibrates raw cosine similarity from text embeddings onto an intuitive [0, 100] percentage scale.
 *
 * Formula (TDD §7.3):
 *   Sim_vibe = clamp((cos - floor) / (ceil - floor), 0, 1) * 100
 */
export function simVibeFromCosine(
  cos: number,
  calibration: CosineCalibrationBounds = COSINE_CALIBRATION,
): number {
  const { floor, ceil } = calibration;
  if (floor >= ceil) {
    throw new Error(
      `Invalid cosine calibration: floor (${floor}) must be strictly less than ceil (${ceil}).`,
    );
  }
  const normalized = (cos - floor) / (ceil - floor);
  const clamped = Math.min(1, Math.max(0, normalized));
  return clamped * 100;
}

/**
 * Jaccard overlap of two mood-tag sets on a [0, 100] scale. Used by the explore flow
 * as the Sim_vibe input of the ranking formula when no image embedding exists (DECISIONS D-025).
 * Two empty sets share nothing, so they score 0.
 */
export function tagSimilarity(a: readonly string[], b: readonly string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  let shared = 0;
  for (const tag of left) {
    if (right.has(tag)) shared += 1;
  }
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : (shared / union) * 100;
}
