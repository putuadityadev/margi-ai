interface Entry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

/**
 * Small in-process cache with per-entry TTL and a size cap (oldest entry evicted first).
 * Single-instance MVP replacement for Redis cache keys (DECISIONS D-028); every consumer
 * treats a miss as normal, so swapping the backing store later changes no call site.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 2_000,
  ) {}

  get(key: string, now: number = Date.now()): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, now: number = Date.now()): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
  }

  get size(): number {
    return this.entries.size;
  }
}
