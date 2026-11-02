import { RANK_WEIGHTS } from '../constants/scoring';

/**
 * Computes the Vibe-Equity Ranking Score R(v_alt, v_ref, t) for alternative candidates.
 *
 * Formula (BRD §7.3, TDD §7.4):
 *   R = alpha * Sim_vibe + beta * (100 - clamp(CFS_alt, 0, 100)) + gamma * E_fiscal
 *
 * Weights default to alpha = 0.50, beta = 0.35, gamma = 0.15.
 */
export function rankScore(
  simVibe: number,
  cfsAlt: number,
  eFiscal: number,
  weights = RANK_WEIGHTS,
): number {
  const clampedSim = Math.min(100, Math.max(0, simVibe));
  const clampedCfs = Math.min(100, Math.max(0, cfsAlt));
  const clampedFiscal = Math.min(100, Math.max(0, eFiscal));
  return (
    weights.alpha * clampedSim + weights.beta * (100 - clampedCfs) + weights.gamma * clampedFiscal
  );
}

export interface FiscalBoostParams {
  readonly phrStatus?: 'DONOR' | 'RECIPIENT';
  readonly isBufferZone?: boolean;
  readonly isHotspot?: boolean;
}

/**
 * Computes Fiscal Equity Boost E_fiscal for a candidate (BRD §7.3, TDD §7.4).
 * Returns 100 if the venue belongs to a RECIPIENT regency or buffer zone and is not a saturated hotspot; 0 otherwise.
 */
export function fiscalBoost(params: FiscalBoostParams): 0 | 100 {
  const isEligible = params.phrStatus === 'RECIPIENT' || Boolean(params.isBufferZone);
  return isEligible && !params.isHotspot ? 100 : 0;
}
