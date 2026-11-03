import { toWita, type GeoPoint } from '@margi-ai/shared';

/**
 * Demo scenario for "stuck in traffic": central Jl. Raya Ubud, whose daily gridlock window
 * runs 10:00–21:00 WITA (BRD §1). Labelled "Demo scenario" wherever it is offered.
 */
export const UBUD_GRIDLOCK_EXAMPLE = Object.freeze({
  origin: { lat: -8.5069, lng: 115.2625 } satisfies GeoPoint,
  label: 'Jl. Raya Ubud',
  windowStartHour: 10,
  windowEndHour: 21,
  fallbackHour: 11,
});

/** Now if the gridlock window is active, otherwise the next 11:00 WITA. */
export function gridlockExampleDepartAt(now: Date = new Date()): string {
  const wita = toWita(now);
  const { windowStartHour, windowEndHour, fallbackHour } = UBUD_GRIDLOCK_EXAMPLE;
  if (wita.hour >= windowStartHour && wita.hour < windowEndHour - 1) {
    return wita.set({ second: 0, millisecond: 0 }).toISO() ?? now.toISOString();
  }
  const today = wita.set({ hour: fallbackHour, minute: 0, second: 0, millisecond: 0 });
  const next = wita.hour < windowStartHour ? today : today.plus({ days: 1 });
  return next.toISO() ?? now.toISOString();
}

/** Current instant in WITA with the +08:00 offset the trip API expects. */
export function nowWitaIso(now: Date = new Date()): string {
  return toWita(now).set({ second: 0, millisecond: 0 }).toISO() ?? now.toISOString();
}
