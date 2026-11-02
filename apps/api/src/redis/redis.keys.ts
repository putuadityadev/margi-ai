/**
 * Named TTL constants in seconds for every Redis key family in TDD §12.
 */
export const REDIS_TTL_SECONDS = {
  VIBE_CACHE: 7 * 24 * 60 * 60,
  EMBEDDING_CACHE: 30 * 24 * 60 * 60,
  TELEMETRY_LIVE: 15 * 60,
  TELEMETRY_FORECAST: 60 * 60,
  ANALYSIS_EVENTS: 60 * 60,
  PRESET_LKG: 7 * 24 * 60 * 60,
  LLM_CIRCUIT_BREAKER_WINDOW: 60,
  LLM_CIRCUIT_BREAKER_OPEN: 30,
} as const;

/**
 * Single source of truth for every Redis key in MARGI AI (TDD §12).
 * Feature modules must build keys exclusively through this object.
 */
export const redisKeys = {
  vibeCache: (sha256: string, model: string): string => `cache:vibe:${sha256}:${model}`,
  embeddingCache: (textSha256: string, model: string): string => `cache:emb:${textSha256}:${model}`,
  telemetryLive: (venueId: string, yyyyMMddHH: string): string =>
    `telemetry:live:${venueId}:${yyyyMMddHH}`,
  telemetryForecast: (venueId: string): string => `telemetry:forecast:${venueId}`,
  analysisEvents: (analysisId: string): string => `analysis:${analysisId}:events`,
  presetLastKnownGood: (presetId: string, simulate: boolean): string =>
    `lkg:preset:${presetId}:${String(simulate)}`,
  llmCircuitBreaker: (): string => 'cb:llm',
  throttlePrefix: 'throttle:',
  throttleKey: (suffix: string): string => `throttle:${suffix}`,
} as const;
