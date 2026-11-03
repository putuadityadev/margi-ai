import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { validateEnv } from './env.schema';

const VALID_BASE_ENV: Record<string, unknown> = {
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:5173',
  API_PORT: '3000',
  DATABASE_URL: 'postgresql://margi:margi_dev_only@127.0.0.1:5432/margi_dev?schema=public',
  REDIS_URL: 'redis://127.0.0.1:6379',
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_ACCESS_KEY: 'minioadmin',
  S3_SECRET_KEY: 'minioadmin_secret',
  JWT_ACCESS_SECRET: 'test-jwt-secret-min-8-chars',
};

function collectTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'generated') {
        continue;
      }
      results.push(...collectTypeScriptFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('validateEnv', () => {
  it('parses valid environment configuration and applies defaults', () => {
    const parsed = validateEnv({ ...VALID_BASE_ENV, LLM_MOCK: 'true' });

    expect(parsed.API_PORT).toBe(3000);
    expect(parsed.EMBEDDING_DIMENSIONS).toBe(768);
    expect(parsed.LLM_MOCK).toBe(true);
    expect(parsed.COS_FLOOR).toBe(0.6);
    expect(parsed.COS_CEIL).toBe(0.9);
  });

  it('throws a clear error naming missing required variables without leaking values', () => {
    const raw = {
      ...VALID_BASE_ENV,
      DATABASE_URL: undefined,
      JWT_ACCESS_SECRET: 'short',
      S3_SECRET_KEY: 'top-secret-do-not-print',
    };

    let caught: Error | undefined;
    try {
      validateEnv(raw);
    } catch (error) {
      caught = error as Error;
    }

    expect(caught).toBeDefined();
    expect(caught?.message).toContain('DATABASE_URL');
    expect(caught?.message).toContain('JWT_ACCESS_SECRET');
    expect(caught?.message).not.toContain('top-secret-do-not-print');
    expect(caught?.message).not.toContain('short');
  });

  it('rejects COS_FLOOR >= COS_CEIL', () => {
    expect(() =>
      validateEnv({
        ...VALID_BASE_ENV,
        COS_FLOOR: '0.9',
        COS_CEIL: '0.9',
      }),
    ).toThrow(/COS_FLOOR/);
  });

  it('enforces that no non-config source file reads process.env directly', () => {
    const srcRoot = join(__dirname, '..');
    const files = collectTypeScriptFiles(srcRoot);
    const offenders: string[] = [];

    for (const file of files) {
      const rel = relative(srcRoot, file).split(sep).join('/');
      if (rel.startsWith('config/')) {
        continue;
      }
      const source = readFileSync(file, 'utf8');
      if (/\bprocess\.env\b/.test(source)) {
        offenders.push(rel);
      }
    }

    expect(offenders).toEqual([]);
  });
});
