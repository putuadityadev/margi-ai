/**
 * Query clean-up for free place names, done with plain rules and never with a model: a model that
 * "helpfully" adds a town is wrong often enough (SMA Negeri Bali Mandara is in Kubutambahan,
 * Buleleng, not Denpasar). Only spelling and well-known abbreviations are expanded; no region, town
 * or other fact is ever added to what the traveller typed.
 */

const FILLER = /^(?:ke|di|dekat|sekitar|menuju|ke daerah|ke arah)\s+/i;
const STOPWORDS = new Set(['di', 'ke', 'yang', 'dan', 'the', 'of', 'in', 'at', 'to', 'dekat']);

/** Lowercase, strip diacritics and punctuation. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Expands school, hospital and street abbreviations ("sma n 1" -> "SMA Negeri 1"). */
export function expandAbbreviations(text: string): string {
  return text
    .replace(/\b(sma|smp|smk|sd|tk|mts|mi)\s?n\b/gi, (_m, level: string) => `${level} Negeri`)
    .replace(/\b(sma|smp|smk|sd)\s?s\b(?=\s|$)/gi, (_m, level: string) => `${level} Swasta`)
    .replace(/\brsud\b/gi, 'RSUD')
    .replace(/\brs\b/gi, 'Rumah Sakit')
    .replace(/\bjln?\.?(?=\s)/gi, 'Jalan')
    .replace(/\bpkm\b/gi, 'Puskesmas')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The searches to try, best first: abbreviations expanded, then the traveller's own wording.
 * At most two, so a miss costs two provider calls and not more.
 */
export function queryVariants(raw: string): string[] {
  const cleaned = raw.replace(/\s+/g, ' ').replace(FILLER, '').trim();
  const expanded = expandAbbreviations(cleaned);
  return [...new Set([expanded, cleaned].filter((variant) => variant.length >= 2))];
}

/** Meaningful words of a text, with abbreviations expanded so "SMAN" and "SMA N" compare equal. */
export function tokensOf(text: string): string[] {
  return foldText(expandAbbreviations(text))
    .split(' ')
    .filter((token) => token.length > 0 && !STOPWORDS.has(token));
}

/**
 * How much of what the traveller typed a result covers (0-1). `nameScore` uses the place name
 * only; `fullScore` also counts the address, so "SMA Negeri Bali Mandara Buleleng" can match on
 * the regency without letting a weak name pass on the address alone.
 */
export function matchScore(
  query: string,
  name: string,
  address: string,
): { nameScore: number; fullScore: number } {
  const wanted = tokensOf(query);
  if (wanted.length === 0) return { nameScore: 0, fullScore: 0 };
  const inName = new Set(tokensOf(name));
  const inAll = new Set([...inName, ...tokensOf(address)]);
  const share = (pool: ReadonlySet<string>): number =>
    wanted.filter((token) => pool.has(token)).length / wanted.length;
  return { nameScore: share(inName), fullScore: share(inAll) };
}

/** Words that name a kind of place (or "nearest"), never one particular place. */
const GENERIC_WORDS = new Set([
  'warung',
  'makan',
  'makanan',
  'minum',
  'restoran',
  'restaurant',
  'rumah',
  'sakit',
  'cafe',
  'kafe',
  'kopi',
  'toko',
  'pasar',
  'hotel',
  'villa',
  'penginapan',
  'pantai',
  'pura',
  'sekolah',
  'kampus',
  'bandara',
  'masjid',
  'gereja',
  'atm',
  'spbu',
  'bensin',
  'toilet',
  'terdekat',
  'dekat',
  'sekitar',
  'sini',
  'situ',
  'nearby',
  'nearest',
  'near',
  'food',
  'local',
  'lokal',
]);

/**
 * True when a query only names a kind of place ("warung makan terdekat", "nearest restaurant"):
 * a map search for it would return some business that happens to carry those words as its name.
 */
export function isGenericQuery(query: string): boolean {
  const tokens = tokensOf(query);
  return tokens.length > 0 && tokens.every((token) => GENERIC_WORDS.has(token));
}
