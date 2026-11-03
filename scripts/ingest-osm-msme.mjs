// Replaces every MSME in packages/shared/data/catalog.json with real OpenStreetMap businesses
// found near the curated destinations (D-031). Run from the repo root: node scripts/ingest-osm-msme.mjs
// Only POIs with a `name` AND a fully parseable `opening_hours` are kept; nothing is guessed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { haversineMeters, overpass } from './lib/osm.mjs';
import { parseOpeningHours } from './lib/openingHours.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'packages/shared/data/catalog.json');
const ATTRIBUTION_PATH = resolve(ROOT, 'docs/osm-attribution.md');

const SEARCH_RADIUS_M = 3_000;
const PER_DTW_LIMIT = 3;
const MIN_SEPARATION_M = 150;
const OVERALL_CAP = 60;
const BUFFER_ZONE_REGENCIES = new Set([
  'tabanan',
  'buleleng',
  'karangasem',
  'bangli',
  'klungkung',
  'jembrana',
]);
const LIFECYCLE_PREFIXES = ['disused', 'abandoned', 'razed', 'demolished', 'was', 'removed'];

// Model parameters (not facts about a place): the per-category medians of the 37 entries this
// import replaces, so planning behaviour stays comparable.
const CATEGORY_MODEL = {
  COFFEE: {
    plate: '/places/coffee.svg',
    vibe: ['CULINARY'],
    crowd: { peakHour: 10, peakBusyness: 30, baseBusyness: 4 },
    avgDwellMinutes: 40,
    typicalPeakQueueMinutes: 5,
    priceLevel: 1,
    wordEn: 'Cafe',
    wordId: 'Kafe',
  },
  CULINARY: {
    plate: '/places/culinary.svg',
    vibe: ['CULINARY'],
    crowd: { peakHour: 12, peakBusyness: 45, baseBusyness: 5 },
    avgDwellMinutes: 40,
    typicalPeakQueueMinutes: 5,
    priceLevel: 1,
    wordEn: 'Restaurant',
    wordId: 'Restoran',
  },
  CRAFT: {
    plate: '/places/craft.svg',
    vibe: ['HERITAGE'],
    crowd: { peakHour: 11, peakBusyness: 30, baseBusyness: 3 },
    avgDwellMinutes: 40,
    typicalPeakQueueMinutes: 0,
    priceLevel: 2,
    wordEn: 'Craft shop',
    wordId: 'Toko kerajinan',
  },
};

// One request for all of Bali: the public servers are overloaded, and the opening_hours filter
// keeps the answer small. The raw answer is cached so parser fixes never re-hit Overpass.
const BALI_BBOX = '-8.95,114.40,-8.04,115.73';
const BULK_TIMEOUT_MS = 200_000;
const BULK_QUERY = `[out:json][timeout:180];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food)$"]["name"]["opening_hours"](${BALI_BBOX});
  nwr["shop"~"^(coffee|bakery|craft|art|gift)$"]["name"]["opening_hours"](${BALI_BBOX});
  nwr["craft"]["name"]["opening_hours"](${BALI_BBOX});
);
out center tags;`;
const CACHE_FILE = resolve(ROOT, '.state/osm-bali-msme.json');

function categoryOf(tags) {
  if (tags.amenity === 'cafe' || tags.shop === 'coffee' || tags.shop === 'bakery') return 'COFFEE';
  if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food') return 'CULINARY';
  if (tags.craft || ['craft', 'art', 'gift'].includes(tags.shop)) return 'CRAFT';
  return null;
}

function isDefunct(tags) {
  return Object.keys(tags).some((key) =>
    LIFECYCLE_PREFIXES.some((prefix) => key === prefix || key.startsWith(`${prefix}:`)),
  );
}

/** Tags that make a record more likely to be a real, maintained business. */
function isComplete(tags) {
  return Object.keys(tags).some(
    (key) =>
      ['cuisine', 'website', 'contact:website', 'phone', 'contact:phone'].includes(key) ||
      key.startsWith('addr:'),
  );
}

function osmUuid(type, id) {
  const bytes = createHash('sha1').update(`osm:${type}/${id}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function kebab(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

function nearest(point, list) {
  let best = null;
  for (const item of list) {
    const meters = haversineMeters(point, item);
    if (!best || meters < best.meters) best = { item, meters };
  }
  return best;
}

async function loadBaliElements() {
  if (existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  const body = await overpass(BULK_QUERY, BULK_TIMEOUT_MS);
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(body));
  return body;
}

/** Qualifying POIs within the search radius of a destination, best candidates first. */
function candidatesNear(dtw, elements) {
  const candidates = [];
  for (const element of elements) {
    const tags = element.tags ?? {};
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat === undefined || lng === undefined) continue;
    const meters = haversineMeters(dtw, { lat, lng });
    if (meters > SEARCH_RADIUS_M) continue;
    const category = categoryOf(tags);
    const hours = parseOpeningHours(tags.opening_hours ?? '');
    if (!category || !hours || isDefunct(tags) || !tags.name?.trim()) continue;
    candidates.push({
      type: element.type,
      id: element.id,
      tags,
      category,
      hours,
      lat,
      lng,
      meters,
      complete: isComplete(tags),
    });
  }
  // Complete records first, then nearest: more tags means more likely a real, active business.
  return candidates.sort((a, b) => Number(b.complete) - Number(a.complete) || a.meters - b.meters);
}

/** First candidate that is not already taken and is far enough from everything taken. */
function pickOne(candidates, taken) {
  return candidates.find(
    (candidate) =>
      !taken.some(
        (other) =>
          (other.type === candidate.type && other.id === candidate.id) ||
          haversineMeters(other, candidate) < MIN_SEPARATION_M,
      ),
  );
}

function describe(candidate, dtw) {
  const model = CATEGORY_MODEL[candidate.category];
  const cuisine = candidate.tags.cuisine
    ?.split(';')
    .map((c) => c.trim().replaceAll('_', ' '))
    .join(', ');
  return {
    en: `${model.wordEn} near ${dtw.nameEn}.${cuisine ? ` Serves ${cuisine}.` : ''}`,
    id: `${model.wordId} dekat ${dtw.nameId}.${cuisine ? ` Menyajikan ${cuisine}.` : ''}`,
  };
}

function buildPlace(candidate, dtw, areas) {
  const model = CATEGORY_MODEL[candidate.category];
  const regencyId = nearest(candidate, areas).item.regencyId;
  const description = describe(candidate, dtw);
  const name = candidate.tags.name.trim();
  return {
    venue: {
      id: osmUuid(candidate.type, candidate.id),
      slug: `${kebab(name)}-${candidate.type[0]}${candidate.id}`,
      kind: 'MSME',
      category: candidate.category,
      nameEn: name,
      nameId: name,
      descriptionEn: description.en,
      descriptionId: description.id,
      regencyId,
      lat: candidate.lat,
      lng: candidate.lng,
      imageUrl: model.plate,
      imageCredit: null,
      priceLevel: model.priceLevel,
      isHotspot: false,
      isBufferZone: BUFFER_ZONE_REGENCIES.has(regencyId),
      openingHours: candidate.hours,
      typicalPeakQueueMinutes: model.typicalPeakQueueMinutes,
      avgDwellMinutes: model.avgDwellMinutes,
      etiquetteTags: [],
      source: 'openstreetmap',
      sourceUrl: `https://www.openstreetmap.org/${candidate.type}/${candidate.id}`,
    },
    vibeTags: model.vibe,
    crowd: { ...model.crowd },
  };
}

function writeAttribution(places, openingHoursByVenue) {
  const rows = places
    .map(
      (p) =>
        `| ${p.venue.nameEn.replaceAll('|', '/')} | ${p.venue.category} | ${p.venue.sourceUrl} | \`${openingHoursByVenue.get(p.venue.id)}\` |`,
    )
    .join('\n');
  const text = `# OpenStreetMap attribution

The businesses in the MARGI AI place catalogue marked \`kind: "MSME"\` come from OpenStreetMap.

Data (c) OpenStreetMap contributors, available under the Open Database Licence (ODbL):
https://www.openstreetmap.org/copyright

Each place carries \`source: "openstreetmap"\` and a \`sourceUrl\` pointing at its OSM object. Names,
coordinates and opening hours are taken verbatim from OSM; descriptions are templated from OSM tags
only. Generated by \`scripts/ingest-osm-msme.mjs\`; do not edit by hand.

## Imported places (${places.length})

| Name | Category | OSM object | opening_hours (OSM) |
| --- | --- | --- | --- |
${rows}
`;
  writeFileSync(ATTRIBUTION_PATH, text);
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  const dtws = catalog.places.filter((p) => p.venue.kind === 'DTW').map((p) => p.venue);

  const { elements } = await loadBaliElements();
  console.log(`${elements.length} OSM elements with name and opening_hours`);
  const perDtw = dtws.map((dtw) => ({ dtw, picks: [], candidates: candidatesNear(dtw, elements) }));
  const rawHours = new Map();

  // Round-robin by rank so the overall cap spreads across destinations instead of favouring the first ones.
  const taken = [];
  for (let rank = 0; rank < PER_DTW_LIMIT; rank += 1) {
    for (const entry of perDtw) {
      if (taken.length >= OVERALL_CAP) break;
      if (entry.picks.length !== rank) continue;
      const next = pickOne(entry.candidates, taken);
      if (!next) continue;
      entry.picks.push(next);
      taken.push(next);
    }
  }

  const places = [];
  for (const { dtw, picks } of perDtw) {
    for (const pick of picks) {
      const place = buildPlace(pick, dtw, catalog.areas);
      rawHours.set(place.venue.id, pick.tags.opening_hours.replaceAll('|', '/'));
      places.push(place);
    }
  }

  catalog.places = [...catalog.places.filter((p) => p.venue.kind !== 'MSME'), ...places];
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  writeAttribution(places, rawHours);

  const byCategory = {};
  for (const p of places) byCategory[p.venue.category] = (byCategory[p.venue.category] ?? 0) + 1;
  console.log(`imported ${places.length} MSMEs`, byCategory);
  console.log(
    'destinations without any:',
    perDtw
      .filter((e) => e.picks.length === 0)
      .map((e) => e.dtw.slug)
      .join(', ') || 'none',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
