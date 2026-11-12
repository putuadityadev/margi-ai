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

/** Kilometres per degree of latitude (WGS84 mean), for the local flat projection below. */
const KM_PER_DEGREE = 111.32;

/**
 * Shortest distance from a point to a path of straight segments, in kilometres. Uses a local
 * equirectangular projection around the point, accurate to metres over the few tens of
 * kilometres a Bali leg spans. A one-point path is the distance to that point.
 */
export function distanceToPathKm(point: LatLng, path: readonly LatLng[]): number {
  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  const project = (p: LatLng): { x: number; y: number } => ({
    x: (p.lng - point.lng) * KM_PER_DEGREE * cosLat,
    y: (p.lat - point.lat) * KM_PER_DEGREE,
  });
  let best = Number.POSITIVE_INFINITY;
  path.forEach((vertex, index) => {
    const a = project(vertex);
    const next = path[index + 1];
    if (!next) {
      best = Math.min(best, Math.hypot(a.x, a.y));
      return;
    }
    const b = project(next);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    // Projection of the point (the origin) onto the segment, clamped to its ends.
    const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, -(a.x * dx + a.y * dy) / lengthSq));
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy));
  });
  return best;
}

/**
 * Extra straight-line distance of going from `from` to `to` through `via` instead of directly,
 * in kilometres (never negative).
 */
export function detourKm(from: LatLng, via: LatLng, to: LatLng): number {
  return Math.max(0, haversineKm(from, via) + haversineKm(via, to) - haversineKm(from, to));
}

/**
 * Evenly spaced points along a path, measured by distance (fractions strictly between 0 and 1,
 * e.g. [0.25, 0.5, 0.75]). An empty path gives no points.
 */
export function pointsAlongPath(path: readonly LatLng[], fractions: readonly number[]): LatLng[] {
  const segments = path.slice(1).map((to, index) => {
    const from = path[index] as LatLng; // index < path.length - 1, so this vertex exists
    return { from, to, km: haversineKm(from, to) };
  });
  const total = segments.reduce((sum, segment) => sum + segment.km, 0);
  return fractions.flatMap((fraction): LatLng[] => {
    let remaining = Math.min(1, fraction) * total;
    for (const { from, to, km } of segments) {
      if (km > 0 && remaining <= km) {
        const t = remaining / km;
        return [
          { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t },
        ];
      }
      remaining -= km;
    }
    return path.slice(-1);
  });
}
