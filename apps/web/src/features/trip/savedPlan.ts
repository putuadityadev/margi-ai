import { toWita, type SavedTripPlan } from '@margi-ai/shared';
import type { TripDraft } from '../../stores/tripStore';

/**
 * A saved plan keeps the departure it was made for, which is usually in the past by the time it
 * is reopened. Keep the same clock time but on the next day it has not yet passed, so the plan
 * is evaluated for a real upcoming trip.
 */
export function upcomingDeparture(iso: string, now: Date = new Date()): string {
  if (Date.parse(iso) >= now.getTime()) return iso;
  const saved = toWita(iso);
  let candidate = toWita(now).set({
    hour: saved.hour,
    minute: saved.minute,
    second: 0,
    millisecond: 0,
  });
  if (candidate.toMillis() < now.getTime()) candidate = candidate.plus({ days: 1 });
  return candidate.toISO() ?? iso;
}

/** Trip draft to resume from a saved plan. */
export function draftFromSaved(saved: SavedTripPlan, now: Date = new Date()): TripDraft {
  return {
    origin: saved.request.origin,
    originLabel: saved.request.originLabel,
    departAt: upcomingDeparture(saved.request.departAt, now),
    stops: saved.request.stops,
  };
}
