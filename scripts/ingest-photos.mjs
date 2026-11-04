// Ingests Wikimedia Commons photos for catalogue places (docs/DATA-SOURCES.md §3).
// Usage: node scripts/ingest-photos.mjs [--force]
// A place keeps its cartographic plate unless a strictly matching, openly licensed photo is found.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = resolve(ROOT, 'packages/shared/data/catalog.json');
const PHOTO_DIR = resolve(ROOT, 'apps/web/public/places/photos');
const ATTRIBUTION_DOC = resolve(ROOT, 'docs/photo-attribution.md');
const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'MARGI-AI/1.0 (https://margiai.id; ops@margiai.id)';
const REQUEST_GAP_MS = 250;
const RETRY_BACKOFF_MS = 3000;
const REQUEST_TIMEOUT_MS = 30_000;
const MIN_WIDTH_PX = 1000;
const MAX_DISTANCE_KM = 5;
// Fictional or generic stalls and workshops have no Commons presence; matching them would mislabel real places.
const SKIPPED_CATEGORIES = new Set(['CULINARY', 'COFFEE', 'CRAFT']);
// Reviewed by hand: the best Commons match shows a person or an animal rather than the place.
const MANUAL_REJECTS = new Set([
  'pantai-pemuteran',
  'tulamben-liberty-wreck',
  'desa-tenganan',
  'pantai-kusamba',
]);
const FORCE = process.argv.includes('--force');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_LICENSES = [
  /^cc0/i,
  /^cc[ -]by[ -]\d/i,
  /^cc[ -]by-sa[ -]\d/i,
  /^public domain/i,
  /^pdm/i,
];
const REJECT_LICENSE = /\b(nc|nd)\b|gfdl|fair use|unknown/i;
const BAD_TITLE =
  /\b(map|peta|logo|diagram|plan|poster|flag|coat of arms|stamp|screenshot|icon)\b/i;
const STOPWORDS = new Set([
  'pura',
  'pantai',
  'beach',
  'temple',
  'air',
  'terjun',
  'waterfall',
  'waterfalls',
  'bali',
  'the',
  'of',
  'at',
  'and',
  'dan',
  'lake',
  'danau',
  'bukit',
  'hill',
  'desa',
  'village',
  'taman',
  'garden',
  'park',
  'monument',
  'monumen',
  'market',
  'pasar',
  'viewpoint',
  'titik',
  'pandang',
  'unesco',
  'sanctuary',
  'water',
  'palace',
  'cultural',
  'budaya',
  'bay',
  'rice',
  'terraces',
  'terrace',
  'terasering',
  'kebun',
  'raya',
  'national',
  'nasional',
  'barat',
  'west',
  'cave',
  'goa',
  'hot',
  'springs',
  'panas',
  'valley',
  'lembah',
  'crossing',
  'penyeberangan',
  'tree',
  'reservoir',
  'bendungan',
  'mother',
  'monastery',
  'vihara',
  'pavilion',
  'relief',
  'rock',
  'walk',
  'jalur',
  'sawah',
  'field',
  'secret',
  'black',
  'sand',
  'twin',
  'twins',
  'kembar',
  'agung',
  'penataran',
  'luhur',
  'ulun',
  'wreck',
  'bangkai',
  'kapal',
  'salt',
  'bat',
  'point',
  'wisata',
  'adat',
  'traditional',
  'sacred',
  'monkey',
  'forest',
  'wanara',
  'wana',
  'mandala',
  'suci',
  'wenara',
]);

const PLATE_BY_CATEGORY = {
  TEMPLE: 'temple',
  BEACH: 'beach',
  RICE_TERRACE: 'rice-terrace',
  LAKE: 'lake',
  WATERFALL: 'waterfall',
  VILLAGE: 'village',
  NATURE: 'nature',
  VIEWPOINT: 'viewpoint',
  FOREST: 'forest',
  STREET_CORRIDOR: 'street-corridor',
  COFFEE: 'coffee',
  CULINARY: 'culinary',
  CRAFT: 'craft',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequestAt = 0;

/** Sequential, rate-limited GET with one retry on 429/5xx/network errors. */
async function politeFetch(url, asBuffer = false) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.json();
      lastError = new Error(`HTTP ${res.status}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      lastError = err;
    }
    if (attempt === 0) await sleep(RETRY_BACKOFF_MS);
  }
  throw lastError;
}

const fold = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Distinctive name tokens; a candidate must contain all tokens of one name variant. */
function nameTokenSets(venue) {
  const sets = [];
  for (const raw of [venue.nameEn, venue.nameId, venue.slug.replace(/-/g, ' ')]) {
    const tokens = fold(raw.replace(/\(.*?\)/g, ' '))
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));
    if (tokens.length) sets.push([...new Set(tokens)]);
  }
  return sets;
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const COMMON_QUERY = {
  action: 'query',
  gsrnamespace: '6',
  prop: 'imageinfo|coordinates',
  iiprop: 'url|extmetadata|size|mime',
  iiurlwidth: '800',
  format: 'json',
};

async function queryPages(params) {
  const json = await politeFetch(`${API}?${new URLSearchParams(params)}`);
  return Object.values(json.query?.pages ?? {});
}

function searchByName(venue) {
  const name = venue.nameEn
    .replace(/\(.*?\)/g, '')
    .replace(/,.*$/, '')
    .trim();
  return queryPages({
    ...COMMON_QUERY,
    generator: 'search',
    gsrsearch: `${name} Bali`,
    gsrlimit: '20',
  });
}

function searchByGeo(venue) {
  return queryPages({
    ...COMMON_QUERY,
    generator: 'geosearch',
    ggscoord: `${venue.lat}|${venue.lng}`,
    ggsradius: '300',
    ggsnamespace: '6',
    ggslimit: '20',
  });
}

/** Returns an accepted candidate summary or null. Geosearch candidates are already within 300 m. */
function evaluate(page, venue, fromGeo) {
  const info = page.imageinfo?.[0];
  if (!info?.thumburl) return null;
  if (!ALLOWED_MIME.has(info.mime) || info.width < MIN_WIDTH_PX) return null;
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (!license || REJECT_LICENSE.test(license) || !ALLOWED_LICENSES.some((re) => re.test(license)))
    return null;
  const title = page.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '');
  if (BAD_TITLE.test(title)) return null;
  const haystack = fold(
    [
      title,
      stripHtml(meta.ObjectName?.value),
      stripHtml(meta.ImageDescription?.value),
      stripHtml(meta.Categories?.value),
    ].join(' '),
  );
  const tokens = new Set(haystack.split(/[^a-z0-9]+/));
  const sets = nameTokenSets(venue);
  if (!sets.some((set) => set.every((t) => tokens.has(t)))) return null;
  const coord = page.coordinates?.[0];
  const near = coord
    ? haversineKm(venue.lat, venue.lng, coord.lat, coord.lon) <= MAX_DISTANCE_KM
    : null;
  if (near === false) return null;
  if (!(fromGeo || near === true || tokens.has('bali'))) return null;
  const artist = stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value);
  if (!artist) return null;
  const titleTokens = new Set(fold(title).split(/[^a-z0-9]+/));
  const inTitle = sets.some((set) => set.every((t) => titleTokens.has(t))) ? 2 : 0;
  return {
    score:
      (info.width >= info.height ? 1 : 0) +
      inTitle +
      (near === true ? 1 : 0) +
      Math.min(info.width, 4000) / 8000,
    title: page.title,
    thumburl: info.thumburl,
    mime: info.thumbmime ?? info.mime,
    sourceUrl: info.descriptionurl,
    artist,
    license,
    licenseUrl: stripHtml(meta.LicenseUrl?.value) || null,
  };
}

const extFor = (mime) => (mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg');

async function findPhoto(venue) {
  const accepted = [];
  for (const [source, fromGeo] of [
    [searchByName, false],
    [searchByGeo, true],
  ]) {
    try {
      for (const page of await source(venue)) {
        const candidate = evaluate(page, venue, fromGeo);
        if (candidate) accepted.push(candidate);
      }
    } catch (err) {
      console.warn(`  ${venue.slug}: ${fromGeo ? 'geosearch' : 'search'} failed (${err.message})`);
    }
  }
  accepted.sort((a, b) => b.score - a.score);
  return accepted[0] ?? null;
}

/** Rebuilds the venue so new fields sit right after imageCredit and key order stays stable. */
function withPhoto(venue, fields) {
  const out = {};
  for (const [key, value] of Object.entries(venue)) {
    if (key === 'imageSourceUrl' || key === 'imageLicenseUrl') continue;
    out[key] = key === 'imageUrl' ? fields.imageUrl : value;
    if (key === 'imageCredit') {
      out.imageCredit = fields.imageCredit;
      if (fields.imageSourceUrl) out.imageSourceUrl = fields.imageSourceUrl;
      if (fields.imageLicenseUrl) out.imageLicenseUrl = fields.imageLicenseUrl;
    }
  }
  return out;
}

const isPhoto = (v) => v.imageUrl?.startsWith('/places/photos/');

async function main() {
  mkdirSync(PHOTO_DIR, { recursive: true });
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));

  for (const place of catalog.places) {
    const v = place.venue;
    const photoFile = (ext) => resolve(PHOTO_DIR, `${v.slug}.${ext}`);
    if (!FORCE && isPhoto(v) && ['jpg', 'png', 'webp'].some((e) => existsSync(photoFile(e))))
      continue;

    const hit =
      SKIPPED_CATEGORIES.has(v.category) || MANUAL_REJECTS.has(v.slug) ? null : await findPhoto(v);
    if (!hit) {
      // A wrong or unverifiable hotspot image is worse than none: fall back to the category plate.
      if (v.isHotspot || v.slug === 'tanah-lot') {
        place.venue = withPhoto(v, {
          imageUrl: `/places/${PLATE_BY_CATEGORY[v.category]}.svg`,
          imageCredit: null,
        });
      }
      console.log(`- ${v.slug}: no verified photo`);
      continue;
    }
    try {
      const ext = extFor(hit.mime);
      writeFileSync(photoFile(ext), await politeFetch(hit.thumburl, true));
      place.venue = withPhoto(v, {
        imageUrl: `/places/photos/${v.slug}.${ext}`,
        imageCredit: `${hit.artist} / ${hit.license} / Wikimedia Commons`,
        imageSourceUrl: hit.sourceUrl,
        imageLicenseUrl: hit.licenseUrl,
      });
      console.log(`+ ${v.slug}: ${hit.title} (${hit.license})`);
    } catch (err) {
      console.warn(`  ${v.slug}: download failed (${err.message})`);
    }
  }

  writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  const venues = catalog.places.map((p) => p.venue);
  writeAttributionDoc(venues);
  console.log(`\nmatch rate: ${venues.filter(isPhoto).length}/${venues.length}`);
}

function writeAttributionDoc(venues) {
  const photos = venues.filter(isPhoto);
  const missing = venues.filter((v) => !isPhoto(v));
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const rows = photos.map((v) => {
    const [artist, license] = v.imageCredit.split(' / ');
    const lic = v.imageLicenseUrl ? `[${esc(license)}](${v.imageLicenseUrl})` : esc(license);
    return `| ${esc(v.nameEn)} | \`${v.imageUrl.replace('/places/photos/', '')}\` | ${esc(artist)} | ${lic} | [Commons](${v.imageSourceUrl}) |`;
  });
  const doc = [
    '# Photo attribution',
    '',
    'Photos below come from Wikimedia Commons under open licences and are rehosted as 800 px thumbnails in `apps/web/public/places/photos/`.',
    'Generated by `scripts/ingest-photos.mjs`; do not edit by hand.',
    '',
    `Coverage: ${photos.length} of ${venues.length} places (${Math.round((photos.length / venues.length) * 100)}%).`,
    '',
    '| Place | File | Author | Licence | Source |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...rows,
    '',
    '## Places without a verified photo',
    '',
    'These show their cartographic plate (or a legacy illustration) and no photo credit.',
    '',
    ...missing.map((v) => `- ${v.nameEn} (\`${v.slug}\`)`),
    '',
  ].join('\n');
  writeFileSync(ATTRIBUTION_DOC, doc);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
