export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance between two WGS84 geographic coordinates using the Haversine formula (TDD §7.5).
 * @returns Distance in kilometres.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);

  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * Generates an official Google Maps navigation link to a destination coordinate (TDD §10.2).
 */
export function googleMapsDirUrl(dest: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}

/** Rough bounding box of Bali including Nusa Penida, Lembongan and Ceningan. */
export const BALI_BOUNDS = Object.freeze({ south: -8.95, north: -8.04, west: 114.4, east: 115.73 });

/** True when a point lies inside the Bali bounding box (used to reject off-island GPS fixes). */
export function isInBali(point: LatLng): boolean {
  return (
    point.lat >= BALI_BOUNDS.south &&
    point.lat <= BALI_BOUNDS.north &&
    point.lng >= BALI_BOUNDS.west &&
    point.lng <= BALI_BOUNDS.east
  );
}
