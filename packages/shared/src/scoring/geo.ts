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

/**
 * Google Maps multi-stop navigation link: origin, ordered waypoints, final destination.
 * Used as the last hand-off of a MARGI trip plan (DECISIONS D-026).
 */
export function googleMapsTripUrl(origin: LatLng, stops: readonly LatLng[]): string {
  const point = (p: LatLng): string => `${p.lat},${p.lng}`;
  const destination = stops[stops.length - 1];
  if (!destination) return googleMapsDirUrl(origin);
  const params = new URLSearchParams({
    api: '1',
    origin: point(origin),
    destination: point(destination),
    travelmode: 'driving',
  });
  const waypoints = stops.slice(0, -1);
  if (waypoints.length > 0) params.set('waypoints', waypoints.map(point).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
