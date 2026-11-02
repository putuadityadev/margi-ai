# Architecture & Spec Decision Log (`DECISIONS.md`)

This document records reviewed spec clarifications, deliberate deviations, and resolved open questions for **MARGI AI**. Newest entries supersede older entries when they touch the same topic.

---

## D-001 · Prisma 7 configuration and pgvector setup (C-01)
- **Date:** 2026-11-02
- **Context:** TDD §5 illustrates the data model using Prisma <= 6 generator and datasource syntax (`provider = "prisma-client-js"`, `url = env("DATABASE_URL")` inside `schema.prisma`, and `previewFeatures = ["postgresqlExtensions"]`). Prisma 7 moved datasource URLs to `prisma.config.ts`, uses `provider = "prisma-client"` with an explicit `output` directory, and connects at runtime via `@prisma/adapter-pg`.
- **Decision:** Adopt Prisma 7 conventions (`apps/api/prisma.config.ts` holds the datasource URL and migration/seed configuration; `generator client` uses `provider = "prisma-client"` and explicit `output`; `PrismaService` instantiates `PrismaPg`). Create the `vector` extension and HNSW index explicitly inside the initial SQL migration rather than relying on `postgresqlExtensions` preview flags.
- **Consequences:** Migrations remain deterministic under `prisma migrate deploy`, environment loading is explicit, and generated client code stays outside version control.
- **Spec reference:** TDD §5, §7.3 · `tasks/README.md` (C-01)

---

## D-002 · Add `typicalDelayMinutes` to `Corridor` model (C-02)
- **Date:** 2026-11-02
- **Context:** TDD §6.5 step 6 computes `corridorDelay(v, t)` from `corridor.typicalDelayMinutes`, but the Prisma `Corridor` model in TDD §5 omitted that column.
- **Decision:** Add `typicalDelayMinutes Int @default(0)` to the `Corridor` model in `schema.prisma` and populate it in seed data.
- **Consequences:** Agent 3 impact metrics (`timeSaved`) can compute corridor gridlock savings deterministically from database records without hard-coded lookup tables.
- **Spec reference:** TDD §5, §6.5 · `tasks/README.md` (C-02)

---

## D-003 · Unified `0 = Monday … 6 = Sunday` day-of-week convention (C-03)
- **Date:** 2026-11-02
- **Context:** JavaScript `Date#getDay()` uses `0 = Sunday`, Luxon `DateTime#weekday` uses `1 = Monday … 7 = Sunday`, and BestTime foot-traffic forecasts use `0 = Monday … 6 = Sunday`. Mixing conventions risks off-by-one crowd lookups on weekends.
- **Decision:** Enforce `0 = Monday … 6 = Sunday` everywhere (`HourlyForecast.dayOfWeek`, `Venue.openingHours` keys, `Preset.defaultDay` / `simPeakDay`, and `Corridor.penaltyWindows[].days`). Convert exclusively via `witaDayOfWeek()` (`dt.weekday - 1` in `Asia/Makassar`) and ban `Date#getDay()` in domain code.
- **Consequences:** Forecast curves, opening hours, and BestTime imports align without translation layers.
- **Spec reference:** TDD §5, §7.1 · `tasks/README.md` (C-03)

---

## D-004 · Native Zod 4 JSON Schema generation (C-04)
- **Date:** 2026-11-02
- **Context:** TDD §6.2 mentioned `zod-to-json-schema`, which was needed for Zod 3. Zod 4 ships native `z.toJSONSchema()`, and `nestjs-zod` supports Zod 4 directly.
- **Decision:** Standardize on Zod 4 across `packages/shared`, `apps/api`, and `apps/web`, using native `z.toJSONSchema()` for OpenRouter structured outputs and omitting `zod-to-json-schema`.
- **Consequences:** One fewer third-party dependency and guaranteed parity between runtime validation and LLM JSON schemas.
- **Spec reference:** TDD §2, §6.2 · `tasks/README.md` (C-04)

---

## D-005 · Numeric `corridorPenalty` parameter type in `cfs()` (C-05)
- **Date:** 2026-11-02
- **Context:** TDD §7.2 typed `corridorPenalty` as literal `0 | 25`, whereas TDD §7 also specifies that scoring constants and thresholds are overridable via environment configuration.
- **Decision:** Type `corridorPenalty` as `number` in `cfs()`, defaulting the active penalty constant to `25` in `packages/shared/constants`.
- **Consequences:** Environment overrides for corridor penalties work cleanly without type casts.
- **Spec reference:** BRD §7.2 · TDD §7, §7.2 · `tasks/README.md` (C-05)

---

## D-006 · Curated dataset target set to 40–60 entities (C-06)
- **Date:** 2026-11-02
- **Context:** BRD §8.1 specified 30–40 curated Bali entities, while product review in PRD D-06 expanded the seed target to 40–60 entities (~15 viral/alternative DTWs + ~25–30 MSMEs) for richer demos.
- **Decision:** Target 40–60 curated entities in the seed pipeline, superseding the narrower 30–40 figure in BRD §8.1.
- **Consequences:** Every hotspot preset has enough calm micro and regional candidates plus MSME pairings across categories without exhausting relaxation steps.
- **Spec reference:** BRD §8.1 · PRD D-06 · TDD §19 · `tasks/README.md` (C-06)

---

## D-007 · Self-hosted VPS via Dokploy deployment topology (C-07)
- **Date:** 2026-11-02
- **Context:** BRD §10.2 contained early placeholder examples mentioning Vercel/Railway, whereas TDD ADR-10 finalized deployment on a single self-hosted VPS managed by Dokploy behind Traefik (`/` -> `web`, `/api` -> `api`).
- **Decision:** Deploy all services (`web`, `api`, `postgres`, `redis`, `minio`) on a single VPS via Dokploy under one HTTPS origin.
- **Consequences:** Same-origin routing eliminates cross-site cookie issues (`SameSite=Lax` works natively) and keeps infrastructure costs predictable.
- **Spec reference:** BRD §10.2 · TDD ADR-10, §18.1 · `tasks/README.md` (C-07)

---

## D-008 · Redis throttler storage via `@nest-lab/throttler-storage-redis` (C-08)
- **Date:** 2026-11-02
- **Context:** `@nestjs/throttler` does not bundle a Redis storage implementation out of the box.
- **Decision:** Use `@nest-lab/throttler-storage-redis` backed by the shared `ioredis` command client, with graceful fallback if Redis is temporarily unreachable.
- **Consequences:** Rate-limit counters survive API container restarts without custom Lua scripts.
- **Spec reference:** TDD ADR-08, §4, §12 · `tasks/README.md` (C-08)

---

## D-009 · URI API versioning (`/api/v1/*`) with neutral health routes (C-09)
- **Date:** 2026-11-02
- **Context:** TDD §10 specifies `/api/v1/*` for domain endpoints while TDD §10.6 and §18.1 specify `/api/health` and `/api/health/ready` for container and uptime checks.
- **Decision:** Configure NestJS with `setGlobalPrefix('api')` and `enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`, and mark `HealthController` as `VERSION_NEUTRAL`.
- **Consequences:** Domain routes resolve under `/api/v1/*` while health probes stay stable at `/api/health` and `/api/health/ready`.
- **Spec reference:** TDD §10, §10.6, §18.1 · `tasks/README.md` (C-09)

---

## D-010 · Hotspot corridors modeled as `STREET_CORRIDOR` venues (C-10)
- **Date:** 2026-11-02
- **Context:** `Analysis.originVenueId` is a foreign key to `Venue`, and users can pick congested corridors such as Jl. Raya Ubud or Bypass Sanur as origins (`GET /api/v1/origins`).
- **Decision:** Seed hotspot corridors as `Venue` records with `category = STREET_CORRIDOR`, `isHotspot = true`, and a relation to their `Corridor` penalty definition; `GET /api/v1/origins` queries active venues where `isHotspot = true`.
- **Consequences:** Referential integrity on `Analysis.originVenueId` holds without polymorphic origin tables.
- **Spec reference:** TDD §5, §10.1, §19 · `tasks/README.md` (C-10)

---

## D-011 · Single-pass telemetry fetch across relaxation ladder steps (C-11)
- **Date:** 2026-11-02
- **Context:** Agent 2 evaluates crowd telemetry for all top-K candidates from Agent 1, and Agent 3 applies a 3-step relaxation ladder if fewer than 2 candidates pass strict thresholds.
- **Decision:** Agent 2 fetches telemetry snapshots once for all top-K candidates and reports step-0 pass/reject status; Agent 3 re-filters those in-memory snapshots when stepping down the relaxation ladder.
- **Consequences:** Latency stays bounded within the 1.5 s Agent 2 budget and avoids duplicate external API calls.
- **Spec reference:** TDD §6.4, §6.5, §6.6 · `tasks/README.md` (C-11)

---

## D-012 · Owner-scoped analysis permalinks in MVP v1.0 (C-12)
- **Date:** 2026-11-02
- **Context:** PRD F-09 includes "Copy link" (`/app/a/:id`), while TDD §6.7 and §14 enforce owner-only access (`userId` or matching `margi_sid` cookie hash) to protect guest/user history from enumeration. Public sharing is slated for v2 (`F-15` Shareable Trip Card).
- **Decision:** Keep `GET /api/v1/analyses/:id` and `/app/a/:id` owner-scoped in `v1.0-submission` (returning 404 on mismatch). Revisit explicit public share tokens in `F-15` (`v2.0-final`).
- **Consequences:** Prevents IDOR leaks of user-uploaded context while allowing owners and judges in the same browser session to bookmark and reload analyses.
- **Spec reference:** PRD F-09, F-15 · TDD §6.7, §14 · `tasks/README.md` (C-12)

---

## D-013 · Dedicated duplicated Redis connections for blocking SSE reads (C-13)
- **Date:** 2026-11-02
- **Context:** Redis `XREAD BLOCK` monopolizes its TCP connection for the duration of the block window, which would stall cache and throttler commands if run on the shared client.
- **Decision:** Expose a `createBlockingClient()` factory on `RedisService` using `redis.duplicate()`, and ensure every SSE consumer closes (`quit()`) its dedicated client in a `finally` block.
- **Consequences:** Concurrent SSE streams never starve regular Redis operations or leak connections on client disconnect.
- **Spec reference:** TDD ADR-06, §6.7, §12 · `tasks/README.md` (C-13)

---

## D-014 · `MailTransport` abstraction for Resend (prod) and SMTP/Mailpit (dev/e2e) (C-14)
- **Date:** 2026-11-02
- **Context:** TDD §4 specifies Resend in production and Mailpit in local dev/e2e, but the Resend HTTP SDK only speaks to Resend's cloud API, not SMTP.
- **Decision:** Introduce a minimal `MailTransport` interface with two implementations: `ResendMailTransport` (production) and `SmtpMailTransport` via `nodemailer` targeting Mailpit (development/test). Keep email templates as typed bilingual functions returning `{ subject, html, text }`.
- **Consequences:** Local development and Playwright verification flows work offline against Mailpit without consuming Resend quota.
- **Spec reference:** TDD §4, §11, §17 · `tasks/README.md` (C-14)

---

## D-015 · Stateless OAuth state + PKCE cookie store (C-15)
- **Date:** 2026-11-02
- **Context:** Passport's default Google OAuth PKCE/state verification expects `express-session`, whereas MARGI AI uses stateless `httpOnly` JWT/refresh cookies.
- **Decision:** Implement a custom Passport `StateStore` storing `{ state, codeVerifier, next }` in a short-lived (10-minute), HMAC-signed `httpOnly` cookie (`margi_oauth_state`).
- **Consequences:** Full CSRF and PKCE protection on Google SSO without adding server-side session middleware.
- **Spec reference:** TDD ADR-07, §11 · `tasks/README.md` (C-15)

---

## D-016 · Dual ESM + CJS build for `@margi-ai/shared` via `tsup` (C-16)
- **Date:** 2026-11-02
- **Context:** NestJS compiles and runs as CommonJS by default, whereas Vite 7 bundles ESM. Importing raw TypeScript across module boundaries causes resolution friction in Docker builds and Jest/Vitest runners.
- **Decision:** Build `@margi-ai/shared` with `tsup` emitting ESM (`.js`), CJS (`.cjs`), and declaration (`.d.ts`) outputs across subpath exports (`.`, `./constants`, `./time`, `./scoring`, `./schemas`), running `tsup --watch` in `pnpm dev`.
- **Consequences:** Both `apps/api` and `apps/web` consume clean, standard package exports in dev, test, and production Docker builds.
- **Spec reference:** TDD ADR-01, §3 · `tasks/README.md` (C-16)

---

## D-017 · Self-hosted Geist fonts via Fontsource (C-17)
- **Date:** 2026-11-02
- **Context:** Vercel's `geist` npm package is tailored around `next/font` in Next.js, whereas our frontend uses React 19 + Vite 7.
- **Decision:** Self-host Geist Sans and Geist Mono via `@fontsource/geist-sans` and `@fontsource/geist-mono`, importing exclusively weights `400` and `500` to honor the design system.
- **Consequences:** Zero external Google Fonts requests, fast first paint, and strict weight compliance in Vite.
- **Spec reference:** PRD §10.2, §10.3 · TDD §2, §13.8 · `tasks/README.md` (C-17)

---

## D-018 · Standard `gsap` package imports for ScrollTrigger and SplitText (C-18)
- **Date:** 2026-11-02
- **Context:** Historically `SplitText` required a private Club GSAP registry token, which breaks reproducible public CI builds. Since GSAP 3.13+, all plugins including `SplitText` ship free in the standard `gsap` npm package.
- **Decision:** Install standard `gsap` (`>=3.13`) and `@gsap/react`, importing `ScrollTrigger` from `gsap/ScrollTrigger` and `SplitText` from `gsap/SplitText` with no private npm registry configuration.
- **Consequences:** Clean `pnpm install --frozen-lockfile` in public GitHub Actions and judge verification clones.
- **Spec reference:** PRD §10.5 · TDD §2, §13.6 · `tasks/README.md` (C-18)

---

## D-019 · Compile-time design token enforcement in Tailwind v4 `@theme` (C-19)
- **Date:** 2026-11-02
- **Context:** DESIGN.md and PRD §10 forbid drop shadows, bold weights (`600`/`700`), and arbitrary chromatic palette utilities. Relying solely on manual code review risks accidental utility classes slipping in.
- **Decision:** Reset Tailwind v4 defaults in `@theme` (`--color-*: initial`, `--shadow-*: initial`, `--font-weight-*: initial`), define only approved MARGI AI tokens, and pair with `scripts/lint-design.mjs` in `pnpm lint` to block `shadow-*`, `font-semibold`, `font-bold`, `dangerouslySetInnerHTML`, and misplaced `crowd-*` utilities.
- **Consequences:** Off-brand styling is caught automatically at lint/build time.
- **Spec reference:** DESIGN.md · PRD §10 · TDD §13.5 · `tasks/README.md` (C-19)

---

## D-020 · Frontend-first prototype execution order using MSW network mocks (C-20)
- **Date:** 2026-11-02
- **Context:** PRD §12 and TDD §20 originally ordered backend agents before frontend screens. To validate visual design, Glass-Box UX, and bilingual copy early, the owner chose to build and review the entire web app on mock data before implementing backend business modules.
- **Decision:** Build Stage 3 (`apps/web`) as a complete clickable prototype backed by MSW (`>= 2.12`, including SSE stream mocking) confined strictly to `apps/web/src/mocks/**`. Every mocked response and stream event must be parsed against `@margi-ai/shared` Zod contracts, excluded from production Vite bundles, and retired domain-by-domain in `T-086` as real backend endpoints land in Stage 4.
- **Consequences:** Early UX sign-off via `pnpm dev:mock` with zero mock drift from shared contracts; MSW also serves component-level tests without duplicating fixtures.
- **Spec reference:** PRD §12 · TDD §13, §17, §20 · `tasks/README.md` (C-20)

---

## D-021 · Pull MinIO server and client images from Chainguard (`cgr.dev/chainguard/minio*`)
- **Date:** 2026-11-02
- **Context:** TDD §18.1 and `T-004` referenced `minio/minio` and `minio/mc`. Upstream MinIO restricted anonymous unauthenticated container image pulls on both Docker Hub (`minio/*`) and Quay (`quay.io/minio/*`), causing `pull access denied` / `401 UNAUTHORIZED` on clean environments.
- **Decision:** Use publicly pullable Chainguard Wolfi images (`cgr.dev/chainguard/minio:latest-dev` and `cgr.dev/chainguard/minio-client:latest-dev`, which include `/bin/sh` and `wget` for healthchecks and bucket bootstrap scripts) in `docker-compose.dev.yml` and Dokploy deployment documentation.
- **Consequences:** Anonymous `docker compose up -d` works out of the box on clean developer machines and CI runners without registry credentials while preserving full S3 / `mc` compatibility.
- **Spec reference:** TDD §18.1, §18.4 · `tasks/00-foundation.md` (T-004)
