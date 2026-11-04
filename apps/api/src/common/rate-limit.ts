import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/**
 * Fixed-window request limiter per key, in memory (single instance MVP). It protects the LLM
 * budget from a runaway client or script; a normal conversation never gets near the limits.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Counts one request for `key`; throws RATE_LIMITED once the window's allowance is used. */
  take(key: string, now: number = Date.now()): void {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      if (this.hits.size > 10_000) this.hits.clear();
      return;
    }
    entry.count += 1;
    if (entry.count > this.limit) {
      throw new AppException(
        'RATE_LIMITED',
        'Too many messages. Try again in a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
