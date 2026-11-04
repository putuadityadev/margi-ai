import { describe, expect, it } from 'vitest';
import { upcomingDeparture } from './savedPlan';

describe('upcomingDeparture', () => {
  const now = new Date('2026-11-05T02:00:00Z'); // 10:00 WITA

  it('keeps a departure that is still ahead', () => {
    expect(upcomingDeparture('2026-11-06T09:00:00+08:00', now)).toBe('2026-11-06T09:00:00+08:00');
  });

  it('moves a past departure to the same clock time later today when it is still ahead', () => {
    const result = upcomingDeparture('2026-10-01T15:30:00+08:00', now);
    expect(Date.parse(result)).toBeGreaterThan(now.getTime());
    expect(result.startsWith('2026-11-05T15:30')).toBe(true);
  });

  it('moves a past departure to tomorrow when that clock time has passed today', () => {
    const result = upcomingDeparture('2026-10-01T08:00:00+08:00', now);
    expect(result.startsWith('2026-11-06T08:00')).toBe(true);
  });
});
