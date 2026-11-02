import { CFS_WEIGHTS, THRESHOLDS } from '../constants/scoring';

export interface CfsParams {
  readonly bEff: number;
  readonly fPlus2: number;
  readonly corridorPenalty?: number;
}

export interface CfsResult {
  readonly raw: number;
  readonly display: number;
}

/**
 * Computes Crowd Friction Score (CFS) for a venue at arrival time t.
 *
 * Formula (BRD §7.2, TDD §7.2):
 *   CFS(v, t) = w1 * B_eff(v, t) + w2 * F(v, t+2) + w3 * P_corridor(v, t)
 *
 * - raw may exceed 100 during viral surges or corridor gridlocks (used for Red Zone threshold checks).
 * - display is clamped to [0, 100] and rounded to an integer for UI meters.
 */
export function cfs(params: CfsParams, weights = CFS_WEIGHTS): CfsResult {
  const penalty = params.corridorPenalty ?? 0;
  const raw = weights.w1 * params.bEff + weights.w2 * params.fPlus2 + weights.w3 * penalty;
  const display = Math.min(100, Math.max(0, Math.round(raw)));
  return { raw, display };
}

export interface RedZoneParams {
  readonly cfsRaw: number;
  readonly bEff: number;
}

/**
 * Evaluates whether an origin location is saturated and qualifies as Red Zone (BRD §7.2).
 * Triggers when raw CFS >= 75 OR effective busyness >= 75%.
 */
export function isRedZone(params: RedZoneParams, thresholds = THRESHOLDS): boolean {
  return params.cfsRaw >= thresholds.redZone || params.bEff >= thresholds.redZone;
}
