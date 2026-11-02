import { WITA_ZONE, toWita } from '@margi-ai/shared';

/**
 * Formats a timestamp or date string into WITA time (Asia/Makassar, UTC+8).
 */
export function formatWita(
  input: Date | string | number,
  locale: string = 'id',
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: WITA_ZONE,
  },
): string {
  const witaDt = toWita(input);
  return new Intl.DateTimeFormat(locale.startsWith('id') ? 'id-ID' : 'en-US', {
    ...options,
    timeZone: WITA_ZONE,
  }).format(witaDt.toJSDate());
}

/**
 * Formats a localized number with digit grouping.
 */
export function formatNumber(
  value: number,
  locale: string = 'id',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale.startsWith('id') ? 'id-ID' : 'en-US', options).format(value);
}

/**
 * Formats elapsed or saved minutes into localized string ("45 min" / "45 mnt").
 */
export function formatMinutes(minutes: number, locale: string = 'id'): string {
  const rounded = Math.round(minutes);
  const suffix = locale.startsWith('id') ? 'mnt' : 'min';
  return `${rounded} ${suffix}`;
}

/**
 * Formats a distance in kilometers to 1 decimal place.
 */
export function formatDistanceKm(km: number, locale: string = 'id'): string {
  const formatted = new Intl.NumberFormat(locale.startsWith('id') ? 'id-ID' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(km);
  return `${formatted} km`;
}
