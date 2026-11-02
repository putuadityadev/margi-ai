import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REDIS_TTL_SECONDS, redisKeys } from './redis.keys';

const RAW_KEY_PREFIX_PATTERN =
  /['"`](?:cache:vibe:|cache:emb:|telemetry:live:|telemetry:forecast:|analysis:[^'"`]*:events|lkg:preset:|cb:llm|throttle:)/;

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'generated') {
        continue;
      }
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('redisKeys', () => {
  it('builds every canonical Redis key shape defined in TDD §12', () => {
    expect(redisKeys.vibeCache('abc123', 'google/gemini-2.5-flash')).toBe(
      'cache:vibe:abc123:google/gemini-2.5-flash',
    );
    expect(redisKeys.embeddingCache('hash456', 'openai/text-embedding-3-small')).toBe(
      'cache:emb:hash456:openai/text-embedding-3-small',
    );
    expect(redisKeys.telemetryLive('venue-1', '2026110214')).toBe(
      'telemetry:live:venue-1:2026110214',
    );
    expect(redisKeys.telemetryForecast('venue-1')).toBe('telemetry:forecast:venue-1');
    expect(redisKeys.analysisEvents('0193-uuid')).toBe('analysis:0193-uuid:events');
    expect(redisKeys.presetLastKnownGood('lempuyang', true)).toBe('lkg:preset:lempuyang:true');
    expect(redisKeys.presetLastKnownGood('lempuyang', false)).toBe('lkg:preset:lempuyang:false');
    expect(redisKeys.llmCircuitBreaker()).toBe('cb:llm');
    expect(redisKeys.throttleKey('ip:127.0.0.1')).toBe('throttle:ip:127.0.0.1');
    expect(REDIS_TTL_SECONDS.VIBE_CACHE).toBe(604_800);
  });

  it('enforces that no source file outside redis.keys.ts hard-codes Redis key prefixes', () => {
    const srcRoot = join(__dirname, '..');
    const offenders: string[] = [];

    for (const file of collectSourceFiles(srcRoot)) {
      const rel = relative(srcRoot, file).split(sep).join('/');
      if (rel === 'redis/redis.keys.ts') {
        continue;
      }
      const source = readFileSync(file, 'utf8');
      if (RAW_KEY_PREFIX_PATTERN.test(source)) {
        offenders.push(rel);
      }
    }

    expect(offenders).toEqual([]);
  });
});
