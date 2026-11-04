import { describe, expect, it } from 'vitest';
import { googleMapsTripUrl } from '../scoring/geo';
import { applyTripChange, TripChangeSchema, type TripRequest } from './trip';

const A = '0192e2b0-8c20-7193-8db6-8d5ec4f0fa00';
const B = '0192e2b0-8c20-7193-8db6-8d5ec4f0fa01';
const C = '0192e2b0-8c20-7193-8db6-8d5ec4f0fa02';

const request: TripRequest = {
  origin: { lat: -8.5, lng: 115.26 },
  originLabel: 'Ubud',
  departAt: '2026-11-07T09:00:00+08:00',
  stops: [{ venueId: A }, { venueId: B, dwellMinutes: 45 }],
};

describe('applyTripChange (D-026)', () => {
  it('shifts the departure and keeps the WITA offset', () => {
    expect(applyTripChange(request, { kind: 'SHIFT_DEPARTURE', minutes: -90 }).departAt).toBe(
      '2026-11-07T07:30:00+08:00',
    );
    const utc = { ...request, departAt: '2026-11-07T01:00:00Z' };
    expect(applyTripChange(utc, { kind: 'SHIFT_DEPARTURE', minutes: 30 }).departAt).toBe(
      '2026-11-07T01:30:00.000Z',
    );
  });

  it('swaps, adds, removes and reorders stops', () => {
    expect(
      applyTripChange(request, { kind: 'SWAP_STOP', stopIndex: 0, toVenueId: C }).stops,
    ).toEqual([{ venueId: C }, { venueId: B, dwellMinutes: 45 }]);
    expect(
      applyTripChange(request, { kind: 'ADD_STOP', atIndex: 1, venueId: C, dwellMinutes: 30 })
        .stops,
    ).toEqual([{ venueId: A }, { venueId: C, dwellMinutes: 30 }, { venueId: B, dwellMinutes: 45 }]);
    expect(applyTripChange(request, { kind: 'REMOVE_STOP', stopIndex: 0 }).stops).toEqual([
      { venueId: B, dwellMinutes: 45 },
    ]);
    expect(applyTripChange(request, { kind: 'REORDER', order: [1, 0] }).stops[0]?.venueId).toBe(B);
  });

  it('ignores invalid changes', () => {
    expect(applyTripChange(request, { kind: 'SWAP_STOP', stopIndex: 9, toVenueId: C })).toBe(
      request,
    );
    expect(applyTripChange(request, { kind: 'REORDER', order: [0, 0] })).toBe(request);
    const single = { ...request, stops: [{ venueId: A }] };
    expect(applyTripChange(single, { kind: 'REMOVE_STOP', stopIndex: 0 })).toBe(single);
    const full = { ...request, stops: [A, B, C, A, B].map((venueId) => ({ venueId })) };
    expect(
      applyTripChange(full, { kind: 'ADD_STOP', atIndex: 0, venueId: C, dwellMinutes: 30 }),
    ).toBe(full);
  });

  it('validates change payloads', () => {
    expect(TripChangeSchema.safeParse({ kind: 'REORDER', order: [0] }).success).toBe(false);
  });
});

describe('googleMapsTripUrl (D-026)', () => {
  it('builds a multi-stop link with waypoints', () => {
    const url = new URL(
      googleMapsTripUrl({ lat: -8.5, lng: 115.26 }, [
        { lat: -8.4, lng: 115.3 },
        { lat: -8.3, lng: 115.1 },
      ]),
    );
    expect(url.searchParams.get('origin')).toBe('-8.5,115.26');
    expect(url.searchParams.get('destination')).toBe('-8.3,115.1');
    expect(url.searchParams.get('waypoints')).toBe('-8.4,115.3');
  });

  it('falls back to a plain destination link without stops', () => {
    expect(googleMapsTripUrl({ lat: 1, lng: 2 }, [])).toContain('destination=1,2');
  });
});
