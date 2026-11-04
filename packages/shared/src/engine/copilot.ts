import {
  applyTripChange,
  CFS_WEIGHTS,
  CopilotReplySchema,
  RANK_WEIGHTS,
  THRESHOLDS,
  toWita,
  type CopilotIntent,
  type CopilotReply,
  type CopilotRequest,
  type CopilotTraceStep,
  type Corridor,
  type NearbyPlace,
  type TripPlan,
  type TripStop,
  type TripSuggestion,
} from '../index';
import { getCatalog } from './catalog';
import {
  activeCorridorsAt,
  busiestDtwStop,
  DEPARTURE_SCAN_MIN,
  evaluateTrip,
  frictionBreakdownOf,
  GOLDEN_HOUR_WITA,
  isRecipientRegency,
  minutesUntilWindowEnds,
  REORDER_MINUTES_WEIGHT,
  reorderObjective,
  roadMinutesOf,
  suggestFor,
  swapRankOf,
  type TripContext,
} from './trip';

type Locale = CopilotRequest['locale'];

const MAX_SENTENCES = 3;
const MAX_TEXT_CHARS = 700;
const MAX_QUICK_REPLIES = 4;
const TRACE_LABEL_MAX_CHARS = 80;
const TRACE_DETAIL_MAX_CHARS = 200;

interface IntentRule {
  readonly intent: CopilotIntent;
  readonly pattern: RegExp;
}

/**
 * Ordered keyword rules; the first match wins, so the most specific intents come first.
 * "jam" alone is deliberately absent: in Indonesian it means "hour" ("jam berapa"),
 * so only unambiguous traffic words map to STUCK_IN_TRAFFIC. Strong "why" words beat
 * QUIETER ("kenapa ramai" asks for an explanation); weak "how" words come last.
 */
const INTENT_RULES: readonly IntentRule[] = [
  {
    intent: 'STUCK_IN_TRAFFIC',
    pattern: /\b(macet|kejebak|terjebak|stuck|traffic|gridlock|padat merayap)/,
  },
  {
    intent: 'BEST_TIME',
    pattern: /\b(jam berapa|kapan|waktu|best time|when|what time|berangkat|depart)/,
  },
  { intent: 'SUNSET', pattern: /\b(sunset|senja|matahari terbenam|golden)/ },
  {
    intent: 'ADD_FOOD',
    pattern:
      /\b(makan|warung|kuliner|kopi|lapar|sarapan|food|eat\b|coffee|lunch|breakfast|dinner|hungry)/,
  },
  { intent: 'EXPLAIN', pattern: /\b(kenapa|mengapa|why|explain|jelaskan)\b/ },
  { intent: 'QUIETER', pattern: /\b(sepi|tenang|quiet|calm|less crowd|crowded|ramai|busy)/ },
  { intent: 'REVIEW_PLAN', pattern: /\b(rencana|itinerary|plan|cek|check|review|atur)/ },
  { intent: 'EXPLAIN', pattern: /\b(how|bagaimana)\b/ },
  { intent: 'GREETING', pattern: /\b(halo|hai|hi|hello|hey|pagi|siang|selamat)\b/ },
];

interface IntentMatch {
  readonly intent: CopilotIntent;
  readonly keyword: string | null;
}

function normalizeMessage(message: string): string {
  return message.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matchIntent(message: string | undefined): IntentMatch | null {
  const text = normalizeMessage(message ?? '');
  if (!text) return null;
  for (const rule of INTENT_RULES) {
    const match = rule.pattern.exec(text);
    if (match) return { intent: rule.intent, keyword: match[1] ?? match[0] };
  }
  return { intent: 'UNKNOWN', keyword: null };
}

/**
 * Keyword intent detection for Indonesian and English, case and diacritic insensitive.
 * @returns null when there is no message, UNKNOWN when nothing matches.
 */
export function detectIntent(message: string | undefined): CopilotIntent | null {
  return matchIntent(message)?.intent ?? null;
}

interface ResolvedIntent {
  readonly intent: CopilotIntent;
  /** Why this intent was chosen, shown in the trace. */
  readonly basis: string;
}

function resolveIntent(req: CopilotRequest): ResolvedIntent {
  if (req.intent) return { intent: req.intent, basis: 'quick reply' };
  const match = matchIntent(req.message);
  if (match) {
    const basis = match.keyword ? `keyword "${match.keyword}"` : 'no keyword matched';
    return { intent: match.intent, basis };
  }
  const bySituation: Record<CopilotRequest['situation'], CopilotIntent> = {
    STUCK_IN_TRAFFIC: 'STUCK_IN_TRAFFIC',
    HAS_PLAN: 'REVIEW_PLAN',
    PLAN: 'GREETING',
  };
  return { intent: bySituation[req.situation], basis: `situation ${req.situation}` };
}

/** Facts computed once per reply and shared by the text and the trace. */
interface ReplyFacts {
  readonly locale: Locale;
  readonly intent: CopilotIntent;
  readonly ctx: TripContext;
  readonly plan: TripPlan;
  readonly busiest: { readonly index: number; readonly stop: TripStop } | null;
  readonly suggestions: readonly TripSuggestion[];
  readonly top: TripSuggestion | null;
  /** Full plan after applying `top`, for arrival times and per-stop readings. */
  readonly topPlan: TripPlan | null;
  readonly jam: { readonly corridor: Corridor; readonly endsAt: string } | null;
}

/** Indonesian writes clock times with a dot (09.30); English keeps the colon. */
function localizeClock(text: string, locale: Locale): string {
  return locale === 'id' ? text.replace(/\b(\d{2}):(\d{2})\b/g, '$1.$2') : text;
}

function hhmm(iso: string): string {
  return toWita(iso).toFormat('HH:mm');
}

/** Indonesian writes decimals with a comma (0,3 km). */
function formatKm(km: number, locale: Locale): string {
  const text = String(km);
  return locale === 'id' ? text.replace('.', ',') : text;
}

function nameOf(place: NearbyPlace, locale: Locale): string {
  return locale === 'id' ? place.venue.nameId : place.venue.nameEn;
}

function corridorName(corridor: Corridor, locale: Locale): string {
  return locale === 'id' ? corridor.nameId : corridor.nameEn;
}

function regencyName(regencyId: string, locale: Locale): string {
  const regency = getCatalog().regencies.find((candidate) => candidate.id === regencyId);
  if (!regency) return regencyId;
  return locale === 'id' ? regency.nameId : regency.nameEn;
}

function businessKind(place: NearbyPlace, locale: Locale): string {
  const kinds: Record<string, { en: string; id: string }> = {
    CULINARY: { en: 'warung', id: 'warung' },
    COFFEE: { en: 'coffee stall', id: 'kedai kopi' },
    CRAFT: { en: 'craft workshop', id: 'perajin' },
  };
  const kind = kinds[place.venue.category] ?? { en: 'local business', id: 'usaha lokal' };
  return kind[locale];
}

function introducedIndex(suggestion: TripSuggestion): number | null {
  const { change } = suggestion;
  if (change.kind === 'ADD_STOP') return change.atIndex;
  if (change.kind === 'SWAP_STOP') return change.stopIndex;
  return null;
}

function gatherFacts(req: CopilotRequest, intent: CopilotIntent, ctx: TripContext): ReplyFacts {
  const plan = evaluateTrip(req.trip, ctx);
  const suggestions = suggestFor(intent, req.trip, ctx);
  const top = suggestions[0] ?? null;
  const departAt = toWita(req.trip.departAt);
  const corridor = activeCorridorsAt(req.trip.origin, departAt)[0];
  const endsAt = corridor
    ? departAt.plus({ minutes: minutesUntilWindowEnds(corridor, departAt) }).toFormat('HH:mm')
    : '';
  return {
    locale: req.locale,
    intent,
    ctx,
    plan,
    busiest: busiestDtwStop(plan),
    suggestions,
    top,
    topPlan: top ? evaluateTrip(applyTripChange(req.trip, top.change), ctx) : null,
    jam: corridor ? { corridor, endsAt } : null,
  };
}

/** Bilingual sentence catalogue. Every number arrives pre-computed; no sentence invents one. */
interface Phrases {
  forecastAt(name: string, pct: number, time: string): string;
  shift(time: string, stopPct: number, before: number, after: number): string;
  gridlockShift(minutes: number, time: string, gain: string): string;
  swap(name: string, pct: number, time: string): string;
  reorder(before: number, after: number, minutesSaved: number): string;
  closedFix(name: string, arrival: string, time: string, exposure: number): string;
  food(name: string, kind: string, km: string, from: string, dwell: number): string;
  foodCount(count: number): string;
  foodNone(): string;
  wait(name: string, kind: string, km: string, dwell: number, gain: string): string;
  crowdGain(before: number, after: number): string;
  delayGain(minutes: number): string;
  recipient(regency: string): string;
  sunsetStop(name: string, pct: number, time: string): string;
  sunsetShift(time: string, name: string, arrival: string): string;
  sunsetNone(): string;
  stuck(corridor: string, endsAt: string, delay: number): string;
  notStuck(time: string): string;
  calm(exposure: number): string;
  noBetter(): string;
  bestTimeNone(time: string, exposure: number): string;
  explainFormula(): string;
  explainStop(name: string, bEff: number, fPlus2: number, penalty: number, score: number): string;
  forecastNote(): string;
  greeting(stops: number, exposure: number): string;
  unknown(exposure: number): string;
}

const PHRASES: Readonly<Record<Locale, Phrases>> = {
  en: {
    forecastAt: (name, pct, time) =>
      `${name} is forecast at ${pct}% busy when you arrive at ${time}.`,
    shift: (time, stopPct, before, after) =>
      `Leaving at ${time} brings it to ${stopPct}%, and the whole trip from ${before}% to ${after}%.`,
    gridlockShift: (minutes, time, gain) =>
      `Leaving ${minutes} minutes later, at ${time}, ${gain}.`,
    swap: (name, pct, time) =>
      `${name} has a similar feel and is forecast at ${pct}% when you would arrive at ${time}.`,
    reorder: (before, after, minutesSaved) =>
      before === after
        ? `A different order saves ${minutesSaved} minutes on the road at the same crowd level.`
        : minutesSaved > 0
          ? `A different order lowers crowd exposure from ${before}% to ${after}% and saves ${minutesSaved} minutes on the road.`
          : `A different order lowers crowd exposure from ${before}% to ${after}%.`,
    closedFix: (name, arrival, time, exposure) =>
      `${name} is closed when you would arrive at ${arrival}. Leaving at ${time} keeps every stop open, with crowd exposure at ${exposure}%.`,
    food: (name, kind, km, from, dwell) =>
      `${name}, a local ${kind}, is ${km} km from ${from}; a ${dwell}-minute stop puts your spending straight into a family business.`,
    foodCount: (count) =>
      count === 1
        ? 'One local business fits along your route.'
        : `${count} local businesses fit along your route.`,
    foodNone: () => 'No local warung is open close to your route at those times.',
    wait: (name, kind, km, dwell, gain) =>
      `Rather than idling in the jam, spend ${dwell} minutes at ${name}, a local ${kind} ${km} km away; ${gain}.`,
    crowdGain: (before, after) => `crowd exposure drops from ${before}% to ${after}%`,
    delayGain: (minutes) => `corridor delay falls by ${minutes} minutes`,
    recipient: (regency) =>
      `It is in ${regency}, a regency that receives a share of Bali's tourism tax.`,
    sunsetStop: (name, pct, time) =>
      `${name} is forecast at ${pct}% when you arrive at ${time}, right in golden hour.`,
    sunsetShift: (time, name, arrival) =>
      `Leaving at ${time} gets you to ${name} around ${arrival}, in time for golden hour.`,
    sunsetNone: () =>
      'No calm sunset spot fits this route at the current timing. Try a later start or ending on the west coast.',
    stuck: (corridor, endsAt, delay) =>
      `${corridor} is usually jammed until ${endsAt}, adding about ${delay} minutes.`,
    notStuck: (time) => `Your start point is not inside a known gridlock corridor at ${time}.`,
    calm: (exposure) =>
      `Your plan already looks calm, with crowd exposure at ${exposure}%. No change needed for now.`,
    noBetter: () => 'No change we tried keeps your stops open and makes the trip calmer.',
    bestTimeNone: (time, exposure) =>
      `Leaving at ${time} is already the calmest start we found, with crowd exposure at ${exposure}%.`,
    explainFormula: () =>
      'Each stop gets a crowd friction score: 0.5 × busyness on arrival + 0.3 × busyness two hours later + 0.2 × road penalty.',
    explainStop: (name, bEff, fPlus2, penalty, score) =>
      `For ${name}: 0.5×${bEff} + 0.3×${fPlus2} + 0.2×${penalty} = ${score}.`,
    forecastNote: () => 'Crowd figures are forecasts, not live counts.',
    greeting: (stops, exposure) =>
      `Hi, I'm MARGI. Your ${stops}-stop trip has a forecast crowd exposure of ${exposure}%. Ask me about the best time to leave, calmer places or a warung on the way.`,
    unknown: (exposure) =>
      `I can help with departure time, calmer swaps, traffic, local food and sunset. Your trip currently sits at ${exposure}% forecast crowd exposure.`,
  },
  id: {
    forecastAt: (name, pct, time) =>
      `${name} diperkirakan ${pct}% ramai saat kamu tiba pukul ${time}.`,
    shift: (time, stopPct, before, after) =>
      `Berangkat pukul ${time} menurunkannya ke ${stopPct}%, dan seluruh perjalanan dari ${before}% ke ${after}%.`,
    gridlockShift: (minutes, time, gain) =>
      `Jika berangkat ${minutes} menit lebih lambat, pukul ${time}, ${gain}.`,
    swap: (name, pct, time) =>
      `${name} punya suasana serupa dan diperkirakan ${pct}% saat kamu tiba pukul ${time}.`,
    reorder: (before, after, minutesSaved) =>
      before === after
        ? `Urutan lain menghemat ${minutesSaved} menit di jalan dengan keramaian yang sama.`
        : minutesSaved > 0
          ? `Urutan lain menurunkan paparan keramaian dari ${before}% ke ${after}% dan menghemat ${minutesSaved} menit di jalan.`
          : `Urutan lain menurunkan paparan keramaian dari ${before}% ke ${after}%.`,
    closedFix: (name, arrival, time, exposure) =>
      `${name} sudah tutup saat kamu tiba pukul ${arrival}. Berangkat pukul ${time} supaya semua tempat masih buka, dengan paparan keramaian ${exposure}%.`,
    food: (name, kind, km, from, dwell) =>
      `${name}, ${kind} lokal, berjarak ${km} km dari ${from}; mampir ${dwell} menit membuat belanjamu langsung ke usaha keluarga.`,
    foodCount: (count) =>
      count === 1
        ? 'Ada satu usaha lokal yang pas di rutemu.'
        : `Ada ${count} usaha lokal yang pas di rutemu.`,
    foodNone: () => 'Belum ada warung lokal yang buka dekat rutemu pada jam tersebut.',
    wait: (name, kind, km, dwell, gain) =>
      `Daripada diam di kemacetan, singgah ${dwell} menit di ${name}, ${kind} lokal ${km} km dari sini; ${gain}.`,
    crowdGain: (before, after) => `paparan keramaian turun dari ${before}% ke ${after}%`,
    delayGain: (minutes) => `tambahan waktu macet berkurang ${minutes} menit`,
    recipient: (regency) =>
      `Lokasinya di ${regency}, kabupaten penerima bagi hasil pajak pariwisata Bali.`,
    sunsetStop: (name, pct, time) =>
      `${name} diperkirakan ${pct}% saat kamu tiba pukul ${time}, pas jam emas senja.`,
    sunsetShift: (time, name, arrival) =>
      `Berangkat pukul ${time} membawamu ke ${name} sekitar pukul ${arrival}, pas jam emas senja.`,
    sunsetNone: () =>
      'Belum ada tempat senja yang sepi dan cocok dengan jadwal ini. Coba berangkat lebih sore atau akhiri di pantai barat.',
    stuck: (corridor, endsAt, delay) =>
      `${corridor} biasanya macet sampai pukul ${endsAt}, menambah sekitar ${delay} menit.`,
    notStuck: (time) =>
      `Titik awalmu tidak berada di jalur macet yang kami kenal pada pukul ${time}.`,
    calm: (exposure) =>
      `Rencanamu sudah cukup tenang, paparan keramaian ${exposure}%. Belum perlu diubah.`,
    noBetter: () =>
      'Belum ada perubahan yang membuat perjalanan lebih sepi sambil tetap pas jam bukanya.',
    bestTimeNone: (time, exposure) =>
      `Berangkat pukul ${time} sudah pilihan paling tenang yang kami temukan, paparan keramaian ${exposure}%.`,
    explainFormula: () =>
      'Setiap tempat diberi skor friksi keramaian: 0,5 × keramaian saat tiba + 0,3 × keramaian dua jam kemudian + 0,2 × penalti jalan.',
    explainStop: (name, bEff, fPlus2, penalty, score) =>
      `Untuk ${name}: 0,5×${bEff} + 0,3×${fPlus2} + 0,2×${penalty} = ${score}.`,
    forecastNote: () => 'Angka keramaian adalah prakiraan, bukan hitungan langsung.',
    greeting: (stops, exposure) =>
      `Halo, aku MARGI. Perjalanan ${stops} tempatmu punya prakiraan paparan keramaian ${exposure}%. Tanya aku soal jam berangkat terbaik, tempat yang lebih sepi, atau warung di jalan.`,
    unknown: (exposure) =>
      `Aku bisa bantu soal jam berangkat, tempat yang lebih sepi, macet, kuliner lokal, dan senja. Prakiraan paparan keramaian perjalananmu sekarang ${exposure}%.`,
  },
};

/** What a gridlock change gains: crowd when it got calmer, otherwise the delay it removes. */
function gridlockGain(f: ReplyFacts, top: TripSuggestion, p: Phrases): string {
  const before = f.plan.metrics.crowdExposure;
  if (top.after.crowdExposure < before) return p.crowdGain(before, top.after.crowdExposure);
  return p.delayGain(f.plan.metrics.totalDelayMinutes - top.after.totalDelayMinutes);
}

function describeShift(f: ReplyFacts, top: TripSuggestion, after: TripPlan, p: Phrases): string {
  const minutes = top.change.kind === 'SHIFT_DEPARTURE' ? top.change.minutes : 0;
  const time = hhmm(after.request.departAt);
  const before = f.plan.metrics.crowdExposure;
  if (top.reason === 'GOLDEN_HOUR') {
    const last = after.stops[after.stops.length - 1];
    return last ? p.sunsetShift(time, nameOf(last.place, f.locale), hhmm(last.arriveAt)) : '';
  }
  if (top.reason === 'CORRIDOR_GRIDLOCK') {
    return p.gridlockShift(minutes, time, gridlockGain(f, top, p));
  }
  if (top.reason === 'CLOSED_ON_ARRIVAL') {
    const closed = f.plan.stops.find((stop) => !stop.place.isOpenNow);
    return closed
      ? p.closedFix(
          nameOf(closed.place, f.locale),
          hhmm(closed.arriveAt),
          time,
          top.after.crowdExposure,
        )
      : '';
  }
  const sameStop = after.stops[f.busiest?.index ?? 0];
  const stopPct = sameStop?.place.crowd.busynessPct ?? top.after.crowdExposure;
  return p.shift(time, stopPct, before, top.after.crowdExposure);
}

function describeIntroduced(f: ReplyFacts, top: TripSuggestion, after: TripPlan, p: Phrases) {
  const index = introducedIndex(top) ?? 0;
  const stop = after.stops[index];
  if (!stop) return '';
  const name = nameOf(stop.place, f.locale);
  const pct = stop.place.crowd.busynessPct;
  const time = hhmm(stop.arriveAt);
  if (top.reason === 'GOLDEN_HOUR') return p.sunsetStop(name, pct, time);
  if (top.change.kind === 'SWAP_STOP') return p.swap(name, pct, time);
  const kind = businessKind(stop.place, f.locale);
  if (top.reason === 'CORRIDOR_GRIDLOCK') {
    const km = formatKm(stop.place.distanceKm, f.locale);
    return p.wait(name, kind, km, stop.dwellMinutes, gridlockGain(f, top, p));
  }
  const previous = after.stops[index - 1];
  const from = previous ? nameOf(previous.place, f.locale) : after.request.originLabel;
  return p.food(name, kind, formatKm(stop.place.distanceKm, f.locale), from, stop.dwellMinutes);
}

function describeTop(f: ReplyFacts, p: Phrases): string {
  const { top, topPlan } = f;
  if (!top || !topPlan) return '';
  switch (top.change.kind) {
    case 'SHIFT_DEPARTURE':
      return describeShift(f, top, topPlan, p);
    case 'REORDER':
      return p.reorder(
        f.plan.metrics.crowdExposure,
        top.after.crowdExposure,
        Math.max(0, -top.delta.travelMinutes),
      );
    case 'SWAP_STOP':
    case 'ADD_STOP':
      return describeIntroduced(f, top, topPlan, p);
    case 'REMOVE_STOP':
    case 'SET_STOPS':
      return '';
  }
}

/** Equity sentence when the proposed venue sits in a PHR recipient regency. */
function equityNote(f: ReplyFacts, p: Phrases): string {
  const venue = f.top?.venue?.venue;
  if (!venue || !isRecipientRegency(venue.regencyId)) return '';
  return p.recipient(regencyName(venue.regencyId, f.locale));
}

function forecastOfBusiest(f: ReplyFacts, p: Phrases): string {
  if (!f.busiest) return '';
  const { stop } = f.busiest;
  return p.forecastAt(
    nameOf(stop.place, f.locale),
    stop.place.crowd.busynessPct,
    hhmm(stop.arriveAt),
  );
}

function improveSentences(f: ReplyFacts, p: Phrases): string[] {
  const exposure = f.plan.metrics.crowdExposure;
  if (f.top) return [forecastOfBusiest(f, p), describeTop(f, p), equityNote(f, p)];
  const isBusy = (f.busiest?.stop.place.crowd.busynessPct ?? 0) > THRESHOLDS.calmMax;
  const fallback =
    f.intent === 'BEST_TIME'
      ? p.bestTimeNone(hhmm(f.plan.request.departAt), exposure)
      : isBusy
        ? p.noBetter()
        : p.calm(exposure);
  return isBusy ? [forecastOfBusiest(f, p), fallback] : [fallback];
}

function explainSentences(f: ReplyFacts, p: Phrases): string[] {
  if (!f.busiest) return [p.explainFormula(), p.forecastNote()];
  const breakdown = frictionBreakdownOf(f.busiest.stop, f.ctx);
  const name = nameOf(f.busiest.stop.place, f.locale);
  return [
    p.explainFormula(),
    p.explainStop(
      name,
      breakdown.bEff,
      breakdown.fPlus2,
      breakdown.corridorPenalty,
      breakdown.display,
    ),
    p.forecastNote(),
  ];
}

function sentencesFor(f: ReplyFacts, p: Phrases): string[] {
  const exposure = f.plan.metrics.crowdExposure;
  switch (f.intent) {
    case 'GREETING':
      return [p.greeting(f.plan.stops.length, exposure)];
    case 'UNKNOWN':
      return [p.unknown(exposure)];
    case 'EXPLAIN':
      return explainSentences(f, p);
    case 'STUCK_IN_TRAFFIC': {
      if (!f.jam) return [p.notStuck(hhmm(f.plan.request.departAt)), ...improveSentences(f, p)];
      const { corridor, endsAt } = f.jam;
      const intro = p.stuck(corridorName(corridor, f.locale), endsAt, corridor.typicalDelayMinutes);
      return [intro, f.top ? describeTop(f, p) : p.noBetter(), equityNote(f, p)];
    }
    case 'ADD_FOOD':
      return f.top
        ? [p.foodCount(f.suggestions.length), describeTop(f, p), equityNote(f, p)]
        : [p.foodNone()];
    case 'SUNSET':
      return f.top ? [describeTop(f, p), equityNote(f, p)] : [p.sunsetNone()];
    case 'REVIEW_PLAN':
    case 'BEST_TIME':
    case 'QUIETER':
      return improveSentences(f, p);
  }
}

function composeText(f: ReplyFacts): string {
  const sentences = sentencesFor(f, PHRASES[f.locale]).filter((sentence) => sentence.length > 0);
  return sentences.slice(0, MAX_SENTENCES).join(' ').slice(0, MAX_TEXT_CHARS);
}

const QUICK_REPLY_ORDER: readonly CopilotIntent[] = [
  'BEST_TIME',
  'QUIETER',
  'ADD_FOOD',
  'SUNSET',
  'EXPLAIN',
  'REVIEW_PLAN',
];

const QUICK_REPLY_LABELS: Readonly<Record<Locale, Partial<Record<CopilotIntent, string>>>> = {
  en: {
    BEST_TIME: 'Best time?',
    QUIETER: 'Find somewhere calmer',
    ADD_FOOD: 'Stop at a warung',
    SUNSET: 'Catch the sunset',
    EXPLAIN: 'Why?',
    REVIEW_PLAN: 'Check my plan',
  },
  id: {
    BEST_TIME: 'Jam terbaik?',
    QUIETER: 'Cari yang lebih sepi',
    ADD_FOOD: 'Mampir warung',
    SUNSET: 'Kejar senja',
    EXPLAIN: 'Kenapa?',
    REVIEW_PLAN: 'Cek rencanaku',
  },
};

function quickRepliesFor(intent: CopilotIntent, locale: Locale): CopilotReply['quickReplies'] {
  return QUICK_REPLY_ORDER.filter((candidate) => candidate !== intent)
    .slice(0, MAX_QUICK_REPLIES)
    .map((candidate) => ({
      intent: candidate,
      label: QUICK_REPLY_LABELS[locale][candidate] ?? '',
    }));
}

type TraceCode =
  | 'intent.detect'
  | 'crowd.forecast'
  | 'crowd.cfs'
  | 'corridor.check'
  | 'time.scan'
  | 'time.golden'
  | 'rank.vibe_equity'
  | 'route.reorder'
  | 'msme.nearby'
  | 'result.none'
  | 'equity.check';

const TRACE_LABELS: Readonly<Record<Locale, Record<TraceCode, string>>> = {
  en: {
    'intent.detect': 'Understood the request',
    'crowd.forecast': 'Forecast crowd at each arrival',
    'crowd.cfs': 'Crowd friction score',
    'corridor.check': 'Checked gridlock corridors',
    'time.scan': 'Scanned departure times',
    'time.golden': 'Matched golden hour',
    'rank.vibe_equity': 'Ranked similar, calmer places',
    'route.reorder': 'Compared stop orders',
    'msme.nearby': 'Found local businesses nearby',
    'result.none': 'Looked for a better plan',
    'equity.check': 'Local and equity impact',
  },
  id: {
    'intent.detect': 'Memahami permintaan',
    'crowd.forecast': 'Prakiraan keramaian saat tiba',
    'crowd.cfs': 'Skor friksi keramaian',
    'corridor.check': 'Cek jalur macet',
    'time.scan': 'Memindai jam berangkat',
    'time.golden': 'Mencocokkan jam emas senja',
    'rank.vibe_equity': 'Memeringkat tempat serupa yang lebih sepi',
    'route.reorder': 'Membandingkan urutan tempat',
    'msme.nearby': 'Mencari usaha lokal terdekat',
    'result.none': 'Mencari rencana yang lebih baik',
    'equity.check': 'Dampak lokal dan pemerataan',
  },
};

function traceStep(locale: Locale, code: TraceCode, detail: string): CopilotTraceStep {
  return {
    code,
    label: TRACE_LABELS[locale][code].slice(0, TRACE_LABEL_MAX_CHARS),
    detail: detail.slice(0, TRACE_DETAIL_MAX_CHARS),
  };
}

function forecastDetail(f: ReplyFacts): string {
  const readings = f.plan.stops.map(
    (stop) =>
      `${nameOf(stop.place, f.locale)} ${stop.place.crowd.busynessPct}% ${hhmm(stop.arriveAt)}`,
  );
  const exposureLabel = f.locale === 'id' ? 'paparan' : 'exposure';
  return `${readings.join(' · ')}; ${exposureLabel} ${f.plan.metrics.crowdExposure}% (${f.plan.stops[0]?.place.crowd.tier ?? 'FORECAST'})`;
}

/** Words used inside trace details; the figures around them are computed. */
const TRACE_WORDS: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    redZone: 'red zone: CFS or busyness',
    leg: 'leg',
    noCorridor: 'No active corridor on your legs',
    departures: 'departures',
    steps: 'min steps',
    best: 'best',
    orders: 'orders',
    score: 'score = exposure',
    roadMinutes: 'road minutes',
    windowEnds: 'window ends',
    msme: 'MSME stops',
    recipient: 'recipient-regency stops',
    noChange: 'No change beat the current plan on crowd or delay',
  },
  id: {
    redZone: 'zona merah: CFS atau keramaian',
    leg: 'ruas',
    noCorridor: 'Tidak ada jalur macet aktif di rutemu',
    departures: 'jam berangkat',
    steps: 'menit per langkah',
    best: 'terbaik',
    orders: 'urutan',
    score: 'skor = paparan',
    roadMinutes: 'menit di jalan',
    windowEnds: 'macet reda',
    msme: 'UMKM',
    recipient: 'kabupaten penerima',
    noChange: 'Tidak ada perubahan yang lebih baik dari rencana ini',
  },
};

function word(f: ReplyFacts, key: string): string {
  return TRACE_WORDS[f.locale][key] ?? key;
}

function cfsDetail(f: ReplyFacts): string {
  if (!f.busiest) return 'CFS n/a';
  const { stop } = f.busiest;
  const b = frictionBreakdownOf(stop, f.ctx);
  const red = stop.isRedZone ? ` (${word(f, 'redZone')} ≥ ${THRESHOLDS.redZone})` : '';
  return `${nameOf(stop.place, f.locale)}: CFS ${CFS_WEIGHTS.w1}×${b.bEff} + ${CFS_WEIGHTS.w2}×${b.fPlus2} + ${CFS_WEIGHTS.w3}×${b.corridorPenalty} = ${b.display}${red}`;
}

function corridorDetail(f: ReplyFacts): string {
  const legsById = new Map<string, number[]>();
  f.plan.stops.forEach((stop, index) => {
    for (const id of stop.leg.corridorIds)
      legsById.set(id, [...(legsById.get(id) ?? []), index + 1]);
  });
  if (legsById.size === 0) return word(f, 'noCorridor');
  const delays = [...legsById].map(([id, legs]) => {
    const corridor = getCatalog().corridors.find((candidate) => candidate.id === id);
    const name = corridor ? corridorName(corridor, f.locale) : id;
    return `${name} +${corridor?.typicalDelayMinutes ?? 0} min (${word(f, 'leg')} ${legs.join(', ')})`;
  });
  return `${delays.join('; ')}; total +${f.plan.metrics.totalDelayMinutes} min`;
}

function scanDetail(f: ReplyFacts, top: TripSuggestion): string {
  const departAt = toWita(f.plan.request.departAt);
  const { earliest, latest, step } = DEPARTURE_SCAN_MIN;
  const count = (latest - earliest) / step;
  const from = departAt.plus({ minutes: earliest }).toFormat('HH:mm');
  const to = departAt.plus({ minutes: latest }).toFormat('HH:mm');
  const best = f.topPlan ? hhmm(f.topPlan.request.departAt) : '';
  const exposure = `${f.plan.metrics.crowdExposure}% → ${top.after.crowdExposure}%`;
  return `${count} ${word(f, 'departures')} ${from}–${to}, ${step} ${word(f, 'steps')}; ${word(f, 'best')} ${best}: ${exposure}`;
}

function rankDetail(f: ReplyFacts, top: TripSuggestion): string {
  const index = introducedIndex(top) ?? 0;
  const targetStop = f.plan.stops[index];
  const alt = top.venue;
  if (!targetStop || !alt) return '';
  const rank = swapRankOf(targetStop, alt.venue.id, f.ctx);
  if (!rank) return '';
  const sim = Math.round(rank.similarity);
  return `${nameOf(alt, f.locale)}: R = ${RANK_WEIGHTS.alpha}×${sim} + ${RANK_WEIGHTS.beta}×(100−${rank.crowdFriction}) + ${RANK_WEIGHTS.gamma}×${rank.eFiscal} = ${rank.rank.toFixed(1)}`;
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

function reorderDetail(f: ReplyFacts, top: TripSuggestion): string {
  const orders = factorial(f.plan.stops.length);
  const before = reorderObjective(f.plan.metrics).toFixed(1);
  const after = reorderObjective(top.after).toFixed(1);
  const minutes = `${roadMinutesOf(f.plan.metrics)} → ${roadMinutesOf(top.after)} min`;
  return `${orders} ${word(f, 'orders')}; ${word(f, 'score')} + ${REORDER_MINUTES_WEIGHT} × ${word(f, 'roadMinutes')} (${minutes}): ${before} → ${after}`;
}

function msmeDetail(f: ReplyFacts, top: TripSuggestion): string {
  const venue = top.venue;
  if (!venue) return '';
  const status = isRecipientRegency(venue.venue.regencyId) ? 'RECIPIENT' : 'DONOR';
  const wait = f.jam ? `; ${word(f, 'windowEnds')} ${f.jam.endsAt}` : '';
  return `${nameOf(venue, f.locale)} ${formatKm(venue.distanceKm, f.locale)} km, ${regencyName(venue.venue.regencyId, f.locale)} (${status})${wait}`;
}

function goldenDetail(f: ReplyFacts): string {
  const last = f.topPlan?.stops[f.topPlan.stops.length - 1];
  const window = `${GOLDEN_HOUR_WITA.start}–${GOLDEN_HOUR_WITA.end}`;
  if (!last) return window;
  return `${nameOf(last.place, f.locale)} ${hhmm(last.arriveAt)} (${window}), ${last.place.crowd.busynessPct}%`;
}

function strategyStep(f: ReplyFacts): CopilotTraceStep {
  const { top, locale } = f;
  if (!top) return traceStep(locale, 'result.none', word(f, 'noChange'));
  if (top.reason === 'GOLDEN_HOUR') return traceStep(locale, 'time.golden', goldenDetail(f));
  switch (top.change.kind) {
    case 'SHIFT_DEPARTURE':
      return traceStep(locale, 'time.scan', scanDetail(f, top));
    case 'SWAP_STOP':
      return traceStep(locale, 'rank.vibe_equity', rankDetail(f, top));
    case 'REORDER':
      return traceStep(locale, 'route.reorder', reorderDetail(f, top));
    case 'ADD_STOP':
    case 'REMOVE_STOP':
    case 'SET_STOPS':
      return traceStep(locale, 'msme.nearby', msmeDetail(f, top));
  }
}

function equityDetail(f: ReplyFacts): string {
  const before = f.plan.metrics;
  const after = f.top?.after ?? before;
  return `${word(f, 'msme')} ${before.msmeStops} → ${after.msmeStops}; ${word(f, 'recipient')} ${before.recipientRegencyStops} → ${after.recipientRegencyStops}`;
}

function buildTrace(f: ReplyFacts, resolved: ResolvedIntent): CopilotTraceStep[] {
  const { locale } = f;
  const intentStep = traceStep(locale, 'intent.detect', `intent=${f.intent} (${resolved.basis})`);
  const forecast = traceStep(locale, 'crowd.forecast', forecastDetail(f));
  const corridor = traceStep(locale, 'corridor.check', corridorDetail(f));
  const friction = traceStep(locale, 'crowd.cfs', cfsDetail(f));
  if (f.intent === 'GREETING' || f.intent === 'UNKNOWN') return [intentStep, forecast, corridor];
  if (f.intent === 'EXPLAIN') return [intentStep, forecast, friction, corridor];
  const equity = traceStep(locale, 'equity.check', equityDetail(f));
  return [intentStep, forecast, friction, corridor, strategyStep(f), equity];
}

/**
 * Template copilot reply (`source: 'TEMPLATE'`): every number comes from `evaluateTrip` and
 * `suggestFor`; the catalogue only arranges them into at most three short sentences.
 * @throws UnknownVenueError when the trip references an unknown venue id.
 */
export function buildCopilotReply(req: CopilotRequest, ctx: TripContext): CopilotReply {
  const resolved = resolveIntent(req);
  const facts = gatherFacts(req, resolved.intent, ctx);
  const clock = (text: string): string => localizeClock(text, req.locale);
  return CopilotReplySchema.parse({
    intent: resolved.intent,
    text: clock(composeText(facts)),
    source: 'TEMPLATE',
    plan: facts.plan,
    suggestions: facts.suggestions,
    quickReplies: quickRepliesFor(resolved.intent, req.locale),
    trace: buildTrace(facts, resolved).map((step) => ({ ...step, detail: clock(step.detail) })),
  });
}
