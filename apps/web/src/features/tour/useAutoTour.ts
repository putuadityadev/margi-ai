import { useEffect } from 'react';
import { runTour } from './runTour';
import { shouldAutoStart } from './tourMemory';
import type { TourId } from './tours';

/** Lets the screen settle (sheets slide in, cards load) before the first step is measured. */
const SETTLE_MS = 700;

/**
 * Starts a screen's tour the first time the screen is ready, unless the traveller skipped the
 * tours or already saw this one.
 */
export function useAutoTour(id: TourId, ready: boolean): void {
  useEffect(() => {
    if (!ready || !shouldAutoStart(id)) return;
    const timer = window.setTimeout(() => runTour(id), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [id, ready]);
}
