import { describe, expect, it } from 'vitest';
import { formatDistanceKm, formatMinutes, formatNumber, formatWita } from './format';

describe('lib/format', () => {
  it('formats time to WITA (Asia/Makassar, UTC+8)', () => {
    // 2026-11-02T12:00:00Z is 20:00 WITA (UTC+8)
    const iso = '2026-11-02T12:00:00Z';
    const formatted = formatWita(iso);
    expect(formatted).toBe('20.00'); // ID default 24h format with dot separator
  });

  it('formats numbers with locale thousands separators', () => {
    expect(formatNumber(12500, 'en')).toBe('12,500');
    // In ID locale, thousands separator is period
    expect(formatNumber(12500, 'id')).toContain('12.500');
  });

  it('formats minutes for EN and ID', () => {
    expect(formatMinutes(45, 'en')).toBe('45 min');
    expect(formatMinutes(45, 'id')).toBe('45 mnt');
  });

  it('formats distance in kilometers', () => {
    expect(formatDistanceKm(2.4, 'en')).toBe('2.4 km');
    expect(formatDistanceKm(5, 'id')).toContain('5 km');
  });
});
