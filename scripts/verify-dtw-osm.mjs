// Checks every curated destination (kind "DTW") against OpenStreetMap via Nominatim, corrects
// coordinates that drift more than 300 m from a confident match, and writes
// docs/data-verification.md (D-031). Run from the repo root: node scripts/verify-dtw-osm.mjs
// Rules: a match needs the place's distinctive name tokens, a destination-like OSM class and a
// position inside Bali; never move a pin by more than 5 km or onto a feature larger than 2 km.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { haversineMeters, nominatim } from './lib/osm.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const CATALOG_PATH = resolve(ROOT, 'packages/shared/data/catalog.json');
const REPORT_PATH = resolve(ROOT, 'docs/data-verification.md');

const DRIFT_CORRECT_M = 300;
const DRIFT_MANUAL_REVIEW_M = 5_000;
const LARGE_FEATURE_M = 2_000;
const BIAS_BOX_DEG = 0.06;
const BALI_BOUNDS = { minLat: -8.95, maxLat: -8.0, minLng: 114.4, maxLng: 115.75 };
const COORD_DECIMALS = 5;

const GENERIC_TOKENS = new Set([
  'pura',
  'pantai',
  'beach',
  'temple',
  'waterfall',
  'waterfalls',
  'air',
  'terjun',
  'lake',
  'danau',
  'the',
  'of',
  'at',
  'and',
  'village',
  'desa',
  'market',
  'pasar',
  'bay',
  'viewpoint',
  'monument',
  'monumen',
  'forest',
  'national',
  'park',
  'garden',
  'sanctuary',
  'rice',
  'terrace',
  'terraces',
  'unesco',
  'twin',
  'secret',
  'walk',
  'field',
  'valley',
  'lembah',
  'taman',
  'bukit',
  'kebun',
  'raya',
  'cekik',
  'hot',
  'springs',
  'panas',
  'relief',
  'cave',
  'bat',
  'salt',
  'water',
  'palace',
  'mother',
  'crossing',
  'wreck',
  'tree',
  'reservoir',
  'bendungan',
  'monastery',
  'cultural',
  'pavilion',
  'sacred',
  'art',
  'traditional',
  'black',
  'sand',
  'green',
  'bowl',
  'white',
  'virgin',
  'pasir',
  'putih',
  'west',
  'barat',
  'bali',
  'botanic',
  'elephant',
  'gate',
]);
const ACCEPTED_CLASSES = new Set([
  'tourism',
  'natural',
  'historic',
  'leisure',
  'waterway',
  'place',
  'man_made',
  'boundary',
  'amenity',
  'landuse',
]);
const REJECTED_TYPES = new Set([
  'hotel',
  'guest_house',
  'apartment',
  'hostel',
  'villa',
  'resort',
  'restaurant',
  'cafe',
  'fast_food',
  'bar',
  'bank',
  'atm',
  'parking',
  'school',
  'fuel',
  'residential',
  'house',
  'chalet',
  'motel',
  'bus_stop',
  'toilets',
]);

function nameTokens(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Distinctive tokens of the name before any comma ("Dream Beach, Nusa Lembongan" -> dream). */
function distinctiveTokens(nameEn) {
  const core = nameEn.split(',')[0] ?? nameEn;
  return nameTokens(core).filter((t) => t.length >= 3 && !GENERIC_TOKENS.has(t));
}

function inBali(point) {
  return (
    point.lat >= BALI_BOUNDS.minLat &&
    point.lat <= BALI_BOUNDS.maxLat &&
    point.lng >= BALI_BOUNDS.minLng &&
    point.lng <= BALI_BOUNDS.maxLng
  );
}

function toCandidate(row) {
  const [south, north, west, east] = (row.boundingbox ?? []).map(Number);
  const extentM = Number.isFinite(south)
    ? haversineMeters({ lat: south, lng: west }, { lat: north, lng: east })
    : 0;
  const names = [
    row.name,
    ...Object.values(row.namedetails ?? {}),
    ...row.display_name.split(',').slice(0, 2),
  ].filter(Boolean);
  return {
    name: row.name || row.display_name.split(',')[0],
    names,
    osmType: row.osm_type,
    osmId: row.osm_id,
    klass: row.category,
    type: row.type,
    lat: Number(row.lat),
    lng: Number(row.lon),
    extentM,
  };
}

// A mountain node is not the temple, beach or terrace that shares its name.
const SUMMIT_TYPES = new Set(['peak', 'volcano']);
const SUMMIT_OK_CATEGORIES = new Set(['VIEWPOINT', 'NATURE', 'FOREST']);

function isConfident(candidate, tokens, category) {
  if (!ACCEPTED_CLASSES.has(candidate.klass) || REJECTED_TYPES.has(candidate.type)) return false;
  if (SUMMIT_TYPES.has(candidate.type) && !SUMMIT_OK_CATEGORIES.has(category)) return false;
  if (!inBali(candidate)) return false;
  const have = new Set(candidate.names.flatMap(nameTokens));
  const hits = tokens.filter((t) => have.has(t)).length;
  return tokens.length > 0 && hits === tokens.length;
}

async function findMatch(venue) {
  const tokens = distinctiveTokens(venue.nameEn);
  if (tokens.length === 0) return { tokens, match: null, note: 'name has no distinctive token' };
  const core = (venue.nameEn.split(',')[0] ?? venue.nameEn).trim();
  const viewbox = [
    venue.lng - BIAS_BOX_DEG,
    venue.lat + BIAS_BOX_DEG,
    venue.lng + BIAS_BOX_DEG,
    venue.lat - BIAS_BOX_DEG,
  ].join(',');
  const searches = [
    `${core}, Bali&viewbox=${viewbox}&bounded=1`,
    `${tokens.join(' ')}, Bali&viewbox=${viewbox}&bounded=1`,
    `${core}, Bali`,
  ];
  for (const query of searches) {
    const [q, ...extra] = query.split('&');
    const rows = await nominatim(q, Object.fromEntries(extra.map((e) => e.split('='))));
    const confident = rows
      .map(toCandidate)
      .filter((candidate) => isConfident(candidate, tokens, venue.category))
      .sort((a, b) => haversineMeters(venue, a) - haversineMeters(venue, b));
    if (confident[0]) return { tokens, match: confident[0], note: '' };
  }
  return { tokens, match: null, note: 'no confident OSM match' };
}

function osmLink(match) {
  return `https://www.openstreetmap.org/${match.osmType}/${match.osmId}`;
}

function decide(venue, match) {
  const drift = Math.round(haversineMeters(venue, match));
  if (drift <= DRIFT_CORRECT_M) return { drift, action: 'kept (within 300 m)' };
  if (drift > DRIFT_MANUAL_REVIEW_M) return { drift, action: 'manual review (drift over 5 km)' };
  if (match.extentM > LARGE_FEATURE_M) {
    return { drift, action: 'kept (matched feature larger than 2 km)' };
  }
  return { drift, action: 'corrected', corrected: true };
}

function writeReport(rows, unverified) {
  const fmt = (v) => `${v.lat}, ${v.lng}`;
  const table = rows
    .map(
      (r) =>
        `| ${r.venue.nameEn} | ${r.oldCoord} | [${r.match.name}](${osmLink(r.match)}) (${r.match.klass}=${r.match.type}) | ${fmt(r.match)} | ${r.drift} | ${r.action} |`,
    )
    .join('\n');
  const list = unverified.map((v) => `- ${v.nameEn} (\`${v.slug}\`): ${v.reason}`).join('\n');
  const corrected = rows.filter((r) => r.corrected).length;
  writeFileSync(
    REPORT_PATH,
    `# Destination coordinate verification

Each curated destination was searched on OpenStreetMap (Nominatim, data (c) OpenStreetMap
contributors, ODbL). A match needs the place's distinctive name tokens, a destination-like OSM
class and a position inside Bali. Pins move only when a confident match is more than 300 m away,
at most 5 km away, and not a feature larger than 2 km; farther matches go to manual review.
Generated by \`scripts/verify-dtw-osm.mjs\`.

Verified against OSM: ${rows.length}. Corrected: ${corrected}. Unverified: ${unverified.length}.

## Matched destinations

| Destination | Catalogue coordinate (old) | OSM match | OSM coordinate | Drift (m) | Action |
| --- | --- | --- | --- | --- | --- |
${table}

## Unverified (coordinate left as curated)

These could not be matched confidently on OSM. Their coordinates are not verified.

${list}
`,
  );
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  const rows = [];
  const unverified = [];
  for (const place of catalog.places) {
    const { venue } = place;
    if (venue.kind !== 'DTW') continue;
    let result;
    try {
      result = await findMatch(venue);
    } catch (error) {
      unverified.push({ ...venue, reason: `lookup failed: ${String(error)}` });
      continue;
    }
    if (!result.match) {
      unverified.push({ ...venue, reason: result.note });
      console.log(`unverified ${venue.slug}`);
      continue;
    }
    const decision = decide(venue, result.match);
    const row = {
      venue,
      match: result.match,
      oldCoord: `${venue.lat}, ${venue.lng}`,
      ...decision,
    };
    if (decision.corrected) {
      venue.lat = Number(result.match.lat.toFixed(COORD_DECIMALS));
      venue.lng = Number(result.match.lng.toFixed(COORD_DECIMALS));
    }
    rows.push(row);
    console.log(`${venue.slug}: ${decision.drift} m ${decision.action}`);
  }
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  writeReport(rows, unverified);
  console.log(
    `matched ${rows.length}, corrected ${rows.filter((r) => r.corrected).length}, unverified ${unverified.length}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
