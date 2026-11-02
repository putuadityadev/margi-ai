import { BUSYNESS_CLASSES, type BusynessKey } from '../constants/scoring';

/**
 * Classifies effective crowd busyness percentage into 5 human-readable categories.
 * Values above 100% (e.g. 115% simulated viral surge) map to 'high' (BRD §7.1, TDD §7).
 */
export function classifyBusyness(pct: number): BusynessKey {
  for (const entry of BUSYNESS_CLASSES) {
    if (pct <= entry.max) {
      return entry.key;
    }
  }
  return 'high';
}
