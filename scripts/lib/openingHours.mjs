// Strict OSM `opening_hours` parser. It only accepts the common forms below and returns null for
// anything else, so a POI with an unusual value is rejected instead of being given guessed hours.
//   24/7 | [Days] HH:MM-HH:MM[,HH:MM-HH:MM] | [Days] off, joined with ";"
// where Days is a comma list of Mo..Su or ranges (Mo-Fr, Sa-Mo). Later rules override earlier ones
// for the days they name; days no rule names are closed.

const DAY_INDEX = { Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6 };
const DAY_PATTERN = '(?:Mo|Tu|We|Th|Fr|Sa|Su)';
const DAY_SPEC = `${DAY_PATTERN}(?:-${DAY_PATTERN})?(?:,${DAY_PATTERN}(?:-${DAY_PATTERN})?)*`;
const RANGE = String.raw`\d{1,2}:\d{2}-\d{1,2}:\d{2}`;
const RULE = new RegExp(String.raw`^(?:(${DAY_SPEC})\s+)?(off|closed|${RANGE}(?:,${RANGE})*)$`);
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const LAST_MINUTE = '23:59';

function expandDays(spec) {
  const days = [];
  for (const part of spec.split(',')) {
    const [from, to = from] = part.split('-');
    let day = DAY_INDEX[from];
    const end = DAY_INDEX[to];
    days.push(day);
    while (day !== end) {
      day = (day + 1) % 7;
      days.push(day);
    }
  }
  return days;
}

function clock(text, isEnd) {
  const [h, m] = text.split(':').map(Number);
  if (m > 59 || h > 24 || (h === 24 && (m !== 0 || !isEnd))) return null;
  if (h === 24) return LAST_MINUTE;
  return `${String(h).padStart(2, '0')}:${text.split(':')[1]}`;
}

function parseRanges(text) {
  const ranges = [];
  for (const range of text.split(',')) {
    const [rawStart, rawEnd] = range.split('-');
    const start = clock(rawStart, false);
    const end = clock(rawEnd, true);
    if (!start || !end || start === end) return null;
    ranges.push([start, end]);
  }
  ranges.sort((a, b) => a[0].localeCompare(b[0]));
  for (let i = 1; i < ranges.length; i += 1) {
    const previous = ranges[i - 1];
    if (previous[1] < previous[0] || previous[1] > ranges[i][0]) return null;
  }
  return ranges;
}

/**
 * @param {string} value raw OSM opening_hours tag
 * @returns {Record<string, [string, string][]> | null} catalogue openingHours ("0" = Monday) or null
 */
export function parseOpeningHours(value) {
  const text = value
    .trim()
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
  if (text === '24/7') {
    return Object.fromEntries(ALL_DAYS.map((day) => [String(day), [['00:00', LAST_MINUTE]]]));
  }
  const rules = text.split(/\s*;\s*/).filter(Boolean);
  if (rules.length === 0) return null;
  const byDay = new Map();
  for (const rule of rules) {
    const match = RULE.exec(rule);
    if (!match) return null;
    const days = match[1] ? expandDays(match[1]) : ALL_DAYS;
    const body = match[2];
    const ranges = body === 'off' || body === 'closed' ? [] : parseRanges(body);
    if (!ranges) return null;
    for (const day of days) {
      if (ranges.length === 0) byDay.delete(day);
      else byDay.set(day, ranges);
    }
  }
  if (byDay.size === 0) return null;
  const result = {};
  for (const day of ALL_DAYS) {
    const ranges = byDay.get(day);
    if (ranges) result[String(day)] = ranges.map(([a, b]) => [a, b]);
  }
  return result;
}
