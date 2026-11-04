// Shared helpers for the OpenStreetMap scripts: a polite Overpass/Nominatim client and geometry.
import { setTimeout as sleep } from 'node:timers/promises';

export const USER_AGENT = 'MARGI-AI/1.0 (https://margiai.id; ops@margiai.id)';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_TIMEOUT_MS = 60_000;
const OVERPASS_GAP_MS = 1_500;
const NOMINATIM_GAP_MS = 1_100;
const RETRY_BACKOFF_MS = 5_000;

let lastRequestAt = 0;

/** Waits so that consecutive requests are at least `gapMs` apart; callers are strictly sequential. */
async function pace(gapMs) {
  const wait = lastRequestAt + gapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function request(url, init, gapMs, timeoutMs = REQUEST_TIMEOUT_MS) {
  await pace(gapMs);
  const response = await fetch(url, {
    ...init,
    headers: { 'user-agent': USER_AGENT, ...init.headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

/** Runs an Overpass QL query: one retry with backoff per endpoint, then each mirror. */
export async function overpass(query, timeoutMs = REQUEST_TIMEOUT_MS) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await request(
          endpoint,
          {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
          },
          OVERPASS_GAP_MS,
          timeoutMs,
        );
      } catch (error) {
        lastError = error;
        if (attempt === 1) await sleep(RETRY_BACKOFF_MS);
      }
    }
  }
  throw new Error(`Overpass failed: ${String(lastError)}`);
}

/** Nominatim free-text search (at most one request per 1.1 s). Returns jsonv2 rows with geometry hints. */
export async function nominatim(q, extra = {}) {
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '3',
    countrycodes: 'id',
    namedetails: '1',
    ...extra,
  });
  return request(`${NOMINATIM_URL}?${params}`, { method: 'GET', headers: {} }, NOMINATIM_GAP_MS);
}

/** Great-circle distance in metres between two WGS84 points. */
export function haversineMeters(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}
