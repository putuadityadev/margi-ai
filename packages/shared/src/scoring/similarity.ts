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
