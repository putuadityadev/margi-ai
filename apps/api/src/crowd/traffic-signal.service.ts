import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { httpJson } from '../common/http-json';
import { TtlCache } from '../common/ttl-cache';
import { AppConfig } from '../config/app-config.service';

const FLOW_URL = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';
const FLOW_TIMEOUT_MS = 3_000;
const SIGNAL_TTL_MS = 15 * 60 * 1000;
const MAX_CONCURRENT = 5;
/** Free tier is 20,000 calls a month (DATA-SOURCES §1); this keeps a busy day well inside it. */
const DAILY_CALL_BUDGET = 600;
/** Below this confidence TomTom's own estimate of the flow is too thin to rely on. */
const MIN_CONFIDENCE = 0.5;

const FlowSchema = z.object({
  flowSegmentData: z.object({
    currentSpeed: z.number(),
    freeFlowSpeed: z.number(),
    confidence: z.number(),
    roadClosure: z.boolean().optional(),
  }),
});

export interface VenuePoint {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
}

/**
 * Live congestion on the road beside a venue (TomTom Traffic Flow). A tailback toward an
 * attraction is a real, current sign that many people are arriving, so it lifts the modelled
 * crowd for visits happening now. It is an indirect signal, not a head count, and the UI says so.
 *
 * A venue with no signal (no key, budget used, provider error, low confidence) is simply absent
 * from the result: its reading stays the plain model and is labelled that way. Nothing is guessed.
 */
@Injectable()
export class TrafficSignalService {
  private readonly logger = new Logger(TrafficSignalService.name);
  private readonly cache = new TtlCache<number>(SIGNAL_TTL_MS, 500);
  private budgetDay = '';
  private callsToday = 0;

  constructor(private readonly config: AppConfig) {}

  /** Congestion 0 (free flow) to 1 (standstill) per venue id, for venues that have a usable signal. */
  async congestion(venues: readonly VenuePoint[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!this.config.providers.tomTomKey) return result;

    const missing: VenuePoint[] = [];
    for (const venue of venues) {
      const cached = this.cache.get(venue.id);
      if (cached === undefined) missing.push(venue);
      else result.set(venue.id, cached);
    }
    for (let start = 0; start < missing.length; start += MAX_CONCURRENT) {
      const batch = missing.slice(start, start + MAX_CONCURRENT);
      const values = await Promise.all(batch.map((venue) => this.fetchOne(venue)));
      batch.forEach((venue, index) => {
        const value = values[index];
        if (value !== null && value !== undefined) {
          this.cache.set(venue.id, value);
          result.set(venue.id, value);
        }
      });
    }
    return result;
  }

  private consumeBudget(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.budgetDay) {
      this.budgetDay = today;
      this.callsToday = 0;
    }
    if (this.callsToday >= DAILY_CALL_BUDGET) return false;
    this.callsToday += 1;
    return true;
  }

  private async fetchOne(venue: VenuePoint): Promise<number | null> {
    const key = this.config.providers.tomTomKey;
    if (!key || !this.consumeBudget()) return null;
    try {
      const params = new URLSearchParams({
        key,
        point: `${venue.lat},${venue.lng}`,
        unit: 'kmph',
      });
      const raw = await httpJson(`${FLOW_URL}?${params.toString()}`, {
        timeoutMs: FLOW_TIMEOUT_MS,
        headers: { 'user-agent': this.config.providers.userAgent },
      });
      const flow = FlowSchema.parse(raw).flowSegmentData;
      if (flow.confidence < MIN_CONFIDENCE || flow.freeFlowSpeed <= 0) return null;
      if (flow.roadClosure) return 1;
      return Math.min(1, Math.max(0, 1 - flow.currentSpeed / flow.freeFlowSpeed));
    } catch (error: unknown) {
      this.logger.warn(
        { detail: error instanceof Error ? error.message : 'unknown' },
        'Flow call failed',
      );
      return null;
    }
  }
}
