import { beforeEach, describe, expect, it } from 'vitest';
import { toTripRequest, useTripStore, type TripDraft } from './tripStore';
import { dayOf, signed } from '../features/trip/tripText';
import { gridlockExampleDepartAt } from '../features/trip/tripStart';

const A = '0192e2b0-8c20-7193-8db6-8d5ec4f0fa00';
const B = '0192e2b0-8c20-7193-8db6-8d5ec4f0fa01';

const draft: TripDraft = {
  origin: { lat: -8.5, lng: 115.26 },
  originLabel: 'Ubud',
  departAt: '2026-11-07T09:00:00.000+08:00',
  stops: [{ venueId: A }],
};

describe('tripStore (D-026)', () => {
  beforeEach(() => useTripStore.getState().reset());

  it('opens the copilot first only for travellers stuck in traffic', () => {
    useTripStore.getState().start(draft, 'PLAN');
    expect(useTripStore.getState().tab).toBe('plan');
    useTripStore.getState().start(draft, 'STUCK_IN_TRAFFIC');
    expect(useTripStore.getState().tab).toBe('copilot');
  });

  it('edits stops without duplicates and swaps order', () => {
    const store = useTripStore.getState();
    store.start(draft, 'HAS_PLAN');
    store.addStop(B);
    store.addStop(B);
    expect(useTripStore.getState().draft?.stops.map((stop) => stop.venueId)).toEqual([A, B]);
    useTripStore.getState().moveStop(1, -1);
    expect(useTripStore.getState().draft?.stops.map((stop) => stop.venueId)).toEqual([B, A]);
    useTripStore.getState().removeStop(0);
    expect(useTripStore.getState().draft?.stops).toEqual([{ venueId: A }]);
  });

  it('applies a change, logs it, and marks the plan unsaved', () => {
    useTripStore.getState().start(draft, 'PLAN');
    useTripStore.getState().markSaved('plan-1');
    useTripStore
      .getState()
      .applyChange({ kind: 'SHIFT_DEPARTURE', minutes: -60 }, 'Moved to 08.00', 's1');
    const state = useTripStore.getState();
    expect(state.draft?.departAt).toBe('2026-11-07T08:00:00+08:00');
    expect(state.changeLog).toEqual(['Moved to 08.00']);
    expect(state.appliedSuggestionIds).toEqual(['s1']);
    expect(state.chat.at(-1)).toMatchObject({ role: 'event', text: 'Moved to 08.00' });
    expect(state.savedPlanId).toBeNull();
  });

  it('only builds an API request once a stop exists', () => {
    expect(toTripRequest({ ...draft, stops: [] })).toBeNull();
    expect(toTripRequest(draft)?.stops).toHaveLength(1);
  });
});

describe('trip helpers (D-026)', () => {
  it('formats signed deltas with a true minus sign', () => {
    expect(signed(-32)).toBe('−32');
    expect(signed(8)).toBe('+8');
    expect(signed(0)).toBe('0');
  });

  it('tells today from tomorrow in WITA', () => {
    const now = new Date('2026-11-07T02:00:00Z'); // 10:00 WITA Saturday
    expect(dayOf('2026-11-07T21:00:00+08:00', now)).toBe('today');
    expect(dayOf('2026-11-08T07:00:00+08:00', now)).toBe('tomorrow');
  });

  it('places the gridlock demo inside the Ubud window', () => {
    expect(gridlockExampleDepartAt(new Date('2026-11-07T04:00:00Z'))).toBe(
      '2026-11-07T12:00:00.000+08:00',
    );
    expect(gridlockExampleDepartAt(new Date('2026-11-07T14:00:00Z'))).toBe(
      '2026-11-08T11:00:00.000+08:00',
    );
    expect(gridlockExampleDepartAt(new Date('2026-11-06T23:00:00Z'))).toBe(
      '2026-11-07T11:00:00.000+08:00',
    );
  });
});
