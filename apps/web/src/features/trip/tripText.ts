import type { TFunction } from 'i18next';
import {
  applyTripChange,
  toWita,
  type TripPlan,
  type TripRequest,
  type TripSuggestion,
} from '@margi-ai/shared';
import { placeName } from '../explore/placeText';

/** WITA clock time in the locale's convention: 09.30 (ID) or 09:30 (EN). */
export function clockLabel(iso: string, isId: boolean): string {
  return toWita(iso).toFormat(isId ? 'HH.mm' : 'HH:mm');
}

/** Whether `iso` falls on today or tomorrow in WITA (later dates read as tomorrow). */
export function dayOf(iso: string, now: Date = new Date()): 'today' | 'tomorrow' {
  return toWita(iso).toISODate() === toWita(now).toISODate() ? 'today' : 'tomorrow';
}

function stopName(plan: TripPlan, index: number, isId: boolean): string {
  const stop = plan.stops[index];
  return stop ? placeName(stop.place.venue, isId) : '';
}

/** Interpolation values for a suggestion's title and log line. */
function suggestionParams(
  suggestion: TripSuggestion,
  plan: TripPlan,
  request: TripRequest,
  isId: boolean,
): Record<string, string> {
  const { change } = suggestion;
  const venueName = suggestion.venue ? placeName(suggestion.venue.venue, isId) : '';
  switch (change.kind) {
    case 'SHIFT_DEPARTURE':
      return { time: clockLabel(applyTripChange(request, change).departAt, isId) };
    case 'SWAP_STOP':
      return { from: stopName(plan, change.stopIndex, isId), to: venueName };
    case 'ADD_STOP':
      return { name: venueName };
    case 'SET_STOPS': {
      const stops = suggestion.venues ?? (suggestion.venue ? [suggestion.venue] : []);
      return { name: stops.map((stop) => placeName(stop.venue, isId)).join(' → ') };
    }
    case 'REMOVE_STOP':
      return { name: stopName(plan, change.stopIndex, isId) };
    case 'REORDER':
      return {};
  }
}

export function suggestionTitle(
  t: TFunction<'trip'>,
  suggestion: TripSuggestion,
  plan: TripPlan,
  isId: boolean,
): string {
  const params = suggestionParams(suggestion, plan, plan.request, isId);
  return t(`suggestion.kind.${suggestion.change.kind}`, params);
}

export function suggestionLogLine(
  t: TFunction<'trip'>,
  suggestion: TripSuggestion,
  plan: TripPlan,
  isId: boolean,
): string {
  const params = suggestionParams(suggestion, plan, plan.request, isId);
  return t(`suggestion.log.${suggestion.change.kind}`, params);
}

/** Signed number with a true minus sign, e.g. "−32" or "+8". */
export function signed(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}
