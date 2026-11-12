import { describe, expect, it } from 'vitest';
import type { TripPlan } from '@margi-ai/shared';
import { atClock } from './TripPlanPanel';
import { planToIcs } from './planToIcs';

/** Only the fields planToIcs reads; the rest of a plan is irrelevant here. */
const plan = {
  request: { departAt: '2026-11-14T08:00:00+08:00' },
  stops: [
    {
      place: {
        venue: { id: 'v1', nameEn: 'Mertasari Beach', lat: -8.7189, lng: 115.2522 },
      },
      arriveAt: '2026-11-14T08:24:00+08:00',
      leaveAt: '2026-11-14T09:24:00+08:00',
    },
    {
      place: {
        venue: { id: 'v2', nameEn: 'Warung Babi Guling, Sanur; "Bu Tu"', lat: -8.69, lng: 115.26 },
      },
      arriveAt: '2026-11-14T09:40:00+08:00',
      leaveAt: '2026-11-14T10:20:00+08:00',
    },
  ],
} as unknown as TripPlan;

const ics = planToIcs(plan, {
  name: (stop) => stop.place.venue.nameEn,
  describe: (_stop, index) =>
    `Prakiraan keramaian 18% saat tiba.\nStop ${index + 1} dari MARGI AI, rencana yang panjang sekali untuk menguji pelipatan baris kalender.`,
  now: new Date('2026-11-13T12:00:00Z'),
});

describe('planToIcs', () => {
  it('writes one event per stop at the computed WITA times, in UTC', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20261114T002400Z');
    expect(ics).toContain('DTEND:20261114T012400Z');
    expect(ics).toContain('GEO:-8.718900;115.252200');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('escapes commas, semicolons and newlines in text', () => {
    expect(ics).toContain('SUMMARY:Warung Babi Guling\\, Sanur\\; "Bu Tu"');
    expect(ics).toContain('saat tiba.\\nStop 1');
  });

  it('folds lines longer than 75 octets', () => {
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(ics).toContain('\r\n ');
  });
});

describe('atClock', () => {
  it('keeps the day and rounds a typed time to 15 minutes', () => {
    expect(atClock('2026-11-14T09:00:00.000+08:00', '07:40')).toBe('2026-11-14T07:45:00.000+08:00');
    expect(atClock('2026-11-14T09:00:00.000+08:00', '23:55')).toBe('2026-11-14T23:45:00.000+08:00');
  });

  it('ignores an empty or partial value', () => {
    expect(atClock('2026-11-14T09:00:00+08:00', '')).toBeNull();
    expect(atClock('2026-11-14T09:00:00+08:00', '7:4')).toBeNull();
  });
});
