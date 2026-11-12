/**
 * The messages real testers typed during the 2026-11-12 user test (tasks/13, T-104), replayed
 * against a running API (default http://localhost:3000):
 *   npx tsx scripts/eval-testers.ts
 * Chat cases hit /chat/reply, Copilot cases hit /copilot/reply with a one-stop trip to Mertasari.
 * It spends real LLM credit (one request per case).
 */
const BASE = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const MERTASARI = '0192e2b0-8c20-7193-8db6-8d5ec4f0fa0d';
const DENPASAR = { lat: -8.65, lng: 115.22 };

interface Card {
  venue: { nameEn: string; nameId?: string; kind?: string };
}

interface Reply {
  text: string;
  /** Chat only. */
  places?: Card[];
  pinQuery?: string;
  trace?: { code: string; detail: string }[];
  /** Copilot only. */
  suggestions?: {
    change: { kind: string; venueIds?: string[]; atIndex?: number };
    venue: Card | null;
    venues?: Card[];
  }[];
}

interface Case {
  tester: string;
  endpoint: 'chat' | 'copilot';
  message: string;
  check: (reply: Reply) => string | null;
}

const INDONESIAN = /\b(yang|dan|kamu|untuk|saya|aku|sudah|bisa|lalu|jam|tiba|keramaian|ini|di)\b/i;

/** Names on every card in the reply, chat or copilot. */
function cardNames(reply: Reply): string {
  const chat = (reply.places ?? []).map((p) => p.venue.nameEn);
  const copilot = (reply.suggestions ?? []).flatMap((s) => [
    s.venue?.venue.nameEn ?? '',
    ...(s.venues ?? []).map((v) => v.venue.nameEn),
  ]);
  return [...chat, ...copilot].filter(Boolean).join(' | ');
}

const kinds = (reply: Reply): string[] => (reply.suggestions ?? []).map((s) => s.change.kind);

const CASES: Case[] = [
  {
    tester: 'U1',
    endpoint: 'chat',
    message: 'Tempat makan nasi babi guling dengan biew yang bagus',
    check: (r) => ((r.places ?? []).length === 0 ? 'no place cards' : null),
  },
  {
    tester: 'U2',
    endpoint: 'chat',
    message: 'Beritahu saya pantai di denpasar',
    check: (r) =>
      !/beach|pantai/i.test(cardNames(r)) ? `no beach card: ${cardNames(r) || '-'}` : null,
  },
  {
    tester: 'U3',
    endpoint: 'chat',
    message: 'Saya ingin mengetahui dimana lokasi dengan sunset terbaik hari ini',
    check: (r) => ((r.places ?? []).length === 0 ? 'no place cards' : null),
  },
  {
    tester: 'U4',
    endpoint: 'chat',
    message: 'pingin ke bedugul hari minggu nih, saran enaknya ke wisata apa aja yah',
    check: (r) =>
      (r.places ?? []).length === 0
        ? 'no place cards'
        : /hari ini|sekarang/i.test(r.text) && !/minggu/i.test(r.text)
          ? 'answered for today instead of Sunday'
          : null,
  },
  {
    tester: 'U5',
    endpoint: 'chat',
    message: 'bagaimana AI ini menghitung tingkat keramaian suatu tempat?',
    check: (r) =>
      !/prakiraan|perkiraan|pola|forecast|estimasi/i.test(r.text)
        ? 'does not say the crowd level is a forecast'
        : null,
  },
  {
    tester: 'U5',
    endpoint: 'chat',
    message: 'bisa buatkan aku kode python untuk kalkulator?',
    check: (r) => (/def |print\(|```/.test(r.text) ? 'answered an off-topic request' : null),
  },
  {
    tester: 'U1',
    endpoint: 'copilot',
    message: 'Saya mau ganti tempat deh, mau nyari babi guling yang dekat dengan daerah pantai',
    check: (r) => ((r.suggestions ?? []).length === 0 ? 'no suggestion card' : null),
  },
  {
    tester: 'U2',
    endpoint: 'copilot',
    message: 'rute terbaik ke pantai sanur',
    check: (r) => (!/sanur/i.test(cardNames(r)) ? `no Sanur card: ${cardNames(r) || '-'}` : null),
  },
  {
    tester: 'U3',
    endpoint: 'copilot',
    message: 'buat rencana',
    check: () => null,
  },
  {
    tester: 'U4',
    endpoint: 'copilot',
    message: 'ubah rencana ke bedugul mau ke pura dulu habis itu ngopi baru ke botania',
    check: (r) => {
      if (!kinds(r).includes('SET_STOPS')) return `no SET_STOPS card (${kinds(r).join(',')})`;
      const names = cardNames(r);
      return /temple|pura|ulun danu/i.test(names) && /botani/i.test(names)
        ? null
        : `stops: ${names}`;
    },
  },
  {
    tester: 'U4',
    endpoint: 'copilot',
    message: 'daerah kos sekitar renon',
    check: (r) => (/beach|pantai/i.test(cardNames(r)) ? `offered a beach: ${cardNames(r)}` : null),
  },
  {
    tester: 'U5',
    endpoint: 'copilot',
    message: 'geser jam keberangkatan ke jam yang paling sepi',
    check: (r) =>
      kinds(r).includes('SHIFT_DEPARTURE') ? null : `no SHIFT_DEPARTURE (${kinds(r).join(',')})`,
  },
  {
    tester: 'U5',
    endpoint: 'copilot',
    message: 'Danau Batur Kedisan',
    check: (r) =>
      /batur|kedisan/i.test(cardNames(r)) ? null : `no Batur card: ${cardNames(r) || '-'}`,
  },
  {
    tester: 'U1',
    endpoint: 'copilot',
    message: 'aku mau mampir makan babi guling yang searah sebelum sampai pantai',
    check: (r) =>
      (r.suggestions ?? []).some((s) => s.change.kind === 'ADD_STOP' && s.change.atIndex === 0)
        ? null
        : `no food card before the beach (${kinds(r).join(',')})`,
  },
  {
    tester: 'U4',
    endpoint: 'copilot',
    message: 'habis dari pantai mau ngopi dulu di dekat situ',
    check: (r) =>
      (r.suggestions ?? []).some((s) => s.change.kind === 'ADD_STOP' && s.change.atIndex === 1)
        ? null
        : `no coffee card after the beach (${kinds(r).join(',')})`,
  },
];

function tomorrowAt(hour: number): string {
  const wita = new Date(Date.now() + 8 * 3_600_000 + 24 * 3_600_000);
  const day = wita.toISOString().slice(0, 10);
  // EVAL_MINUTE shifts the departure a few minutes so a repeated run is not served from cache.
  const minute = String(Number(process.env.EVAL_MINUTE ?? 0) % 60).padStart(2, '0');
  return `${day}T${String(hour).padStart(2, '0')}:${minute}:00+08:00`;
}

function requestBody(testCase: Case): unknown {
  if (testCase.endpoint === 'chat')
    return { message: testCase.message, locale: 'id', origin: DENPASAR };
  return {
    trip: {
      origin: DENPASAR,
      originLabel: 'Denpasar',
      departAt: tomorrowAt(9),
      stops: [{ venueId: MERTASARI }],
    },
    situation: 'PLAN',
    locale: 'id',
    message: testCase.message,
  };
}

async function ask(testCase: Case): Promise<{ reply: Reply | null; error: string | null }> {
  const response = await fetch(`${BASE}/${testCase.endpoint}/reply`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-requested-with': 'margi-ai' },
    body: JSON.stringify(requestBody(testCase)),
    signal: AbortSignal.timeout(70_000),
  });
  const body = (await response.json()) as Reply & { error?: { code: string; message: string } };
  if (!response.ok) return { reply: null, error: `${response.status} ${body.error?.code ?? ''}` };
  return { reply: body, error: null };
}

function common(reply: Reply): string | null {
  if (/<[|｜]|invoke name=/i.test(reply.text)) return 'tool-call markup in the text';
  if (!/[.!?…)"'”]$/.test(reply.text.trim())) return 'answer cut off mid-sentence';
  if (!INDONESIAN.test(reply.text)) return 'Indonesian message answered in another language';
  return null;
}

async function main(): Promise<void> {
  // CASE=<text> runs only the cases whose name or message contains it.
  const only = process.env.CASE?.toLowerCase();
  const selected = CASES.filter((c) =>
    only ? JSON.stringify(c).toLowerCase().includes(only) : true,
  );
  let passed = 0;
  const seconds: number[] = [];
  for (const testCase of selected) {
    const started = Date.now();
    const { reply, error } = await ask(testCase).catch((cause: unknown) => ({
      reply: null,
      error: String(cause),
    }));
    const took = (Date.now() - started) / 1000;
    seconds.push(took);
    const label = `${testCase.endpoint.padEnd(7)} ${testCase.tester.padEnd(8)} "${testCase.message}"`;
    const problem = reply ? (common(reply) ?? testCase.check(reply)) : error;
    if (problem) {
      console.log(`FAIL  ${label} (${took.toFixed(1)}s): ${problem}`);
      if (reply) console.log(`      cards=${cardNames(reply) || '-'}\n      ${reply.text}`);
    } else {
      passed += 1;
      console.log(`PASS  ${label} (${took.toFixed(1)}s) cards=${cardNames(reply as Reply) || '-'}`);
    }
  }
  const sorted = [...seconds].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  console.log(
    `\n${passed}/${selected.length} passed · median ${median.toFixed(1)}s · max ${(sorted.at(-1) ?? 0).toFixed(1)}s`,
  );
  process.exitCode = passed === selected.length ? 0 : 1;
}

void main();
