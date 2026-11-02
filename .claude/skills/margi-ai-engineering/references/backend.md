# Backend Reference — `apps/api` (NestJS 11, Prisma 7, Redis, MinIO)

Spec anchors: TDD §3 (layout), §4 (modules), §5 (data model), §10 (API), §11 (auth), §12 (Redis keys),
§14 (security), §15 (fallbacks), §16 (observability).

## 1. Layering

```text
Controller  → HTTP only: parse input (Zod DTO), call one service method, map result to response.
Service     → Domain logic and orchestration. Owns transactions. No req/res objects.
Repository  → Only for non-trivial SQL (pgvector, aggregates, raw queries). Simple CRUD uses PrismaService directly in the service.
Pure fns    → Scoring, time, canonicalization: packages/shared or a local *.ts with no Nest imports.
```

- One Nest module per feature folder listed in TDD §3; no "common services" module that grows forever.
- Controllers never contain `if` business rules, Prisma calls, or `try/catch` for flow control.
- Services never read `process.env`; inject the typed config.
- Keep constructor dependencies ≤ 5; more usually means the service does two jobs.

## 2. Configuration

```ts
// config/env.schema.ts
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive(),
  LLM_MOCK: z.stringbool().default(false),
  // … every key from TDD §18.2
});
export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    // Fail fast at boot with every invalid key listed; never print values.
    const keys = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${keys}`);
  }
  return parsed.data;
}
```

Register with `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })` and expose a small
typed `AppConfig` provider (getters grouped by concern: `ai`, `auth`, `storage`, `scoring`).
Confirm `z.stringbool()` exists in the installed Zod 4 version; otherwise use a small
`z.enum(['true','false']).transform(v => v === 'true')`.

## 3. Validation and DTOs

```ts
// Shared schema → Nest DTO; the global ZodValidationPipe validates it.
import { createZodDto } from 'nestjs-zod';
import { CreateTripInput } from '@margi-ai/shared/schemas';

export class CreateTripDto extends createZodDto(CreateTripInput) {}
```

- Schemas live in `packages/shared`; the API never redefines a payload shape.
- Multipart fields arrive as strings: the shared schema uses `z.coerce` / `z.stringbool` for them.
- Validate path params (`ParseUUIDPipe`) and query params (DTO) too.

## 4. Errors

```ts
// common/app.exception.ts
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}

// Usage: stable code, safe message, correct status.
throw new AppException('ANALYSIS_IMAGE_UNSUPPORTED', 'Unsupported image type', HttpStatus.UNSUPPORTED_MEDIA_TYPE);
```

- `AllExceptionsFilter` maps `AppException`, `ZodValidationException` (`VALIDATION_FAILED`, 400),
  `ThrottlerException` (`RATE_LIMITED`, 429), Nest `HttpException`, and unknown errors (`INTERNAL`, 500)
  into `{ error: { code, message, requestId } }`. Unknown errors are logged with stack; the client never sees it.
- Resource owned by someone else → **404**, not 403 (do not reveal existence).

## 5. Prisma 7

```ts
// prisma.config.ts (repo: apps/api)
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
});
```

```ts
// prisma/prisma.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfig) {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Verify the generator output path, import path, and `moduleFormat` against the Prisma 7 docs when
initializing (Clarification C-01); the snippet shows the shape, not a guaranteed path.

Rules:
- `select` only the fields you return; never send whole rows with `passwordHash` or `embedding` to clients.
- Multi-step writes go in `prisma.$transaction(async (tx) => { … })`.
- Raw SQL only through tagged templates (`$queryRaw\`…\``, `$executeRaw\`…\``); never `$queryRawUnsafe` with user input.
- `embedding` is `Unsupported("vector(1536)")`, so Prisma cannot read or write it. Use raw SQL:

```ts
// Writes a pgvector value. Values are bound parameters; the cast happens in SQL.
const literal = `[${vector.join(',')}]`;
await this.prisma.$executeRaw`
  UPDATE "Venue"
  SET embedding = ${literal}::vector, "embeddingModel" = ${model}
  WHERE id = ${venueId}::uuid`;
```

- Migrations: never edit an applied migration; create a new one. Hand-written SQL (extension, HNSW
  index) lives inside the migration file so `migrate deploy` reproduces it.

## 6. Redis

- One shared command client (`REDIS_CLIENT` token). Blocking commands (`XREAD BLOCK`) use
  `redis.duplicate()` per consumer and `quit()` in `finally` (Clarification C-13).
- All keys from `redisKeys.*` (TDD §12). Always set a TTL on cache keys.
- Cache helpers return `null` on Redis errors and log `warn`; a cache outage must never fail a request.

## 7. SSE endpoint pattern

Use the raw Express response so we control heartbeats, flushing, and shutdown.

```ts
const SSE_HEARTBEAT_MS = 15_000;
const STREAM_ID_PATTERN = /^\d+-\d+$/;

@Get(':id/stream')
async stream(
  @Param('id', new ParseUUIDPipe()) analysisId: string,
  @Headers('last-event-id') lastEventId: string | undefined,
  @Req() req: Request,
  @Res() res: Response,
): Promise<void> {
  // Access check runs before any header is written, so the exception filter can still respond.
  await this.analysisAccess.assertCanRead(analysisId, req);

  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const abort = new AbortController();
  req.on('close', () => abort.abort());
  const heartbeat = setInterval(() => res.write(': ping\n\n'), SSE_HEARTBEAT_MS);
  const afterId = lastEventId && STREAM_ID_PATTERN.test(lastEventId) ? lastEventId : undefined;

  try {
    for await (const { id, event } of this.eventBus.read(analysisId, { afterId, signal: abort.signal })) {
      res.write(`id: ${id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    }
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}
```

## 8. Starting background work

The orchestrator runs in-process after the 202 response. It must catch its own errors and finish
in a terminal state; the caller still attaches a last-resort handler.

```ts
void this.orchestrator.run(analysis.id).catch((error: unknown) => {
  this.logger.error({ err: error, analysisId: analysis.id }, 'Orchestrator escaped its error boundary');
});
return { analysisId: analysis.id, streamUrl: `/api/v1/analyses/${analysis.id}/stream` };
```

## 9. Auth essentials

```ts
// auth/cookies.ts — one definition of every auth cookie.
export const ACCESS_COOKIE = 'margi_at';
export const REFRESH_COOKIE = 'margi_rt';

export function accessCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 15 * 60 * 1000 };
}
export function refreshCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/api/v1/auth', maxAge: 7 * 24 * 60 * 60 * 1000 };
}
```

- Store only hashes of refresh and email tokens (`sha256`); compare with `crypto.timingSafeEqual` where comparing secrets in memory.
- Rotation and reuse detection happen in one transaction.
- `passport-jwt` extracts the token from the `margi_at` cookie, not the `Authorization` header.
- Ownership checks live in one `AnalysisAccessService` (user ID or hashed `margi_sid`), reused by every endpoint that reads an analysis.

## 10. Throttling

```ts
ThrottlerModule.forRootAsync({
  inject: [REDIS_CLIENT],
  useFactory: (redis: Redis) => ({
    throttlers: [{ name: 'default', ttl: seconds(60), limit: 60 }],
    storage: new ThrottlerStorageRedisService(redis),
  }),
});
```

Per-route limits with `@Throttle({ default: { limit: 6, ttl: seconds(60) } })`; add a named `daily`
throttler for the guest 40/day rule. For guest-vs-user limits, use a custom `ThrottlerGuard` that
picks the tracker (IP or user ID) and limit; check the installed `@nestjs/throttler` version's API.

## 11. Uploads

- `FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 1 } })`.
- Order: size limit (multer) → magic bytes (`file-type`) → `sanitizeImage` → hash → use. The original buffer is never stored or sent to the LLM.

## 12. Logging

- `nestjs-pino` with `genReqId` reading/setting `x-request-id`; child loggers per analysis (`logger.assign` or a child with `analysisId`).
- Redact: `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`, `*.password`, `*.token`, `*.apiKey`.
- One log line per stage with `ms`; avoid logging inside tight loops.
