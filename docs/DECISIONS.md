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

---

## D-022 · Align Vite 8 with Vitest 5 and `@vitejs/plugin-react` 6 in `apps/web`
- **Date:** 2026-11-02
- **Context:** TDD §2 and `T-008` were drafted against Vite 7, while the workspace test runner `vitest@5` resolves `vite@^8` (`8.3.x`) and `@vitejs/plugin-react@6` / `@tailwindcss/vite@4` both support Vite 8 natively. Mixing Vite 7 in `apps/web` with Vite 8 in `vitest` would duplicate Vite packages and create incompatible plugin types in `vitest.config.ts`.
- **Decision:** Use `vite@^8` and `@vitejs/plugin-react@^6` in `apps/web` so build, dev server, Tailwind v4 plugin, and Vitest share one unified Vite version.
- **Consequences:** Zero peer dependency warnings and identical transform/alias resolution between `vite dev`, `vite build`, and `vitest run`.
- **Spec reference:** TDD §2, §13 · `tasks/00-foundation.md` (T-008)

---

## D-023 · Defer Dokploy deployment (`T-011`) from Foundation to Release stage (`T-070`)
- **Date:** 2026-11-02
- **Context:** `tasks/00-foundation.md` (`T-011`) scheduled a live Dokploy VPS skeleton deployment at the end of Stage 1 Foundation. The owner decided to skip early deployment so engineering effort goes directly into domain contracts, UI prototype, and AI pipeline rather than premature infrastructure setup.
- **Decision:** Defer `T-011` live VPS/Dokploy deployment to Stage 6 Hardening & Release (`T-070`), keeping all development and verification local via `docker-compose.dev.yml` until the application is feature-complete.
- **Consequences:** Faster progression into Stage 2 (`packages/shared`) and Stage 3 (`apps/web` prototype) with zero cloud infrastructure overhead during active iteration; production Dockerfiles (`T-010`) remain verified locally so `T-070` can deploy directly when ready.
- **Spec reference:** TDD §18.1 · `tasks/00-foundation.md` (T-011) · `tasks/09-hardening-release.md` (T-070)

---

## D-024 · Analysis permalinks privacy and non-owner access (Q-06 / C-12)
- **Date:** 2026-11-02
- **Context:** `tasks/README.md` (Q-06) and PRD §5 questioned whether `/app/a/:analysisId` permalinks should be publicly viewable by anyone with the link or restricted to the owner.
- **Decision:** Follow Clarification C-12: Analyses remain private to their creator (authenticated user or active guest session). When a non-owner navigates to `/app/a/:analysisId`, the client receives 403 Forbidden and displays a friendly 'This analysis is private' screen with a prominent CTA to start their own analysis. Owners receive the stored result and execution trace.
- **Consequences:** Protects guest travel photos and itinerary parameters by default without requiring complex ACLs or public sharing toggles in early stages.
- **Spec reference:** PRD §5, §8 · Clarification C-12 · `tasks/06-results-ui.md` (T-053)

---

## D-025 · Map-first explore flow at `/app`; photo analyzer moves to `/app/photo`
- **Date:** 2026-11-03
- **Context:** The owner asked for a simpler, map-first experience: a landing page at `/`, then an app that onboards the traveller, gets (and lets them correct) their position, optionally asks for a mood, runs a ride-hailing-style radar scan on a real map, shows nearby places with their crowd level, and steers busy picks toward calmer places with a similar mood. Frontend prototype first, on mocks, for UI sign-off.
- **Decision:**
  - Routes: `/` (landing) and `/app` (explore) are full-screen and sit outside `RootLayout`. The photo-based analyzer (T-045 – T-053) is unchanged and lives at `/app/photo` and `/app/a/:analysisId`; legacy `/app?preset=…` links redirect there.
  - Flow state: `stores/exploreStore.ts` (steps `intro → locate → vibe → scan → browse`); the open place is the `?place=` search param so the browser back button closes it. Only the "onboarding seen" flag is kept in `localStorage`; GPS coordinates are never stored.
  - New contract in `packages/shared/src/schemas/explore.ts`: `VibeTag`, `NearbyQuery`/`NearbyResponse`, `PlaceDetail` (24-hour curve, quiet hours, CFS, red-zone flag, up to 3 `QuietAlternative`s, nearby MSMEs, etiquette tags), `Area`, `ReverseGeocode`. Endpoints for the API to implement: `GET /explore/nearby?lat&lng&radiusKm&vibes&at`, `GET /explore/places/:venueId?lat&lng&vibes&at`, `GET /geo/areas`, `GET /geo/reverse?lat&lng`.
  - Ranking reuses BRD §7.2 / §7.3 (`cfs`, `rankScore`, `fiscalBoost`). In this flow `Sim_vibe` comes from the new `tagSimilarity` (Jaccard over mood tags) because no photo embedding exists. A busy target (busyness above `THRESHOLDS.calmMax`) only gets alternatives at least 15 points calmer; a calm target gets similar places that are also calm.
  - `at` (visit time: now, +2 h, or the next 08:00 WITA) lets night-time visitors plan instead of seeing every place closed. Crowd readings always carry their tier (Forecast or Simulation).
  - GPS fixes outside Bali (`isInBali`, shared) are rejected with a prompt to pick a start town, because judges may test from outside Bali.
  - Basemap: public OpenStreetMap raster tiles, desaturated with CSS to match the palette; `VITE_MAP_TILE_URL` overrides it for production. CARTO basemaps were tried and now require an API key.
  - Places without a photo use generated cartographic "plates" (`public/places/<category>.svg`) until real photos are sourced.
- **Consequences:** The mock dataset grows to 121 places and 47 start areas (`mocks/data/places.ts`, `mocks/data/areas.ts`), parsed against the shared schemas. The real API must serve the four endpoints above with the same shapes before the explore domain is switched off mocks (T-086).
- **Spec reference:** PRD §5, §7, §10 · BRD §7.2, §7.3 · TDD §7, §13

---

## D-026 · In-app trip planner and MARGI Copilot (`/app/trip`)
- **Date:** 2026-11-03
- **Context:** After D-025 the place detail sent travellers straight to Google Maps, so MARGI lost them at the moment it could add the most value. The owner asked for an in-app plan with an interactive AI assistant on the map, covering three guest situations: planning from a chosen place, being stuck in traffic, and auditing a plan they already have; plans must be savable.
- **Decision:**
  - The detail CTA is now "Plan this trip". `/app/trip` shows an editable itinerary (departure time, up to 5 stops, arrival time and crowd at arrival per stop, corridor delays) over a map that draws legs in order, highlights gridlock corridors, previews suggestions, and replays the route. Google Maps is the last hand-off, as one multi-stop link (`googleMapsTripUrl`).
  - The browse view gets "Ask MARGI" with three entries: plan, stuck in traffic (from the start point, or a labelled demo at Jl. Raya Ubud inside its 10:00–21:00 window), and "I already have a plan".
  - MARGI Copilot answers with narrative text plus up to three typed `TripSuggestion`s (shift departure, swap stop, reorder, add stop, remove stop), each with the computed effect (crowd exposure, minutes, red zones). Applying one runs the shared, pure `applyTripChange`, re-evaluates the plan and logs a line; the log is saved with the plan. Every reply carries a glass-box trace, and the UI labels mock narratives as "Template".
  - Numbers by code, words by LLM: trip evaluation, corridor delays (TDD §5 penalty windows), CFS, red zone, ranking and suggestions are computed by code; the copilot model will only write `text`. Contract in `packages/shared/src/schemas/trip.ts`.
  - Endpoints for the API: `POST /trips/evaluate`, `POST /copilot/reply`, `GET /explore/corridors`, `GET /explore/search`, `GET|POST /trips/plans`, `DELETE /trips/plans/:id`. Saving is guest-first (PRD D-01); the mock keeps plans in `sessionStorage`.
  - Trip metrics add two equity signals the judges score: local MSME stops and stops in recipient regencies (BRD §1, 10 % PHR transfer).
- **Consequences:** The real copilot needs an LLM step constrained to narrate the computed plan and suggestions (template fallback when it fails), and the trip planner needs corridor data in the database. The legacy `ConciergeModal` in the photo analyzer is superseded by this flow but left in place until the analyzer is revisited.
- **Spec reference:** PRD D-01, §7 · BRD §1, §7.2, §7.3 · TDD §1.3, §5, §6.5, §7

---

## D-027 · Real data sources: free-first provider stack
- **Date:** 2026-11-03
- **Context:** The approved prototype (D-025, D-026) runs on MSW mocks. Tahap 1 needs every screen on real data with AI integrated materially. The owner asked for free plans first, paying only where no viable free option exists. Research on 2026-11-03 compared crowd, routing/traffic, places, photos, tiles, LLM/embedding, and context providers; full tables, citations, quotas, and risks are in `docs/DATA-SOURCES.md`.
- **Decision:**
  - **Crowd:** MARGI's own deterministic model covers all places (category × hour × weekday curves, with multipliers for holidays from API Hari Libur, Balinese ceremonies from `balinese-date-js`, BPS monthly arrivals, and BMKG weather). BestTime forecasts calibrate 10–20 hotspots, and BestTime live data is used only for busy venues the user opens. No Google popular-times scraping (Maps ToS §3.2.3).
  - **Routing and traffic:** TomTom Routing (`traffic=true`, `trafficDelayInSeconds`, polyline), plus TomTom Traffic Flow polling of the corridors every 30 minutes. The polling builds our own hour-of-week jam history. Fallbacks: ORS, then self-hosted OSRM, then the distance estimate. Google Routes is rejected because its terms (§19.2) forbid use with a non-Google map.
  - **Places and photos:** our Postgres is the source of truth: the curated places plus Overpass/OSM and the FSQ OS Places dump, with Geoapify for enrichment and search. Photos come from Wikimedia Commons with stored attribution, or from the team or MSMEs with permission. Reverse geocoding: curated areas first, then Nominatim (cached). Google Places and Photos are rejected (§14.2, no caching of photo names, cost).
  - **Tiles:** OpenFreeMap vector tiles through `maplibre-gl-leaflet`, with a self-hosted Bali PMTiles extract as fallback. Public OSM tiles are for development only.
  - **AI:** OpenRouter with `google/gemini-3.1-flash-lite` (paid, data retention off) for vision and the Copilot. Fallbacks: `google/gemma-4-31b-it:free`, then `deepseek/deepseek-v4.1-flash`, with a paid model always last. Guest photos never go to `:free` endpoints. Embeddings: `google/gemini-embedding-001` at 768 dimensions, so the vector column becomes `vector(768)`. A one-time $10 of OpenRouter credit lifts the `:free` cap to 1,000 requests a day.
- **Consequences:** The expected cost for the demo phase is about $10 up front, then $1–15 a month, plus $29 once if BestTime test credits run out. New server-side env keys: `TOMTOM_API_KEY`, `ORS_API_KEY`, `OSRM_URL`, `GEOAPIFY_API_KEY`, `NOMINATIM_URL`, `HTTP_USER_AGENT`, `BPS_API_TOKEN`, `WIKIMEDIA_USER_AGENT`; on the web, `VITE_MAP_STYLE_URL`. Required attributions: OpenMapTiles/OSM, BMKG, Open-Meteo (if used), Geoapify, and every Commons/Mapillary photo. Open checks before launch: the TomTom licence (caching and display on non-TomTom maps, behind a login), BestTime test-credit amount, Gemini free-tier quotas, a one-week TomTom accuracy check on Bali corridors, and BPS table codes.
- **Spec reference:** BRD BR-05, BR-14 · TDD ADR-04, ADR-11 – ADR-14, §6.1, §18.2 · tasks T-091 – T-099

---

## D-028 · MVP storage: in-memory catalogue and caches, Postgres for guest plans
- **Date:** 2026-11-03
- **Context:** Tahap 1 is short and judges test a single deployed instance. The reviewed dataset (123 places, 47 areas, 6 corridors) already exists as reviewed data, and Redis and pgvector add moving parts that the demo path does not yet need.
- **Decision:** The API reads the catalogue from `packages/shared/data/catalog.json` at boot and registers it with the shared engine (`setCatalog`). Route and Copilot caches are in-process (`TtlCache`). Guest-saved trip plans are stored in Postgres (`TripPlan`), keyed by an anonymous httpOnly session cookie; origin coordinates are rounded to about 1 km before storage. The `Venue.embedding` column is `vector(768)` (D-027) but unused until T-096.
- **Consequences:** No Redis or Postgres is needed to serve explore, trips, and copilot; only saved plans need Postgres. Caches reset on restart and are not shared between instances, so horizontal scaling (T-080) must move them to Redis first. Admin editing of venues (T-062) needs the catalogue in Postgres, tracked in T-091.
- **Spec reference:** TDD §4, §5, §12 · tasks T-090, T-091, T-094 – T-097

---

## D-029 · No fallback data: provider failures surface as error states
- **Date:** 2026-11-03
- **Context:** The owner ruled that no screen may show invented or canned data when a provider fails; the product must show an error state instead. This reverses the earlier template and estimate fallbacks (TDD §15, D-027).
- **Decision:** Routing failures (TomTom, then OpenRouteService) end in `503 SERVICE_UNAVAILABLE`; there is no distance estimate for the trip's own legs. The Copilot has no template answer: a missing or failing LLM, or a narrative whose numbers do not match tool results after one corrective round, also ends in 503. The plan banner uses a new deterministic `POST /trips/insight` (no LLM), so it neither spends model quota nor depends on the AI provider. The web client shows an error state with retry for the plan, departure chart, insight, search, and Copilot.
- **Consequences:** Judges see an honest error instead of plausible fake numbers, but an outage of TomTom or OpenRouter blocks the trip planner and Copilot. Two things remain approximations and are labelled as such: crowd curves are a modelled forecast (the curated profiles are not measured counts until BestTime data lands, T-093), and the travel time of hypothetical suggestion candidates uses the engine distance estimate until a suggestion is applied and the plan is re-routed. The judge simulation toggle stays an explicit, labelled user choice.
- **Spec reference:** BR-05, BR-14 · TDD §15 · tasks T-093, T-094, T-098

---

## D-030 · Crowd without BestTime: model plus live road congestion; embeddings for "same vibe"
- **Date:** 2026-11-03
- **Context:** The owner asked how to get real crowd data without BestTime, and whether Google could provide it. Google's popular-times graph is not in any official API, scraping it breaks the Maps Platform terms (§3.2.3), and Google Places and Routes data may not be shown on an OSM map (§14.2, §19.2), so Google is not an option.
- **Decision:**
  - **Live signal:** TomTom Traffic Flow Segment Data at a place's coordinates (`currentSpeed` against `freeFlowSpeed`, confidence at least 0.5) gives a congestion value from 0 to 1. For visits happening now (within 30 minutes), it lifts the modelled crowd by up to 60 % (`LIVE_CONGESTION_GAIN`). Only open places that are hotspots or already modelled at 40 % or more get a lookup, at most 15 per scan, cached 15 minutes, with a budget of 600 calls a day.
  - **Honest labels:** `CrowdReading.basis` is `MODEL` (curve, holidays, ceremonies, season) or `MODEL_TRAFFIC` (also live traffic). A place with no usable signal keeps the plain model and says so. The simulation toggle never uses the live signal. The signal is an indirect sign of arrivals, not a head count, and the UI states that.
  - **Embeddings:** "same vibe" now ranks by cosine similarity of real `google/gemini-embedding-001` vectors (768 dimensions, one per place, `packages/shared/data/embeddings.json`). A place without a vector is not eligible as an alternative; nothing falls back to tag overlap. The calibration was measured on the 123-place catalogue: tag-sharing pairs span cosine 0.62 to 0.88 (median 0.72), so the bounds became 0.60 to 0.90 instead of 0.20 to 0.85, which had mapped everything above 70.
  - **BestTime** remains an optional calibration source for the top attractions if a key is added (T-093); it is not required.
- **Consequences:** Crowd figures are still modelled forecasts, with real inputs (calendar, season, live traffic), and the UI and proposal must keep calling them forecasts. Re-measure the cosine bounds if the embedding model changes.
- **Spec reference:** BR-05, BR-14 · TDD §7.3, §8 · tasks T-093, T-096

---

## D-031 · Invented MSMEs removed; places are verified curated DTW plus OpenStreetMap businesses
- **Date:** 2026-11-03
- **Context:** The 37 MSME entries in the catalogue had names and descriptions written by an earlier agent ("plausible generic" warungs and workshops). D-029 forbids invented data, and roughly 40 DTW coordinates were flagged as uncertain.
- **Decision:**
  - All 37 invented MSMEs were deleted. MSMEs now come from OpenStreetMap (`scripts/ingest-osm-msme.mjs`): one Overpass request for Bali (cached in `.state/`), keeping only nodes and ways with a `name` and an `opening_hours` that a strict parser reads completely (`24/7`, day lists and ranges, several ranges per day, `off`; anything else, such as `PH`, `sunrise` or `week` rules, is rejected, never guessed). POIs within 3 km of a DTW, not tagged `disused`/`abandoned`/`razed`/lifecycle-prefixed; records with `cuisine`, `website`, `phone` or `addr:*` are preferred, then the nearest; at most 3 per DTW, at least 150 m apart, 60 overall (spread by rank across destinations). Names, coordinates and hours are copied verbatim; descriptions are templated from OSM facts only (category word, nearest DTW, `cuisine`). Each place carries `source` and `sourceUrl`; `docs/osm-attribution.md` lists them under the ODbL notice. Crowd, dwell, queue and price values are model parameters taken from the per-category medians of the removed entries, not facts about the place.
  - DTW coordinates were checked against OSM via Nominatim (`scripts/verify-dtw-osm.mjs`, report in `docs/data-verification.md`). A pin moves only for a confident name-and-class match more than 300 m away, at most 5 km away, and not a feature larger than 2 km; farther matches go to manual review and places without a confident match are listed as unverified and left unchanged.
  - DTW images that were not a verified Commons photo or a category plate (six legacy `/venues/*.webp`) now use the category plate. The legacy files stay because the mock dataset and web tests still reference them.
  - `scripts/export-catalog.mjs` is retired; the catalogue is maintained directly. The mock dataset in `apps/web/src/mocks` stays as a test fixture only. `embed-catalog.ts` now drops vectors of venues that left the catalogue.
- **Consequences:** The MSME layer is smaller (60 places: 15 coffee, 43 culinary, 2 craft) and uneven: 19 destinations have no qualifying OSM business within 3 km. Opening hours are only as current as OSM. Craft shops are rare because few carry `opening_hours`. MSMEs show category plates, not photos. Unverified DTW coordinates remain a manual task.
- **Spec reference:** BR-14 · D-029 · TDD §5

## D-032 · Accounts gate saving only; Postgres is the sole place catalogue; curator console
- **Date:** 2026-11-04
- **Context:** Guests must keep searching and planning freely, but saved plans need an owner, and curators need to grow the catalogue without a code change. The user also ruled out any hardcoded fallback data.
- **Decision:**
  - Email and password accounts (scrypt hashes, opaque revocable session tokens stored as SHA-256 in an httpOnly `margi_auth` cookie, login throttling, CSRF header on writes). `ADMIN_EMAILS` promotes accounts to ADMIN at sign-up. Planning endpoints (evaluate, departures, insight, copilot, explore) stay open; plan list, save and delete require a session. In the app, Save opens one sign-in/sign-up dialog and finishes the save afterwards.
  - Places live only in Postgres (`Venue`, plus mood tags, crowd curve and embedding columns). `CatalogService` loads from the database and fails the boot if it is empty or unreachable; `scripts/seed-catalog.ts` is a one-off explicit import of the reviewed dataset. Named areas and congestion corridors remain static geography files.
  - `/admin/places` (ADMIN only) creates, edits, deactivates and restores places, embeds new or changed ones with the real model, and reloads the engine catalogue so changes reach explore, trips and the Copilot at once. Deactivate is a soft delete because saved plans may reference a place.
  - Email verification and password reset are not offered: there is no mail provider yet, so the banner and flows are removed rather than faked.
- **Consequences:** The legacy mock-driven admin pages (forecast, presets, etiquette, corridors, stats) were removed. A place saved while the AI provider is down has no embedding and is left out of "calmer alternatives" until re-embedded from the console.
- **Spec reference:** D-029 · TDD §10.3

## D-033 · Copilot resolves areas and times, and never substitutes silently
- **Date:** 2026-11-04
- **Context:** Testers asked for "Tabanan", "Buleleng" or "06:00" and the Copilot either guessed another place or said the slot did not exist.
- **Decision:** `search_places` resolves place names and areas or regencies (best-known attractions first); `change_trip` replaces or edits the itinerary by id and may carry a departure; `check_departure` evaluates the current trip at any HH:mm today or tomorrow. The prompt forbids silent substitution, requires a long-day warning from computed `tripHours` and road minutes, and chat history is sent with each request. `scripts/eval-copilot.ts` is a behavioural check of 11 traveller messages against the running API (10 of 11 passed before the routing retry; the failing case, a five-leg trip, passes after raising the route timeout to 9 s and retrying once).
- **Consequences:** More tool rounds per reply (up to 5, 45 s budget) at a still-small LLM cost.
- **Spec reference:** D-026 · D-029
