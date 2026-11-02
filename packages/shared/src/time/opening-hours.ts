import type { DateTime } from 'luxon';
import { z } from 'zod';
import type { DayOfWeekWita } from './wita';
import { toWita, witaDayOfWeek } from './wita';

const TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm format (00:00 - 23:59)');

export const TimeRangeSchema = z.tuple([TimeStringSchema, TimeStringSchema]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

// TDD §5: openingHours JSON map where keys are day numbers "0" (Monday) ... "6" (Sunday)
export const OpeningHoursSchema = z.record(
  z.string().regex(/^[0-6]$/, 'Day key must be 0 (Monday) to 6 (Sunday)'),
  z.array(TimeRangeSchema),
);
export type OpeningHoursMap = Record<string, TimeRange[]>;

// TDD §5: Corridor penalty window definition
export const PenaltyWindowSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1),
  start: TimeStringSchema,
  end: TimeStringSchema,
});
export type PenaltyWindow = z.infer<typeof PenaltyWindowSchema>;

/**
 * Checks whether a venue is open at a given moment in WITA.
 * Supports:
 * - normal same-day ranges: ["08:00", "18:00"]
 * - cross-midnight ranges: ["18:00", "02:00"] (spans to next day)
 * - multiple ranges per day (e.g. lunch + dinner)
 * - boundary: open at start (inclusive), closed at end (exclusive)
 * - missing day: closed
 */
export function isOpen(
  openingHours: OpeningHoursMap | null | undefined,
  dt: Date | string | number | DateTime,
): boolean {
  if (!openingHours || typeof openingHours !== 'object') {
    return false;
  }

  const wita = toWita(dt);
  const currentDay = witaDayOfWeek(wita);
  const currentTime = wita.toFormat('HH:mm');

  // Check 1: Ranges defined on currentDay
  const todayKey = String(currentDay);
  const todayRanges = openingHours[todayKey];
  if (Array.isArray(todayRanges)) {
    for (const [start, end] of todayRanges) {
      if (start <= end) {
        // Standard same-day range: open at start, closed at end
        if (currentTime >= start && currentTime < end) {
          return true;
        }
      } else {
        // Cross-midnight range (e.g. 18:00 to 02:00): open on current day from start onwards
        if (currentTime >= start) {
          return true;
        }
      }
    }
  }

  // Check 2: Cross-midnight range spilling over from previous day
  const previousDay = ((currentDay + 6) % 7) as DayOfWeekWita;
  const prevKey = String(previousDay);
  const prevRanges = openingHours[prevKey];
  if (Array.isArray(prevRanges)) {
    for (const [start, end] of prevRanges) {
      if (start > end && currentTime < end) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether a given WITA moment falls inside any active corridor penalty window.
 */
export function isWithinWindow(
  windows: readonly PenaltyWindow[] | null | undefined,
  dt: Date | string | number | DateTime,
): boolean {
  if (!windows || windows.length === 0) {
    return false;
  }

  const wita = toWita(dt);
  const day = witaDayOfWeek(wita);
  const currentTime = wita.toFormat('HH:mm');

  for (const window of windows) {
    if (!window.days.includes(day)) {
      continue;
    }

    if (window.start <= window.end) {
      if (currentTime >= window.start && currentTime < window.end) {
        return true;
      }
    } else {
      // Overnight window (e.g. 22:00 to 04:00)
      if (currentTime >= window.start || currentTime < window.end) {
        return true;
      }
    }
  }

  return false;
}

export interface QuietHoursOptions {
  readonly windowHours?: number;
  readonly count?: number;
}

/**
 * Identifies the quietest hours for arrival and departure within a +/- window around t (TDD §8.2).
 * Prioritizes hours when the venue is open.
 */
export function pickQuietHours(
  curve24: readonly number[],
  openingHours: OpeningHoursMap | null | undefined,
  dt: Date | string | number | DateTime,
  options: QuietHoursOptions = {},
): { arrivalHours: number[]; departureHours: number[] } {
  const windowHours = options.windowHours ?? 4;
  const count = options.count ?? 3;
  const wita = toWita(dt);

  interface HourCandidate {
    hour: number;
    busyness: number;
    open: boolean;
  }

  const candidates: HourCandidate[] = [];

  for (let offset = -windowHours; offset <= windowHours; offset++) {
    const candidateDt = wita.plus({ hours: offset });
    const h = candidateDt.hour;
    const busyness = curve24[h] ?? 50;
    const open = openingHours ? isOpen(openingHours, candidateDt) : true;
    candidates.push({ hour: h, busyness, open });
  }

  // Prefer open hours first, then lowest busyness
  const openCandidates = candidates.filter((c) => c.open);
  const pool = openCandidates.length >= count ? openCandidates : candidates;

  const sortedByCalm = [...pool].sort((a, b) => a.busyness - b.busyness);
  const picked = sortedByCalm.slice(0, count).map((c) => c.hour);
  // Sort chronologically for intuitive UI presentation
  picked.sort((a, b) => a - b);

  return {
    arrivalHours: picked,
    departureHours: picked.map((h) => (h + 2) % 24),
  };
}
