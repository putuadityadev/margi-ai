import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { BalineseDate, getRahinan, Rahinan } from 'balinese-date-js';
import { toWita } from '@margi-ai/shared';
import { z } from 'zod';
import { httpJson } from '../common/http-json';

const HOLIDAY_API = 'https://api-hari-libur.pages.dev/api';
const HOLIDAY_TIMEOUT_MS = 6_000;
const HOLIDAY_REFRESH_MS = 24 * 60 * 60 * 1000;

const HolidaysSchema = z.array(
  z.object({ name: z.string(), date: z.string(), is_national_holiday: z.boolean() }),
);

/** Crowd multipliers by day type. Calibration values, to be tuned against BestTime (T-093). */
const HOLIDAY_MULTIPLIER = 1.2;
const CUTI_BERSAMA_MULTIPLIER = 1.1;
const GALUNGAN_KUNINGAN_MULTIPLIER = 1.1;
/** Nyepi: roads are closed and everything shuts, so near-zero visitors (the island stays home). */
const NYEPI_MULTIPLIER = 0.05;

/**
 * Monthly foreign-arrival index from BRD §1 (Bali, 2024–2025): arrivals divided by the mean of
 * the six months with published figures. Months without a figure stay at 1.0 until the BPS
 * WebAPI is wired (DATA-SOURCES §5). Applied at half strength so it nudges, not dominates.
 */
const SEASON_INDEX: Readonly<Record<number, number>> = Object.freeze({
  3: 0.82,
  4: 0.88,
  5: 0.96,
  6: 0.91,
  7: 1.22,
  8: 1.2,
});
const SEASON_STRENGTH = 0.5;

export interface DayContext {
  readonly multiplier: number;
  /** Plain-language reasons for the multiplier, shown in the Copilot trace. */
  readonly reasons: readonly string[];
}

/**
 * Real-world context that scales the crowd model: Indonesian public holidays and cuti bersama
 * (API Hari Libur), Balinese holy days computed locally, and the monthly arrival season.
 * Holidays are fetched once per day; if the API is unreachable the previous list (or none) is
 * used and the model simply falls back to weekday and weekend curves.
 */
@Injectable()
export class ContextService implements OnModuleInit {
  private readonly logger = new Logger(ContextService.name);
  /** ISO date (WITA) -> whether it is a national holiday (true) or cuti bersama (false). */
  private holidays = new Map<string, boolean>();
  private loadedYears = new Set<number>();

  async onModuleInit(): Promise<void> {
    const year = toWita(new Date()).year;
    await this.loadYear(year);
    setInterval(() => void this.loadYear(toWita(new Date()).year), HOLIDAY_REFRESH_MS).unref();
  }

  /** Multiplier and reasons for a WITA instant. Synchronous so the engine can call it per hour. */
  dayContext(at: Date | string): DayContext {
    const wita = toWita(at);
    const isoDate = wita.toISODate() ?? '';
    const reasons: string[] = [];
    let multiplier = 1;

    const holiday = this.holidays.get(isoDate);
    if (holiday === true) {
      multiplier *= HOLIDAY_MULTIPLIER;
      reasons.push('public holiday');
    } else if (holiday === false) {
      multiplier *= CUTI_BERSAMA_MULTIPLIER;
      reasons.push('collective leave');
    }

    const holyDays = getRahinan(new BalineseDate(wita.toJSDate()));
    if (holyDays.some((day) => day.id === Rahinan.NYEPI)) {
      return { multiplier: NYEPI_MULTIPLIER, reasons: ['Nyepi (Day of Silence)'] };
    }
    if (holyDays.some((day) => day.id === Rahinan.GALUNGAN || day.id === Rahinan.KUNINGAN)) {
      multiplier *= GALUNGAN_KUNINGAN_MULTIPLIER;
      reasons.push('Galungan or Kuningan');
    }

    const season = SEASON_INDEX[wita.month];
    if (season !== undefined) {
      multiplier *= 1 + (season - 1) * SEASON_STRENGTH;
      reasons.push(season >= 1 ? 'high season' : 'low season');
    }
    return { multiplier, reasons };
  }

  /** Function form expected by the engine's `crowdMultiplier` hook. */
  crowdMultiplier = (at: { toJSDate(): Date }): number => this.dayContext(at.toJSDate()).multiplier;

  private async loadYear(year: number): Promise<void> {
    try {
      const raw = await httpJson(`${HOLIDAY_API}?year=${year}`, { timeoutMs: HOLIDAY_TIMEOUT_MS });
      const rows = HolidaysSchema.parse(raw);
      for (const row of rows) this.holidays.set(row.date, row.is_national_holiday);
      this.loadedYears.add(year);
      this.logger.log({ year, count: rows.length }, 'Holiday calendar loaded');
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown';
      this.logger.warn({ year, detail }, 'Holiday calendar unavailable; using weekday curves only');
    }
  }
}
