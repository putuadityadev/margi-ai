import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import type { OpeningHoursMap, PenaltyWindow } from './index';
import {
  OpeningHoursSchema,
  PenaltyWindowSchema,
  addHoursWrapped,
  formatLocalEquivalent,
  formatWita,
  isOpen,
  isWithinWindow,
  pickQuietHours,
  toWita,
  witaDayOfWeek,
  witaHour,
} from './index';

describe('WITA Time Utilities (T-013)', () => {
  describe('toWita, witaDayOfWeek & wrapping', () => {
    it('Sunday 23:00 + 2 h wraps to Monday (0) 01:00', () => {
      // 2026-11-08 is a Sunday (day 6 under 0=Monday convention)
      const sundayNight = DateTime.fromISO('2026-11-08T23:00:00', { zone: 'Asia/Makassar' });
      expect(witaDayOfWeek(sundayNight)).toBe(6);

      const wrapped = addHoursWrapped(sundayNight, 2);
      expect(wrapped.dayOfWeek).toBe(0); // Monday
      expect(wrapped.hour).toBe(1);
    });

    it('UTC instant of Sunday 16:30Z resolves to Monday 00:30 WITA, day 0', () => {
      // 16:30 UTC + 8 h = 00:30 WITA on the following calendar day
      const utcInstant = '2026-11-08T16:30:00Z';
      const wita = toWita(utcInstant);

      expect(wita.hour).toBe(0);
      expect(wita.minute).toBe(30);
      expect(witaDayOfWeek(wita)).toBe(0); // Monday
      expect(witaHour(wita)).toBe(0);
    });

    it('converts diverse inputs: DateTime, Date, epoch timestamp, and date strings', () => {
      const dt = DateTime.fromISO('2026-11-02T10:00:00Z');
      expect(toWita(dt).zoneName).toBe('Asia/Makassar');

      const jsDate = new Date('2026-11-02T10:00:00Z');
      expect(toWita(jsDate).hour).toBe(18); // 10Z + 8 = 18 WITA

      const epoch = jsDate.getTime();
      expect(toWita(epoch).hour).toBe(18);

      const nonIsoString = 'Mon, 02 Nov 2026 10:00:00 GMT';
      expect(toWita(nonIsoString).hour).toBe(18);
    });

    it('throws when input cannot be parsed into WITA', () => {
      expect(() => toWita('invalid-garbage-date-string')).toThrow(
        /Unable to convert input into WITA DateTime/,
      );
      expect(() => toWita(null as unknown as string)).toThrow(
        /Unable to convert input into WITA DateTime/,
      );
    });
  });

  describe('isOpen checks with complex ranges and boundaries', () => {
    const sampleHours: OpeningHoursMap = {
      // Monday: split shift (lunch 11:00-14:00, dinner 17:30-22:00)
      '0': [
        ['11:00', '14:00'],
        ['17:30', '22:00'],
      ],
      // Friday: night club / bar crossing midnight (18:00 to 02:00)
      '4': [['18:00', '02:00']],
      // Saturday: regular daytime 08:00 to 18:00
      '5': [['08:00', '18:00']],
      // Sunday is omitted (closed all day)
    };

    it('returns false when day is not present in openingHours or null/undefined', () => {
      // Sunday 12:00
      const sundayNoon = DateTime.fromISO('2026-11-08T12:00:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, sundayNoon)).toBe(false);
      expect(isOpen(null, sundayNoon)).toBe(false);
      expect(isOpen(undefined, sundayNoon)).toBe(false);
    });

    it('handles multiple same-day ranges correctly', () => {
      // Monday 10:59 (before lunch) -> closed
      const monPreLunch = DateTime.fromISO('2026-11-02T10:59:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, monPreLunch)).toBe(false);

      // Monday 11:00 (exact start) -> open
      const monLunchStart = DateTime.fromISO('2026-11-02T11:00:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, monLunchStart)).toBe(true);

      // Monday 14:00 (exact end) -> closed
      const monLunchEnd = DateTime.fromISO('2026-11-02T14:00:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, monLunchEnd)).toBe(false);

      // Monday 18:00 (dinner) -> open
      const monDinner = DateTime.fromISO('2026-11-02T18:00:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, monDinner)).toBe(true);
    });

    it('handles overnight cross-midnight ranges on both start day and following morning', () => {
      // Friday 17:59 -> closed
      const friEarly = DateTime.fromISO('2026-11-06T17:59:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, friEarly)).toBe(false);

      // Friday 23:30 -> open
      const friLate = DateTime.fromISO('2026-11-06T23:30:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, friLate)).toBe(true);

      // Saturday 01:30 (early morning spillover from Friday) -> open
      const satEarlySpillover = DateTime.fromISO('2026-11-07T01:30:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, satEarlySpillover)).toBe(true);

      // Saturday 02:00 (exact end of Friday overnight shift) -> closed
      const satOvernightEnd = DateTime.fromISO('2026-11-07T02:00:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, satOvernightEnd)).toBe(false);

      // Saturday 08:00 (Saturday regular open) -> open
      const satRegular = DateTime.fromISO('2026-11-07T08:00:00', { zone: 'Asia/Makassar' });
      expect(isOpen(sampleHours, satRegular)).toBe(true);
    });
  });

  describe('isWithinWindow for corridor penalties', () => {
    const windows: PenaltyWindow[] = [
      { days: [0, 1, 2, 3, 4], start: '10:00', end: '21:00' }, // Jl Raya Ubud Mon-Fri
      { days: [5, 6], start: '22:00', end: '04:00' }, // Weekend late night
    ];

    it('matches within weekday daytime window', () => {
      const monNoon = DateTime.fromISO('2026-11-02T12:00:00', { zone: 'Asia/Makassar' });
      expect(isWithinWindow(windows, monNoon)).toBe(true);

      const monMorning = DateTime.fromISO('2026-11-02T09:30:00', { zone: 'Asia/Makassar' });
      expect(isWithinWindow(windows, monMorning)).toBe(false);
    });

    it('matches cross-midnight penalty window', () => {
      const satLate = DateTime.fromISO('2026-11-07T23:30:00', { zone: 'Asia/Makassar' });
      expect(isWithinWindow(windows, satLate)).toBe(true);

      const sunEarly = DateTime.fromISO('2026-11-08T02:30:00', { zone: 'Asia/Makassar' });
      expect(isWithinWindow(windows, sunEarly)).toBe(true);

      const sunAfter = DateTime.fromISO('2026-11-08T05:00:00', { zone: 'Asia/Makassar' });
      expect(isWithinWindow(windows, sunAfter)).toBe(false);
    });

    it('returns false for null or empty windows', () => {
      const now = DateTime.fromISO('2026-11-02T12:00:00', { zone: 'Asia/Makassar' });
      expect(isWithinWindow(null, now)).toBe(false);
      expect(isWithinWindow([], now)).toBe(false);
    });
  });

  describe('pickQuietHours', () => {
    // Simulated 24h curve: peak at 12-14, quiet morning and night
    const curve24 = [
      5, 5, 5, 5, 10, 15, 20, 25, 40, 60, 75, 85, 90, 88, 80, 70, 55, 45, 30, 20, 15, 10, 8, 5,
    ];

    it('picks quiet open hours around target window', () => {
      const openHours: OpeningHoursMap = {
        '0': [['08:00', '18:00']],
      };
      // Target: Monday 13:00 (window +/- 4 hours: 09:00 to 17:00)
      const mondayAfternoon = DateTime.fromISO('2026-11-02T13:00:00', { zone: 'Asia/Makassar' });
      const { arrivalHours, departureHours } = pickQuietHours(curve24, openHours, mondayAfternoon, {
        windowHours: 4,
        count: 3,
      });

      expect(arrivalHours).toHaveLength(3);
      expect(departureHours).toHaveLength(3);
      // In range 9..17, lowest busyness are 9 (60), 17 (45), 16 (55)
      expect(arrivalHours).toEqual([9, 16, 17]);
      expect(departureHours).toEqual([11, 18, 19]);
    });

    it('falls back gracefully when venue has no openingHours specified or when open candidates are fewer than count', () => {
      const dt = DateTime.fromISO('2026-11-02T12:00:00', { zone: 'Asia/Makassar' });
      const { arrivalHours } = pickQuietHours(curve24, null, dt);
      expect(arrivalHours).toHaveLength(3);

      // Only 1 hour open in Monday window (12:00-13:00) while count=3
      const scarceHours: OpeningHoursMap = {
        '0': [['12:00', '13:00']],
      };
      const scarceResult = pickQuietHours(curve24, scarceHours, dt, { count: 3 });
      expect(scarceResult.arrivalHours).toHaveLength(3);

      // Incomplete curve (<24 values) falls back to default busyness 50
      const shortCurve = [10, 20];
      const shortResult = pickQuietHours(shortCurve, null, dt, { count: 2 });
      expect(shortResult.arrivalHours).toHaveLength(2);
    });
  });

  describe('Formatting utilities', () => {
    it('formats WITA in EN and ID locales', () => {
      const dt = DateTime.fromISO('2026-11-02T14:30:00', { zone: 'Asia/Makassar' });
      const en = formatWita(dt, 'en');
      const id = formatWita(dt, 'id');
      const custom = formatWita(dt, 'en', { dateStyle: 'short' });
      expect(en).toMatch(/14:30/);
      expect(id).toMatch(/14[.:]30/);
      expect(custom).toBeDefined();
    });

    it('formats local browser equivalent alongside WITA reference', () => {
      const dt = DateTime.fromISO('2026-11-02T14:30:00', { zone: 'Asia/Makassar' });
      const sameZone = formatLocalEquivalent(dt, 'Asia/Makassar', 'en');
      expect(sameZone).toContain('14:30');
      expect(sameZone).not.toContain('(');

      const diffZone = formatLocalEquivalent(dt, 'UTC', 'en');
      expect(diffZone).toContain('14:30');
      expect(diffZone).toContain('06:30');

      const idFormat = formatLocalEquivalent(dt, 'UTC', 'id');
      expect(idFormat).toContain('14');
    });
  });

  describe('Zod Schemas', () => {
    it('validates OpeningHoursSchema', () => {
      const valid: OpeningHoursMap = {
        '0': [['08:00', '17:00']],
        '1': [
          ['08:00', '12:00'],
          ['13:00', '18:00'],
        ],
      };
      expect(OpeningHoursSchema.parse(valid)).toEqual(valid);

      expect(() => OpeningHoursSchema.parse({ '7': [['08:00', '17:00']] })).toThrow();
      expect(() => OpeningHoursSchema.parse({ '0': [['25:00', '17:00']] })).toThrow();
    });

    it('validates PenaltyWindowSchema', () => {
      const valid: PenaltyWindow = {
        days: [0, 1, 2],
        start: '10:00',
        end: '21:00',
      };
      expect(PenaltyWindowSchema.parse(valid)).toEqual(valid);

      expect(() =>
        PenaltyWindowSchema.parse({ days: [7], start: '10:00', end: '21:00' }),
      ).toThrow();
    });
  });
});
