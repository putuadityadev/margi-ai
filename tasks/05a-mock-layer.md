# Phase 05a — Mock API Layer (Frontend Prototype First)

Goal of the phase: the **entire** web app (landing, analyzer, live Thought Stream, results,
auth, history, trips, admin) runs and can be tested as a clickable prototype **before any
backend feature exists**, using realistic mock data that obeys the same Zod contracts as the
real API. Later, the mocks are switched off domain by domain as the real API lands (T-086).

Why this works without throwaway code (Clarification C-20):
- Mocks sit at the **network layer** with MSW (Mock Service Worker). The app's real
  `apiClient`, `EventSource` hook, and components run unchanged; nothing in `features/` or
  `pages/` knows whether a response is mocked.
- Every mock payload is parsed with the shared schemas from `@margi-ai/shared`, so a mock
  that drifts from the contract fails immediately instead of hiding bugs until integration.
- The same handlers are reused by Vitest (`msw/node`) for component tests.

Run the prototype: `pnpm dev:mock` (shared watch + web with `vite --mode mock`; no Docker, no API).

Rules for all tasks in this phase:
- Mock code lives only in `apps/web/src/mocks/**` and is loaded through one dynamic import
  guarded by `import.meta.env.VITE_API_MOCKS`, so production builds contain none of it.
- Mock data is realistic: real Bali places, real coordinates, plausible numbers computed with
  the shared scoring functions (never typed by hand), EN + ID text. No lorem ipsum.
- Mock responses use the exact API shapes, status codes, and error body from TDD §4 and §10.

---

### T-082 · MSW setup, dev scenario panel, and public API mocks
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D2
- **Depends on:** T-008, T-012, T-013, T-014, T-015
- **Spec:** TDD §10.1 (public endpoints), §4 (error format), §11 (CSRF header) · PRD AC-01.1, AC-02.6 · Clarification C-20
- **Goal:** `pnpm dev:mock` serves the web app with every public endpoint mocked and a dev panel to switch scenarios.

**Scope**
- Add `msw` (≥ 2.12, for first-class SSE support) as a web dev dependency; generate the worker script into `apps/web/public/` with `msw init`.
- `apps/web/.env.mock` with `VITE_API_MOCKS=true`; root script `dev:mock` (shared watch + `vite --mode mock`). `VITE_API_MOCKS` accepts `true`, `false`, or a comma list of domains to keep mocked (`public,analyses,auth,me,admin`) so mocks can be retired gradually in T-086.
- `src/main.tsx`: before rendering, `if (mocksEnabled) await (await import('./mocks/browser')).startMocks()`. `onUnhandledRequest`: warn for `/api/*`, bypass everything else.
- Structure: `mocks/browser.ts`, `mocks/node.ts` (for Vitest), `mocks/handlers/{public,analyses,auth,me,admin}.ts`, `mocks/data/**`, `mocks/db.ts` (small in-memory store persisted to `sessionStorage`, with `reset()`), `mocks/scenario.ts`, `mocks/respond.ts` (helpers: `ok`, `apiError(code, status)`, `withLatency(ms)`).
- Public handlers: `GET /presets`, `/origins`, `/venues/:slug`, `/venues/:id/forecast`, `/regencies`, `/system/status` (`llm: 'ok'`, `telemetry.live: false`, `version: 'mock'`), `POST /events` (204).
- Mock dataset (`mocks/data/`): the 9 regencies, 4 presets, 5 hotspot origins, ≥ 8 DTW alternatives (micro + regional), ≥ 8 MSMEs, each with real names, coordinates, opening hours, categories, etiquette tags, and a 7 × 24 forecast curve following BRD §2.3 patterns. All objects parsed with shared schemas at module load.
- Images: the 4 preset reference photos and the venue photos used by the mock dataset, WebP ≤ 1024 px in `public/presets/` and `public/venues/`, each with a credit (own or CC-BY/CC0). These files are the same ones T-018/T-020 will use — curate them once.
- Non-GET handlers return `403 { error: { code: 'FORBIDDEN' … } }` when `X-Requested-With: margi-ai` is missing, so the real CSRF rule is exercised from day one.
- Dev scenario panel (`mocks/DevPanel.tsx`, rendered only when mocks are on): choose scenario (stored in `localStorage`, overridable with `?mockScenario=`), latency multiplier (1× / 3×), reset mock DB, list of "sent emails" (filled by T-084). Panel styling uses the UI kit when available; until then, minimal unstyled markup is acceptable.
- A visible but small "Prototype — mock data" badge in the footer while mocks are on (honest labelling, PRD §9).

**Out of scope**
- Analysis stream (T-083), auth/me/admin handlers (T-084).

**Files**
- `apps/web/src/mocks/**`, `apps/web/public/mockServiceWorker.js`, `apps/web/.env.mock`, `apps/web/src/main.tsx`, root `package.json`, `apps/web/public/{presets,venues}/*.webp`

**Acceptance criteria**
- [x] `pnpm dev:mock` works with Docker and the API stopped; `/api/v1/presets` returns 4 presets in the browser network tab (served by the worker).
- [x] A mock fixture with a wrong field type crashes mock startup with a schema error naming the file.
- [x] `pnpm --filter web build` (no mock mode) output contains no MSW or handler code (grep `dist/assets` for `msw` and a handler-only string).
- [x] Every image used by mocks has a credit entry in `mocks/data/credits.ts`.

**Verify**
- `pnpm dev:mock`, then open `http://localhost:5173` with the API not running; `pnpm --filter web build && grep -r "mockServiceWorker\|setupWorker" apps/web/dist/assets || echo clean`

---

### T-083 · Mock analysis pipeline and SSE Thought Stream
- **Status:** done · **Priority:** P0 · **Size:** L · **Day:** D2
- **Depends on:** T-082
- **Spec:** TDD §6.6 (stage order and budget), §6.7 (SSE event schema), §10.2 (analysis endpoints, `AnalysisResult`), §7.6 (worked example), §15 (fallback labels) · PRD F-03 – F-09, AC-03.3, AC-04.3, AC-05.5, AC-06.3, AC-07.1 – AC-07.6, AC-13.2
- **Goal:** Starting an analysis in the prototype streams a believable Agent 1 → 2 → 3 transcript and ends with a contract-valid result, for every demo scenario.

**Scope**
- `POST /analyses` (multipart; preset or image) → `202 { analysisId, streamUrl }` (UUID v7-like id); stores the input in the mock DB under the current mock guest session; validates "exactly one of `image`/`presetId`" with the real error codes.
- `mocks/pipeline/buildResult.ts`: composes an `AnalysisResult` from the mock dataset for a given preset/upload, `simulate`, and locale. All numbers come from shared functions (`cfs`, `isRedZone`, `simVibeFromCosine` from a fixed cosine per pair, `rankScore`, `fiscalBoost`, `haversineKm`, `queueEstimateMin`, `travelMinutesEstimate`, `timeSavedRange`, `googleMapsDirUrl`). Narrative and etiquette text are EN/ID fixtures. Lempuyang under simulation reproduces the TDD §7.6 numbers.
- `mocks/pipeline/buildTranscript.ts`: produces the ordered `StreamEvent[]` with delays matching the TDD §6.6 budget (total ≈ 6–8 s at 1×): `orchestrator.started` → vibe steps → `partial:vibe` → crowd `tool_call`s (with tiers and `resultSummary` strings like "live=null → forecast 22% (Below average)") → `partial:origin` → `partial:candidates` → bundler steps → `partial:recommendations` → `result` → `done` (`totalMs`, `models`). Event IDs follow the Redis format (`<ms>-<seq>`). Every event is parsed with `StreamEvent`.
- `sse('/api/v1/analyses/:id/stream')` handler (MSW `sse` API) replays the transcript with `client.send({ id, event, data })`, then closes.
- `GET /analyses/:id` returns the stored result for the owning mock session, `404` otherwise (permalink + private page). `POST /analyses/:id/regenerate-narrative` returns the same numbers with the other locale's narrative.
- Scenarios (from the T-082 panel): `normal`, `simulate` (Judge Test Mode: 115% surge, `Simulated` tiers, `simulation.virtualTime`), `calm-origin` (non-red origin banner), `relaxed` (cards with `relaxed` step 1/2 and reasons), `not-a-scene` (`isTravelScene=false` → friendly result), `vision-busy` (recoverable `error` event, code `AI_VISION_BUSY`), `replay` (`meta.isReplay=true` + fallback steps), `template-narrative` (fallback step "Template narrative"), `stream-drop` (connection errors mid-stream so the hook's fallback polling of `GET /analyses/:id` is exercised), `rate-limited` (`429 RATE_LIMITED` on POST).
- Known limitation to note in the file header: MSW's SSE mocking does not reproduce server-side `Last-Event-ID` replay; true reconnect behaviour is verified against the real API in T-086.

**Out of scope**
- Persisting uploaded images (only an object URL preview exists client-side).

**Files**
- `apps/web/src/mocks/handlers/analyses.ts`, `apps/web/src/mocks/pipeline/**` (+ tests)

**Acceptance criteria**
- [x] Unit test: for each preset × {simulate off, on} × {en, id}, the result parses with `AnalysisResult` and the transcript parses event by event with `StreamEvent`.
- [x] Unit test: mock Lempuyang simulation gives `CFS = 86`; Taman Ujung card gives `Sim ≈ 78.5`, `R ≈ 82.3` (same tolerance as T-014).
- [x] Each preset yields ≥ 2 Micro and ≥ 2 Regional cards in `normal` (PRD G-03), each DTW card with 1–2 MSMEs and a `mapsUrl`.
- [x] Every scenario listed above can be triggered from the dev panel and produces its documented UI-facing behaviour (checked during T-085).

**Verify**
- `pnpm --filter web test -- mocks`, then run a preset in `pnpm dev:mock` and watch the EventStream tab in DevTools.

---

### T-084 · Mock auth, account, and admin APIs
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D3
- **Depends on:** T-082, T-083
- **Spec:** TDD §10.3 (auth), §10.4 (me), §10.5 (admin), §11 (session model) · PRD F-10, F-11, F-12, Flows C and D
- **Goal:** Every signed-in and admin screen can be built and clicked through without the real backend.

**Scope**
- Mock accounts (documented in `mocks/README.md`): `demo@margi.test` (USER, verified), `unverified@margi.test` (USER, not verified), `admin@margi.test` (ADMIN); shared dev password `Password123`. Clearly fake domain; never reused anywhere else.
- Auth handlers: register (password policy from shared schema, duplicate email → `EMAIL_TAKEN`), login (wrong password → generic error), logout, `GET /auth/me` (401 when signed out), refresh, verify-email, resend-verification, forgot-password (always 204), reset-password. Session state lives in the mock DB (the worker cannot set `httpOnly` cookies; the app does not depend on reading cookies, so behaviour matches).
- Mock mailbox: verification and reset "emails" are stored and listed in the dev panel with clickable links to `/verify-email?token=…` and `/reset-password?token=…`; tokens expire per TDD §11 (24 h / 30 min) and are single-use.
- Scenario `expired-session`: the next authenticated request returns 401 once, then refresh succeeds, so the single-flight refresh in `apiClient` is exercised.
- Google sign-in: a full-page redirect cannot be intercepted by the worker, so the dev panel offers "Simulate Google sign-in" (signs in the demo user and navigates to `/auth/callback?next=/app`). The real button stays a plain link to `/api/v1/auth/google`.
- Me handlers: history list with cursor pagination, detail, delete one/all, image endpoint (returns the preset image for preset analyses), claim (requires matching mock guest session, ≤ 24 h), trips CRUD (requires verified email → `EMAIL_NOT_VERIFIED`), profile update.
- Admin handlers (ADMIN only, else 403): venues CRUD, `vibe/generate` (returns a fixture profile after ~1.5 s), `embed`, `re-embed-all` with a job whose progress advances on each `GET /admin/jobs/:id` poll, forecast GET/PUT, CSV import (row-level errors), `sync-besttime` → `409 BESTTIME_DISABLED`, presets/etiquette/corridors CRUD, stats fixture (computed from mock analyses plus a seeded history).

**Out of scope**
- Security properties (hashing, rate limits beyond the `rate-limited` scenario): those are proven against the real API.

**Files**
- `apps/web/src/mocks/handlers/{auth,me,admin}.ts`, `apps/web/src/mocks/data/{users,admin-stats}.ts`, `apps/web/src/mocks/README.md`

**Acceptance criteria**
- [ ] Unit tests for the handlers' rules that UI depends on: unverified user cannot save a trip; non-admin gets 403 on admin routes; used reset token is rejected.
- [ ] All request bodies are validated with the shared schemas, and responses parse with them.

**Verify**
- `pnpm --filter web test -- mocks`

---

### T-085 · Prototype review checkpoint
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D3
- **Depends on:** T-044, T-053, T-054, T-061, T-064 (T-065 if not cut)
- **Spec:** PRD §6 (Flows A–D), §8 (Accessibility, Compatibility), §10 (UX/UI) · BRD §4 (evaluator persona)
- **Goal:** The owner tests the full frontend prototype and signs it off before backend work starts.

**Scope**
- Walk through Flows A–D and every T-083/T-084 scenario in `pnpm dev:mock`, in EN and ID, at 360 px and 1440 px, keyboard-only once.
- Quick Lighthouse run on `/` and `/app` (production build in mock mode: `vite build --mode mock && vite preview`).
- Record findings in `docs/prototype-review.md`: finding, severity (blocker / major / minor), owning task ID, status. Fix blockers and majors in their owning tasks before signing off; minors may wait.
- Optional: deploy the mock-mode build to a separate Dokploy service (e.g. `preview.<domain>`, `X-Robots-Tag: noindex`) for testing on a phone or sharing with reviewers. The "Prototype — mock data" badge stays visible.
- Owner sign-off line with date at the end of `docs/prototype-review.md`.

**Out of scope**
- Real-API behaviour (T-086).

**Files**
- `docs/prototype-review.md`

**Acceptance criteria**
- [ ] No open blocker or major finding.
- [ ] Owner sign-off recorded.

**Verify**
- Manual review; `pnpm --filter web exec vite build --mode mock && pnpm --filter web preview`

---

### T-086 · Switch the web app from mocks to the real API
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6
- **Depends on:** T-036, T-037, T-038, T-060, T-062, T-063, T-085
- **Spec:** TDD §10 (API), §6.7 (SSE resume), §13.3 · PRD §6 (Flows A–D) · Clarification C-20
- **Goal:** Default development and production use the real API, with the mock layer kept only as an opt-in tool.

**Scope**
- Retire mocks domain by domain as backend tasks finish: set `VITE_API_MOCKS` to the remaining domains (e.g. `auth,me,admin` after Phase 04), ending at `false` in `.env.development` and absent in production.
- For each domain, run its flow against the real API and fix every mismatch at the source (API or shared schema), then update the mock fixtures so they stay a faithful copy. Never "fix" a mismatch by loosening a shared schema without a DECISIONS entry.
- Verify behaviours mocks cannot reproduce: SSE resume with `Last-Event-ID` (kill the network mid-stream in DevTools), `httpOnly` cookie flags, real refresh rotation, Google OAuth redirect, MinIO-backed history images, real rate limits.
- Keep `src/mocks/**`, `pnpm dev:mock`, and the `msw/node` test setup for UI work and component tests; document "Prototype mode" in the README (T-072).
- Remove the footer "Prototype — mock data" badge path from non-mock builds (it is already conditional; confirm).

**Out of scope**
- Playwright e2e (T-068 runs against the real API with `LLM_MOCK=true`).

**Files**
- `apps/web/.env.development`, fixes across `apps/web`, `apps/api`, `packages/shared`, `apps/web/src/mocks/data/**`

**Acceptance criteria**
- [ ] `pnpm dev` (real API) passes Flows A–D manually, including the simulation toggle and an SSE reconnect.
- [ ] Production build contains no mock code (same grep as T-082).
- [ ] Every mismatch found is listed in `docs/prototype-review.md` with its fix.

**Verify**
- `pnpm dev` with Docker services up; manual Flows A–D; `pnpm --filter web build` grep check.
