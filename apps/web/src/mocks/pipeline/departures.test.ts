import { describe, expect, it } from 'vitest';
import { DepartureScanSchema, type TripRequest } from '@margi-ai/shared';
import { EXPLORE_PLACES } from '../data/places';
import { scanDepartures } from './departures';

function idOf(slug: string): string {
  const seed = EXPLORE_PLACES.find((place) => place.venue.slug === slug);
  if (!seed) throw new Error(`Missing fixture place ${slug}`);
  return seed.venue.id;
}

const PLAN: TripRequest = {
  origin: { lat: -8.5069, lng: 115.2625 },
  originLabel: 'Ubud',
  departAt: '2026-11-07T13:00:00+08:00',
  stops: [{ venueId: idOf('tegallalang') }, { venueId: idOf('ubud-monkey-forest') }],
};

describe('scanDepartures (D-026)', () => {
  it('covers 06:00–18:00 in 30-minute slots on the trip day', () => {
    const scan = DepartureScanSchema.parse(
      scanDepartures(PLAN, { surge: false, tier: 'FORECAST' }),
    );
    expect(scan.options).toHaveLength(25);
    expect(scan.options[0]?.departAt).toBe('2026-11-07T06:00:00.000+08:00');
    expect(scan.options.at(-1)?.departAt).toBe('2026-11-07T18:00:00.000+08:00');
  });

  it('picks the calmest slot where every stop is open', () => {
    const scan = scanDepartures(PLAN, { surge: false, tier: 'FORECAST' });
    const best = scan.options[scan.bestIndex];
    expect(best?.closedStops).toBe(0);
    const open = scan.options.filter((option) => option.closedStops === 0);
    expect(Math.min(...open.map((option) => option.crowdExposure))).toBe(best?.crowdExposure);
  });
});
