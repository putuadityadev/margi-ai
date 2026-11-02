import { DateTime } from 'luxon';
import { WITA_ZONE } from '../constants/domain';

export type DayOfWeekWita = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Converts any Date, millisecond timestamp, ISO/date string, or DateTime into Luxon DateTime in Asia/Makassar (WITA, UTC+8).
 */
export function toWita(input: Date | string | number | DateTime): DateTime {
  if (DateTime.isDateTime(input)) {
    return input.setZone(WITA_ZONE);
  }
  if (input instanceof Date) {
    return DateTime.fromJSDate(input, { zone: WITA_ZONE });
  }
  if (typeof input === 'number') {
    return DateTime.fromMillis(input, { zone: WITA_ZONE });
  }
  if (typeof input === 'string') {
    const iso = DateTime.fromISO(input, { zone: WITA_ZONE });
    if (iso.isValid) {
      return iso.setZone(WITA_ZONE);
    }
    const jsDate = new Date(input);
    if (!Number.isNaN(jsDate.getTime())) {
      return DateTime.fromJSDate(jsDate, { zone: WITA_ZONE });
    }
  }
  throw new Error(`Unable to convert input into WITA DateTime: ${String(input)}`);
}

/**
 * Returns day-of-week under the official 0 = Monday ... 6 = Sunday convention.
 * Luxon weekday maps 1 (Monday) -> 0, 7 (Sunday) -> 6. Never use Date#getDay().
 */
export function witaDayOfWeek(dt: Date | string | number | DateTime): DayOfWeekWita {
  const wita = toWita(dt);
  return (wita.weekday - 1) as DayOfWeekWita;
}

/**
 * Returns the hour of day (0..23) in WITA.
 */
export function witaHour(dt: Date | string | number | DateTime): number {
  return toWita(dt).hour;
}

/**
 * Adds hours in WITA, correctly wrapping across midnight and Sunday (6) -> Monday (0).
 */
export function addHoursWrapped(
  dt: Date | string | number | DateTime,
  hours: number,
): { dayOfWeek: DayOfWeekWita; hour: number } {
  const next = toWita(dt).plus({ hours });
  return {
    dayOfWeek: witaDayOfWeek(next),
    hour: next.hour,
  };
}

/**
 * Formats a WITA DateTime for display in bilingual UI (EN or ID).
 */
export function formatWita(
  dt: Date | string | number | DateTime,
  locale: 'en' | 'id' = 'en',
  options?: Intl.DateTimeFormatOptions,
): string {
  const wita = toWita(dt);
  const intlOptions: Intl.DateTimeFormatOptions = options
    ? { timeZone: WITA_ZONE, ...options }
    : {
        timeZone: WITA_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      };
  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, intlOptions).format(wita.toJSDate());
}

/**
 * Formats time in the visitor's local browser timezone alongside WITA reference (PRD AC-02.5).
 */
export function formatLocalEquivalent(
  dt: Date | string | number | DateTime,
  browserZone: string,
  locale: 'en' | 'id' = 'en',
): string {
  const wita = toWita(dt);
  const intlLocale = locale === 'id' ? 'id-ID' : 'en-US';
  const localFormatted = new Intl.DateTimeFormat(intlLocale, {
    timeZone: browserZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(wita.toJSDate());

  const witaFormatted = new Intl.DateTimeFormat(intlLocale, {
    timeZone: WITA_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(wita.toJSDate());

  if (browserZone === WITA_ZONE) {
    return witaFormatted;
  }
  return `${witaFormatted} (${localFormatted})`;
}
