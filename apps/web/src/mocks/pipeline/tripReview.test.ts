import { describe, expect, it } from 'vitest';
import { applyTripChange, type TripRequest } from '@margi-ai/shared';
import { EXPLORE_PLACES } from '../data/places';
import { buildCopilotReply } from './copilot';
import { evaluateTrip, suggestFor, type TripContext } from './trip';

const FORECAST: TripContext = { surge: false, tier: 'FORECAST' };
const UBUD = { lat: -8.5069, lng: 115.2625 };

function idOf(slug: string): string {
  const seed = EXPLORE_PLACES.find((place) => place.venue.slug === slug);
  if (!seed) throw new Error(`Missing fixture place ${slug}`);
  return seed.venue.id;
}

// Leaves at 16:30, so the Monkey Forest (closes 18:00) is reached after closing.
const LATE_PLAN: TripRequest = {
  origin: UBUD,
  originLabel: 'Ubud',
  departAt: '2026-11-07T16:30:00+08:00',
  stops: [{ venueId: idOf('tegallalang') }, { venueId: idOf('ubud-monkey-forest') }],
};

describe('plan review with a closed stop (D-026)', () => {
  it('first proposes the smallest departure shift that opens every stop', () => {
    const before = evaluateTrip(LATE_PLAN, FORECAST);
    expect(before.stops.some((stop) => !stop.place.isOpenNow)).toBe(true);

    const [first] = suggestFor('REVIEW_PLAN', LATE_PLAN, FORECAST);
    expect(first?.reason).toBe('CLOSED_ON_ARRIVAL');
    expect(first?.change.kind).toBe('SHIFT_DEPARTURE');
    if (!first) return;
    const after = evaluateTrip(applyTripChange(LATE_PLAN, first.change), FORECAST);
    expect(after.stops.every((stop) => stop.place.isOpenNow)).toBe(true);
  });

  it('says so in Indonesian with dotted clock times', () => {
    const reply = buildCopilotReply(
      { trip: LATE_PLAN, situation: 'HAS_PLAN', intent: 'REVIEW_PLAN', locale: 'id' },
      FORECAST,
    );
    expect(reply.text).toMatch(/tutup saat kamu tiba pukul \d{2}\.\d{2}/);
    expect(reply.text).not.toMatch(/\b\d{2}:\d{2}\b/);
  });
});
