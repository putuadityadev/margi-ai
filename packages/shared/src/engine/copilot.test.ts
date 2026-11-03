import { describe, expect, it } from 'vitest';
import {
  CopilotIntentSchema,
  CopilotReplySchema,
  type CopilotRequest,
  type TripRequest,
} from '../index';
import { TEST_CATALOG } from './testCatalog';
const EXPLORE_PLACES = TEST_CATALOG.places;
import { buildCopilotReply, detectIntent } from './copilot';
import type { TripContext } from './trip';

const UBUD = { lat: -8.5069, lng: 115.2625 };
const FORECAST: TripContext = { surge: false, tier: 'FORECAST' };
const EMOJI = /\p{Extended_Pictographic}/u;

function idOf(slug: string): string {
  const seed = EXPLORE_PLACES.find((candidate) => candidate.venue.slug === slug);
  if (!seed) throw new Error(`Missing fixture place ${slug}`);
  return seed.venue.id;
}

// Saturday 09:00 WITA from Ubud: three weekend hotspots in a row.
const DAY_TRIP: TripRequest = {
  origin: UBUD,
  originLabel: 'Ubud',
  departAt: '2026-11-07T09:00:00+08:00',
  stops: ['tegallalang', 'pura-tirta-empul', 'ubud-monkey-forest'].map((slug) => ({
    venueId: idOf(slug),
  })),
};

function request(overrides: Partial<CopilotRequest> = {}): CopilotRequest {
  return { trip: DAY_TRIP, situation: 'HAS_PLAN', locale: 'en', ...overrides };
}

describe('detectIntent', () => {
  it.each([
    ['aku kejebak macet di ubud', 'STUCK_IN_TRAFFIC'],
    ['stuck in traffic near Canggu', 'STUCK_IN_TRAFFIC'],
    ['jalanan padat merayap', 'STUCK_IN_TRAFFIC'],
    ['jam berapa sebaiknya berangkat', 'BEST_TIME'],
    ['What time should I leave?', 'BEST_TIME'],
    ['kapan paling sepi?', 'BEST_TIME'],
    ['mau mampir makan', 'ADD_FOOD'],
    ['any good coffee on the way', 'ADD_FOOD'],
    ['I want to catch the sunset', 'SUNSET'],
    ['mau lihat senja', 'SUNSET'],
    ['cari tempat yang lebih sepi', 'QUIETER'],
    ['Is it crowded?', 'QUIETER'],
    ['kenapa ramai sekali', 'EXPLAIN'],
    ['Why is this a red zone?', 'EXPLAIN'],
    ['tolong cek rencanaku', 'REVIEW_PLAN'],
    ['Review my itinerary', 'REVIEW_PLAN'],
    ['Halo', 'GREETING'],
    ['hi there', 'GREETING'],
    ['Sélamat pagi', 'GREETING'],
    ['asdfgh', 'UNKNOWN'],
  ] as const)('%s → %s', (message, intent) => {
    expect(detectIntent(message)).toBe(intent);
  });

  it('returns null without a message', () => {
    expect(detectIntent(undefined)).toBeNull();
    expect(detectIntent('   ')).toBeNull();
  });
});

describe('buildCopilotReply', () => {
  const intents = CopilotIntentSchema.options;

  it.each(
    intents.flatMap((intent) => [
      { intent, locale: 'en' as const },
      { intent, locale: 'id' as const },
    ]),
  )('$intent ($locale) parses and stays a short, honest template', ({ intent, locale }) => {
    const reply = buildCopilotReply(request({ intent, locale }), FORECAST);

    expect(CopilotReplySchema.safeParse(reply).success).toBe(true);
    expect(reply.intent).toBe(intent);
    expect(reply.source).toBe('TEMPLATE');
    expect(reply.text.length).toBeGreaterThan(0);
    expect(reply.text).not.toMatch(EMOJI);
    expect(reply.text).not.toMatch(/real-time|live crowd|guaranteed/i);
    expect(reply.quickReplies.length).toBeLessThanOrEqual(4);
    expect(reply.quickReplies.map((q) => q.intent)).not.toContain(intent);
    expect(reply.trace.length).toBeGreaterThanOrEqual(3);
    expect(reply.trace[0]?.code).toBe('intent.detect');
  });

  it('quotes the computed numbers in a plan review', () => {
    const reply = buildCopilotReply(request({ intent: 'REVIEW_PLAN' }), FORECAST);
    const [top] = reply.suggestions;
    const busiest = [...reply.plan.stops].sort(
      (a, b) => b.place.crowd.busynessPct - a.place.crowd.busynessPct,
    )[0];

    expect(top).toBeDefined();
    expect(reply.text).toContain(`${busiest?.place.crowd.busynessPct}%`);
    expect(reply.text).toContain(`${reply.plan.metrics.crowdExposure}%`);
    expect(reply.text).toContain(`${top?.after.crowdExposure}%`);
    const cfs = reply.trace.find((step) => step.code === 'crowd.cfs');
    expect(cfs?.detail).toContain(`= ${busiest?.crowdFriction}`);
  });

  it('writes Indonesian with the same figures', () => {
    const en = buildCopilotReply(request({ intent: 'REVIEW_PLAN', locale: 'en' }), FORECAST);
    const id = buildCopilotReply(request({ intent: 'REVIEW_PLAN', locale: 'id' }), FORECAST);
    expect(id.plan).toEqual(en.plan);
    expect(id.suggestions).toEqual(en.suggestions);
    expect(id.text).toContain('diperkirakan');
    expect(id.text).toContain(`${id.plan.metrics.crowdExposure}%`);
    expect(id.quickReplies[0]?.label).toBe('Jam terbaik?');
  });

  it('names the corridor and its delay when the traveller is stuck in Ubud', () => {
    const stuck = request({
      trip: { ...DAY_TRIP, departAt: '2026-11-07T11:00:00+08:00' },
      situation: 'STUCK_IN_TRAFFIC',
      message: 'aku kejebak macet di ubud',
      locale: 'id',
    });
    const reply = buildCopilotReply(stuck, FORECAST);
    expect(reply.intent).toBe('STUCK_IN_TRAFFIC');
    expect(reply.text).toContain('Jl. Raya Ubud');
    expect(reply.text).toContain('45 menit');
    expect(reply.trace[0]?.detail).toContain('kejebak');
  });

  it.each([
    ['STUCK_IN_TRAFFIC', 'STUCK_IN_TRAFFIC'],
    ['HAS_PLAN', 'REVIEW_PLAN'],
    ['PLAN', 'GREETING'],
  ] as const)('falls back to situation %s → %s without a message', (situation, intent) => {
    expect(buildCopilotReply(request({ situation }), FORECAST).intent).toBe(intent);
  });

  it('prefers a tapped quick reply over the typed message', () => {
    const reply = buildCopilotReply(
      request({ message: 'mau mampir makan', intent: 'SUNSET' }),
      FORECAST,
    );
    expect(reply.intent).toBe('SUNSET');
  });
});
