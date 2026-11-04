import type { CrowdReading, VenueLite } from '@margi-ai/shared';

/** Crowd label key; readings above 100 % (simulated viral surge) get their own word. */
export function crowdLevelKey(crowd: CrowdReading): string {
  return crowd.busynessPct > 100 ? 'surge' : crowd.level;
}

export function placeName(venue: VenueLite, isId: boolean): string {
  return isId ? venue.nameId : venue.nameEn;
}

export function placeDescription(venue: VenueLite, isId: boolean): string {
  return isId ? venue.descriptionId : venue.descriptionEn;
}

/** WITA hour label in the locale's convention: 09.00 (ID) or 09:00 (EN). */
export function hourLabel(hour: number, isId: boolean): string {
  const padded = String(hour).padStart(2, '0');
  return isId ? `${padded}.00` : `${padded}:00`;
}

export function regencyLabel(regencyId: string): string {
  return regencyId.charAt(0).toUpperCase() + regencyId.slice(1);
}
