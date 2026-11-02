# Phase 00 — Foundation (Day 1)

Goal of the phase: an empty but production-shaped monorepo. Both apps boot, talk to local
Postgres/Redis/MinIO, CI is green, and a "hello world" build is live on Dokploy.

Exit criteria (PRD §12, Day 1): CI pipeline green, Postgres + pgvector active on the VPS.

---

### T-001 · Repository bootstrap and decision log
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D1
- **Depends on:** —
- **Spec:** TDD §0.1 (ADR-01), §3 · tasks/README.md (Spec clarifications)
- **Goal:** A git repository with a pnpm workspace layout and a decision log that later tasks append to.

**Scope**
- `git init`; default branch `main`.
- Root `package.json` (`"private": true`, `"packageManager": "pnpm@<pinned>"`, `"engines": { "node": ">=22" }`).
- `pnpm-workspace.yaml` with `apps/*` and `packages/*`.
- `.nvmrc` (`22`), `.editorconfig`, `.gitignore` (node_modules, dist, coverage, `.env*` except `.env.example`, generated Prisma client, Playwright reports).
- Root scripts (thin delegations, filled in by later tasks): `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `format`.
- `docs/DECISIONS.md` seeded with clarifications C-01 … C-20 from `tasks/README.md`, using a fixed entry format: `## D-xxx · Title`, `Date`, `Context`, `Decision`, `Consequences`, `Spec reference`.
- Stub `README.md` (one paragraph + "see docs/"); the full README is T-072.

**Out of scope**
- Any app code, CI, Docker.

**Files**
- `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.editorconfig`, `.gitignore`, `README.md`, `docs/DECISIONS.md`

**Acceptance criteria**
- [x] `pnpm install` succeeds on a clean clone with Node 22.
- [x] `docs/DECISIONS.md` contains entries for every clarification C-01 … C-20.
- [x] `.env` files cannot be committed (`git check-ignore .env` prints `.env`).

**Verify**
- `node -v` (22.x), `pnpm -v`, `pnpm install`, `git check-ignore .env`

---

### T-002 · Toolchain: TypeScript, ESLint, Prettier, test runners
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-001
- **Spec:** TDD §2 (Runtime, Testing), §13.5 (design lint rules)
- **Goal:** One shared, strict quality baseline that every package extends.

**Scope**
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `skipLibCheck`.
- ESLint flat config (`eslint.config.js`) with `typescript-eslint` (type-checked rules), `eslint-plugin-react-hooks` for web, `eslint-config-prettier`. Rules that matter: `no-console` (error), `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/consistent-type-imports`, `no-restricted-imports` for cross-app imports (`apps/web` must never import from `apps/api` and vice versa).
- Prettier config (single quotes, trailing commas, printWidth 100) + `.prettierignore`.
- Test runner baselines: Vitest config for `packages/shared` and `apps/web`, Jest for `apps/api` (Nest default), each with coverage output.
- `scripts/lint-design.mjs`: fails if `apps/web/src` contains `shadow-`, `font-semibold`, `font-bold`, `dangerouslySetInnerHTML`, or `crowd-` colour classes outside `features/results/` and `components/data/` (TDD §13.5). Wired into `pnpm lint`.

**Out of scope**
- Husky / lint-staged (CI is the gate; add only if requested).

**Files**
- `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `scripts/lint-design.mjs`, root `package.json` scripts

**Acceptance criteria**
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` run at the root and pass on the empty workspace.
- [x] A deliberate `console.log` in any package fails `pnpm lint`.
- [x] `lint-design` fails on a sample `shadow-md` class and passes after removal.

**Verify**
- `pnpm lint && pnpm typecheck && pnpm test`

---

### T-003 · Shared package skeleton (`packages/shared`)
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D1
- **Depends on:** T-002
- **Spec:** TDD §3 (shared note), ADR-01 · Clarification C-16
- **Goal:** `@margi-ai/shared` builds to ESM + CJS + types and is importable from both apps.

**Scope**
- `packages/shared/package.json` with `exports` map (`import` → ESM, `require` → CJS, `types`), `sideEffects: false`.
- `tsup` build (`entry: src/index.ts` plus subpath entries `scoring`, `schemas`, `time`, `constants`), `dev` script in watch mode.
- Folder skeleton: `src/constants/`, `src/time/`, `src/scoring/`, `src/schemas/`, `src/index.ts`.
- Runtime dependencies limited to `zod` and `luxon` (+ `@types/luxon` dev).

**Out of scope**
- Actual constants, schemas, scoring (T-012 … T-016).

**Files**
- `packages/shared/**`

**Acceptance criteria**
- [x] `pnpm --filter @margi-ai/shared build` emits `dist/` with `.js`, `.cjs`, `.d.ts`.
- [x] A placeholder export imports successfully from a Node CJS script and an ESM script.

**Verify**
- `pnpm --filter @margi-ai/shared build && node -e "require('@margi-ai/shared')"`

---

### T-004 · Local infrastructure (`docker-compose.dev.yml`)
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D1
- **Depends on:** T-001
- **Spec:** TDD §18.4, §18.1 (images) · `docs/DECISIONS.md` (D-021)
- **Goal:** One command brings up every backing service used in development and e2e.

**Scope**
- Services: `postgres` (`pgvector/pgvector:pg17`), `redis` (`redis:7-alpine`, AOF on), `minio` (+ a one-shot `minio-init` using `minio/mc` that creates `user-uploads` (private) and `public-venues` (public read)), `mailpit`.
- Health checks on every service; named volumes; ports bound to `127.0.0.1` only.
- Credentials come from `.env` (documented in `.env.example`, T-005), never hard-coded secrets beyond local defaults clearly marked as dev-only.

**Out of scope**
- Production compose (Dokploy handles prod, T-070).

**Files**
- `docker-compose.dev.yml`

**Acceptance criteria**
- [x] `docker compose -f docker-compose.dev.yml up -d` reports all services healthy.
- [x] `CREATE EXTENSION vector;` succeeds in the dev database.
- [x] Both buckets exist after first boot; Mailpit UI reachable on localhost.

**Verify**
- `docker compose -f docker-compose.dev.yml ps`, `psql … -c "CREATE EXTENSION IF NOT EXISTS vector"`

---

### T-005 · API bootstrap: NestJS 11, typed config, cross-cutting concerns
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-002, T-003, T-004
- **Spec:** TDD §4 (ConfigModule + cross-cutting), §18.2 (env list) · Clarification C-09
- **Goal:** The API boots only with valid env, logs JSON with request IDs, and returns the standard error shape.

**Scope**
- Scaffold `apps/api` (NestJS 11, Express platform). Remove scaffold demo controller/service.
- `config/env.schema.ts`: Zod schema covering **every** variable in TDD §18.2; `ConfigModule.forRoot({ validate })` fails fast with a readable list of invalid keys. Expose a typed `AppConfig` provider (no `process.env` access outside `config/`).
- `.env.example` at repo root: every key from TDD §18.2, values empty or safe defaults, grouped and commented.
- `main.ts`: `setGlobalPrefix('api')`, `enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`, `helmet()`, `cookie-parser`, `enableShutdownHooks()`, `trust proxy` (behind Traefik).
- `nestjs-pino` with redaction of `req.headers.cookie`, `req.headers.authorization`, `*.password`, `*.token`.
- `common/`: `RequestIdInterceptor` (`x-request-id` in/out, ULID or UUIDv7), `AllExceptionsFilter` producing `{ error: { code, message, requestId } }`, an `AppException` base class carrying a stable `code`, global `ZodValidationPipe` from `nestjs-zod`.
- `common/error-codes.ts`: string-literal union of error codes (start with `VALIDATION_FAILED`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `INTERNAL`).

**Out of scope**
- Database, Redis, health endpoints (T-006, T-007).

**Files**
- `apps/api/src/{main.ts,app.module.ts}`, `apps/api/src/config/**`, `apps/api/src/common/**`, `.env.example`

**Acceptance criteria**
- [x] Booting with a missing required env var exits non-zero and names the variable.
- [x] Any thrown `AppException` and any unknown error both return the standard error JSON with the request's `requestId`.
- [x] Log lines are JSON and never contain cookie or authorization values (unit test on the redaction config).
- [x] No file outside `config/` reads `process.env`.

**Verify**
- `pnpm --filter api test`, `pnpm --filter api start:dev`, `curl -i localhost:3000/api/v1/does-not-exist`

---

### T-006 · Prisma 7 schema and pgvector migration
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-005
- **Spec:** TDD §5, §7.3, ADR-03 · Clarifications C-01, C-02, C-03
- **Goal:** The full data model from TDD §5 exists in Postgres with a working HNSW cosine index.

**Scope**
- `apps/api/prisma.config.ts` (datasource URL via env, migrations path, seed command).
- `schema.prisma`: every model and enum in TDD §5, translated to Prisma 7 generator syntax (`provider = "prisma-client"`, explicit `output`, `moduleFormat` matching the API build). Add `Corridor.typicalDelayMinutes Int @default(0)` (C-02). Comment the day-of-week convention on every field that stores it (C-03).
- First migration, then hand-edit its SQL to add, in order: `CREATE EXTENSION IF NOT EXISTS vector;` before the `Venue` table, and `CREATE INDEX venue_embedding_hnsw ON "Venue" USING hnsw (embedding vector_cosine_ops);` after.
- `PrismaModule` / `PrismaService` constructed with `@prisma/adapter-pg`; disconnect on shutdown.
- Boot-time check: `EMBEDDING_DIMENSIONS` equals the `vector(n)` column dimension (query `pg_attribute`/`format_type`); mismatch aborts boot with a clear message (TDD §5 note).
- Root scripts `db:migrate`, `db:generate`, `db:reset`.

**Out of scope**
- Seed data (Phase 02).

**Files**
- `apps/api/prisma/**`, `apps/api/prisma.config.ts`, `apps/api/src/prisma/**`

**Acceptance criteria**
- [x] `pnpm db:migrate` on an empty database creates all tables, the `vector` extension, and the HNSW index.
- [x] `\d "Venue"` shows `embedding vector(1536)`.
- [x] Setting `EMBEDDING_DIMENSIONS=768` makes the API refuse to boot with a clear error.
- [x] Generated client is git-ignored and regenerated by `postinstall` or `db:generate`.

**Verify**
- `pnpm db:reset && pnpm db:migrate`, `psql -c '\d "Venue"'`, `psql -c '\di venue_embedding_hnsw'`

---

### T-007 · Redis, Storage, and Health modules
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-005
- **Spec:** TDD §4 (RedisModule, StorageModule, HealthModule), §9 (Storage rows), §10.6, §12 · Clarification C-09
- **Goal:** Shared infrastructure clients are injectable, and readiness reflects real dependency health.

**Scope**
- `RedisModule`: one ioredis command client (global provider) + a `createBlockingClient()` factory (returns `duplicate()`, caller must `quit()`), graceful shutdown. A `redisKeys` helper module that builds every key from TDD §12 (no string-literal keys elsewhere).
- `StorageModule`: `putObject`, `deleteObject`, `presignGet(key, ttlSeconds = 300)` using `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` with `forcePathStyle: true` for MinIO.
- `HealthModule` (`@nestjs/terminus`), controller `VERSION_NEUTRAL`: `GET /api/health` (liveness, no dependencies) and `GET /api/health/ready` (Postgres `SELECT 1`, Redis `PING`, MinIO `HeadBucket`). OpenRouter ping is added in T-022 with a 60 s cache.

**Out of scope**
- Throttler storage (T-036), event bus (T-030).

**Files**
- `apps/api/src/redis/**`, `apps/api/src/storage/**`, `apps/api/src/health/**`

**Acceptance criteria**
- [x] `/api/health` returns 200 even with Redis stopped; `/api/health/ready` returns 503 and names the failing dependency.
- [x] Every Redis key in the codebase is produced by `redisKeys` (grep check in review).
- [x] Storage round-trip test (put → presign → GET → delete) passes against local MinIO.

**Verify**
- `curl localhost:3000/api/health/ready`, `docker compose stop redis` then re-check, `pnpm --filter api test`

---

### T-008 · Web bootstrap: Vite 7, React 19, Router 7, TanStack Query, Tailwind v4
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D1
- **Depends on:** T-002, T-003
- **Spec:** TDD §2 (Frontend), §13.1, §18.4 · `docs/DECISIONS.md` (D-022)
- **Goal:** `pnpm dev` serves an empty React app on :5173 that proxies `/api` to the API.

**Scope**
- Scaffold `apps/web` (Vite React-TS), remove template demo code and assets.
- `@tailwindcss/vite` plugin and `src/styles/index.css` with `@import "tailwindcss";` (tokens come in T-040).
- `vite.config.ts`: dev proxy `/api` → `http://localhost:3000` (no rewrite, `ws: false`), path alias `@/` → `src/`.
- `src/main.tsx` → `src/app/providers.tsx` (`QueryClientProvider` with sane defaults: `staleTime` 30 s, `retry` 1 for queries, 0 for mutations) → `src/app/router.tsx` (`createBrowserRouter` from `react-router`) with a placeholder `/` and `*`.
- Folder skeleton from TDD §3 (`app/`, `pages/`, `features/`, `components/ui/`, `lib/`, `stores/`, `locales/`).
- Root `pnpm dev` runs shared (watch), api, and web in parallel.

**Out of scope**
- Design tokens, components, i18n (Phase 05).

**Files**
- `apps/web/**`, root `package.json` (`dev` script)

**Acceptance criteria**
- [x] `pnpm dev` starts all three processes; `http://localhost:5173/api/health` returns the API's health JSON through the proxy.
- [x] Unknown routes render the `*` placeholder, not a blank page.
- [x] `pnpm --filter web build` succeeds with zero type errors.

**Verify**
- `pnpm dev`, `curl localhost:5173/api/health`, `pnpm --filter web build`

---

### T-009 · CI pipeline (GitHub Actions)
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D1
- **Depends on:** T-002, T-006, T-008
- **Spec:** TDD §18.3, §14 (gitleaks, pnpm audit)
- **Goal:** Every push runs the same quality gate the developer runs locally.

**Scope**
- `.github/workflows/ci.yml`, job `quality`: checkout → pnpm (cache) → Node 22 → `pnpm install --frozen-lockfile` → `pnpm --filter @margi-ai/shared build` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `gitleaks` (official action) → `pnpm audit --prod --audit-level=high`.
- Job `build`: `docker build` for `apps/api` and `apps/web` with GHA cache (depends on T-010; add the job in T-010 if not ready).
- `concurrency` group to cancel superseded runs.
- The `e2e` job is added in T-068.

**Out of scope**
- Deployment triggers (Dokploy webhook, T-011).

**Files**
- `.github/workflows/ci.yml`

**Acceptance criteria**
- [ ] First push to GitHub shows a green `quality` job.
- [ ] A commit containing a fake `sk-or-v1-…` key fails the gitleaks step.

**Verify**
- Push a branch, open the Actions tab.

---

### T-010 · Dockerfiles and Nginx config
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-006, T-008
- **Spec:** TDD §18.1
- **Goal:** Small, reproducible production images for `api` and `web`.

**Scope**
- `apps/api/Dockerfile`: multi-stage on `node:22-alpine` — `pnpm fetch`/`install --frozen-lockfile`, build shared + api, `pnpm deploy --prod` to prune, run as non-root `node`. Entrypoint runs `prisma migrate deploy` then `node dist/main.js`. `HEALTHCHECK` on `/api/health`. `sharp` must work on Alpine (musl) — verify.
- `apps/web/Dockerfile`: build stage (Vite, build args `VITE_APP_URL`, `VITE_API_BASE`) → `nginx:alpine` serving `dist/`.
- `apps/web/nginx.conf`: `try_files $uri /index.html`; `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`; `no-cache` for `index.html`; gzip on.
- `.dockerignore` at root.

**Out of scope**
- CSP headers (set by the API/helmet for API routes and by nginx in T-066).

**Files**
- `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/web/nginx.conf`, `.dockerignore`

**Acceptance criteria**
- [ ] Both images build locally; API image < 300 MB, web image < 60 MB.
- [ ] `docker run` of the API image against the dev compose network migrates and serves `/api/health`.
- [ ] Deep link `/app/a/xyz` served by the web image returns `index.html`.

**Verify**
- `docker build -f apps/api/Dockerfile .`, `docker images`, `curl -I localhost:8080/app/a/xyz`

---

### T-011 · Dokploy skeleton deployment
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-009, T-010
- **Spec:** TDD §18.1, ADR-10 · PRD Q-02 · Clarification C-07
- **Goal:** "Hello world" builds of web and API are live on one domain with HTTPS.

**Scope**
- Dokploy project with services `postgres` (pgvector image, persistent volume), `redis` (AOF), `minio`, `api`, `web`.
- Traefik routing on one host: `PathPrefix(/api)` → `api:3000`, everything else → `web:80`; Let's Encrypt TLS.
- Environment secrets set in Dokploy per service (never in the repo).
- Auto-deploy webhook on push to `main`.
- Record the chosen domain (Q-02) and the deploy topology in `docs/DECISIONS.md`.

**Out of scope**
- Backups, uptime monitoring, warm-cache (T-070).

**Files**
- `docs/DECISIONS.md` (entry), optionally `docs/deploy.md` with the exact Dokploy settings.

**Acceptance criteria**
- [ ] `https://<domain>/` serves the web placeholder; `https://<domain>/api/health` returns 200.
- [ ] `https://<domain>/api/health/ready` returns 200 (Postgres with `vector` extension, Redis, MinIO reachable).
- [ ] A push to `main` redeploys automatically.

**Verify**
- `curl -I https://<domain>/`, `curl https://<domain>/api/health/ready`
