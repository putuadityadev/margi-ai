# MARGI AI — Task Plan (v1.0-submission → v2.0-final)

This folder turns the specs in [`docs/`](../docs) into an ordered, verifiable build plan.
Every task points back to the spec section it implements. If a task and a spec disagree,
the **spec wins** unless the difference is listed in [Spec clarifications](#spec-clarifications)
below (those are deliberate, reviewed corrections).

Engineering rules for executing these tasks live in
[`.claude/skills/margi-ai-engineering/SKILL.md`](../.claude/skills/margi-ai-engineering/SKILL.md).
Read it before starting the first task.

---

## How to use this folder

1. Follow the [Execution order](#execution-order) below. Within the current stage, pick the first
   task whose `Status` is `todo` and whose dependencies are all `done`. Task IDs are stable
   identifiers, **not** the execution order (the frontend prototype is built before the backend).
2. Read the task, then read every spec section listed under **Spec**. Do not code from the task text alone.
3. Set `Status: in-progress`, implement, and run every command under **Verify**.
4. Tick the acceptance criteria (`- [x]`). A task is `done` only when every box is ticked
   and the global [Definition of Done](#definition-of-done) holds.
5. Any deviation from the spec goes into `docs/DECISIONS.md` (created in T-001) with a one-paragraph
   rationale, and the task links to that entry.

### Status values
`todo` · `in-progress` · `blocked (<reason>)` · `done` · `cut` (removed under the cut-line, with a note)

### Size
`S` ≤ 2 h · `M` ≤ 4 h · `L` ≤ 1 day. A task that grows beyond `L` must be split before continuing.

### Task template
```markdown
### T-000 · Title
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-xxx
- **Spec:** PRD §x · TDD §y
- **Goal:** One sentence describing the observable outcome.

**Scope**
- What to build.

**Out of scope**
- What not to build here (prevents scope creep).

**Files**
- Paths created or changed.

**Acceptance criteria**
- [ ] Verifiable statement.

**Verify**
- Commands or manual checks.
```

---

## Phases

Phase files group tasks by **topic**. The order in which they are built is defined by the
[Execution order](#execution-order), not by the file number.

| # | File | Phase | Stage | Tasks |
| :-: | :--- | :--- | :-: | :--- |
| 00 | [00-foundation.md](./00-foundation.md) | Repo, tooling, local infra, app skeletons, CI, first deploy | 1 | T-001 – T-011 |
| 01 | [01-shared-domain.md](./01-shared-domain.md) | Shared constants, WITA time, scoring, Zod contracts | 2 (T-016: 4) | T-012 – T-016 |
| 02 | [02-data-seed.md](./02-data-seed.md) | Curated knowledge base (40–60 entities) and seed pipeline | 4 | T-017 – T-021 |
| 03 | [03-ai-infrastructure.md](./03-ai-infrastructure.md) | OpenRouter client, image intake, embeddings, vector search, calibration | 4 | T-022 – T-027 |
| 04 | [04-agents-pipeline.md](./04-agents-pipeline.md) | Telemetry, 3 agents, orchestrator, SSE, public API, LKG | 4 | T-028 – T-039 |
| 05a | [05a-mock-layer.md](./05a-mock-layer.md) | MSW mock API, mock SSE pipeline, prototype review, switch to real API | 3 (T-086: 5) | T-082 – T-086 |
| 05 | [05-frontend-core.md](./05-frontend-core.md) | Tokens, UI kit, shell, i18n, landing, analyzer, stream | 3 | T-040 – T-047 |
| 06 | [06-results-ui.md](./06-results-ui.md) | Result dashboard components and static pages | 3 | T-048 – T-054 |
| 07 | [07-auth-account.md](./07-auth-account.md) | Auth API, email, history, trips, guest claim (+ their web screens) | 3 (web) / 4 (API) | T-055 – T-061 |
| 08 | [08-admin.md](./08-admin.md) | Admin API and lazy-loaded admin UI | 3 (UI) / 4 (API) | T-062 – T-065 |
| 09 | [09-hardening-release.md](./09-hardening-release.md) | Security, observability, e2e, perf, prod deploy, smoke, release tag | 6 | T-066 – T-073 |
| 10 | [10-submission.md](./10-submission.md) | Disclosure, proposal, demo video | 7 | T-074 – T-076 |
| 11 | [11-v2-roadmap.md](./11-v2-roadmap.md) | P1 work for `v2.0-final` | after 7 | T-077 – T-081 |
| 12 | [12-real-data-integration.md](./12-real-data-integration.md) | Map-first prototype (done) and real-data backend for explore, trips, copilot | 3 (done) / 4–5 | T-087 – T-100 |

## Execution order

Frontend-first: after the foundation, the **whole web app is built as a clickable prototype on
mock data** (Clarification C-20), reviewed by the owner, and only then is the backend built
behind it. Mocks are retired domain by domain as real endpoints land.

| Stage | Day | Tasks, in order | Exit gate |
| :-: | :-: | :--- | :--- |
| **1 · Foundation** | D1 | T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008 → T-009 → T-010 → T-011 | CI green, skeleton live on Dokploy |
| **2 · Shared contracts** | D1 | T-012 → T-013 → T-014 → T-015 | Scoring/time 100% covered; Zod contracts exported |
| **3 · Frontend prototype (mock data)** | D2–D3 | T-082 → T-040 → T-041 → T-042 → T-043 → T-044 → T-045 → T-083 → T-046 → T-047 → T-048 → T-049 → T-050 → T-051 → T-052 → T-053 → T-054 → T-084 → T-059 → T-061 → T-064 → T-065 → **T-085** | Owner signs off the prototype in `pnpm dev:mock` (no backend running) |
| **3b · Map-first prototype (D-025/D-026)** | D3 | T-087 → T-088 → T-089 (**done**, owner sign-off 2026-11-03) | Owner approves the explore → plan → copilot flow on mocks |
| **4 · Backend** | D4–D6 | **Map-first demo path first:** T-090 → T-024 → T-017 → T-091 (supersedes T-018's dataset) → T-019 → T-020 → T-021 → T-092 → T-022 → T-023 → T-025 → T-026 → T-028 → T-093 → T-094 → T-095 → T-096 → T-097 → T-098; **then the rest:** T-016 → T-027 → T-029 → T-030 → T-031 → T-032 → T-033 → T-034 → T-035 → T-036 → T-037 → T-038 → T-039 → T-055 → T-056 → T-057 → T-058 → T-060 → T-062 → T-063 | Every endpoint the web app calls exists for real |
| **5 · Integration** | D6 | **T-099 → T-100**, then **T-086** (start early: switch `public` + `analyses` off mocks right after T-037/T-038, then `auth`/`me`/`admin` as their APIs land) | Flows A–D pass on the real API |
| **6 · Hardening & release** | D6–D7 | T-066 → T-067 → T-068 → T-069 → T-070 → T-071 → T-072 → T-073 | Tag `v1.0-submission` |
| **7 · Submission** | D7 | T-074 → T-075 → T-076 | Attachments complete |
| v2 | after D7 | T-077 – T-081 | `v2.0-final` |

Schedule risk of this order: the AI pipeline (the highest-weighted rubric item, BRD §3) and the
model benchmark (T-027) now start on D4, and stages 4–6 share D4–D7. Keep stage 3 within two
days; if it overruns, apply the cut-line to stage 3 tasks (T-065, "Use my location", landing
animations) rather than to the backend.

### Critical path (the demo cannot happen without these)
```text
Stage 1–2:  T-001 → … → T-007 → T-008 → T-012 → T-013 → T-014 → T-015
Stage 3:    T-082 → T-040 → T-041 → T-042 → T-043 → T-045 → T-083 → T-046 → T-047 → T-048 … T-053 → T-085
Stage 4:    T-090 → T-024 → T-017 → T-091 → T-019 → T-020 → T-021 → T-022 → T-023 → T-025 → T-026
            → T-028 → T-094 → T-095 → T-097 → T-098   (map-first demo path)
            T-017 → T-018 → T-019 → T-020 → T-024 → T-021 → T-022 → T-023 → T-025 → T-026 → T-027
            → T-028 → T-030 → T-031 → T-032 → T-033 → T-034 → T-035 → T-036 → T-037
Stage 5–6:  T-086 → T-070 → T-071 → T-073
```
Auth and Admin **APIs** are P0 but sit off the critical path: the real guest pipeline (Flow A/B)
must work end-to-end before T-055 is started. Their **screens** are already done in stage 3.

### Cut-line (PRD §12)
If the schedule slips, cut in this order and mark the affected tasks `cut` (all four items are
stage 3 work, so cut them there before the backend stage starts):
1. Admin UI polish: drop T-065 (presets/etiquette/corridors/stats UI); keep T-064 (venues + forecast)
2. "Use my location" (part of T-045)
3. Regenerate narrative in another language (AC-13.2, part of T-038 and T-053)
4. Advanced landing animations (part of T-044)

**Never cut:** F-01 to F-09, basic F-10 (email/password login + Google), the fallback chains, the Judge Simulation Toggle.

---

## Spec clarifications

These resolve gaps, conflicts, or outdated library details found while turning the specs into tasks.
T-001 copies them into `docs/DECISIONS.md` as the first entries.

| ID | Topic | Resolution | Affects |
| :-- | :--- | :--- | :--- |
| C-01 | Prisma 7 | TDD §5 uses Prisma ≤ 6 syntax. Use Prisma 7 conventions: `prisma.config.ts` holds the datasource URL, `generator client { provider = "prisma-client" output = "..." }`, client built with `@prisma/adapter-pg`, env loaded explicitly. Create the `vector` extension in migration SQL instead of relying on the `postgresqlExtensions` preview flag. Verify against the official upgrade guide when initializing. | T-006 |
| C-02 | Corridor delay | TDD §6.5 uses `corridor.typicalDelayMinutes`, but the `Corridor` model in TDD §5 lacks it. Add `typicalDelayMinutes Int @default(0)`. | T-006, T-017 |
| C-03 | Day-of-week | One convention everywhere: `0 = Monday … 6 = Sunday` (BestTime convention, TDD §5). Applies to `HourlyForecast.dayOfWeek`, `Venue.openingHours` keys, `Preset.defaultDay/simPeakDay`, `Corridor.penaltyWindows[].days`. Convert only through `witaDayOfWeek()` (Luxon `weekday - 1`). Never use `Date#getDay()`. | T-013 |
| C-04 | Zod 4 | Use Zod 4 and its native `z.toJSONSchema()`; do not add `zod-to-json-schema`. `nestjs-zod` supports `zod ^3.25 \|\| ^4`. | T-015, T-022 |
| C-05 | CFS typing | `corridorPenalty` is a `number` (env-overridable constant), not the literal type `0 \| 25`. | T-014 |
| C-06 | Dataset size | 40–60 entities (PRD D-06) supersedes 30–40 (BRD §8.1). | T-018 |
| C-07 | Hosting | VPS + Dokploy (TDD ADR-10) supersedes the Vercel/Railway placeholders in BRD §10.2. | T-011, T-074 |
| C-08 | Throttler storage | `@nestjs/throttler` has no Redis storage built in. Use `@nest-lab/throttler-storage-redis` with the shared ioredis client. | T-036, T-066 |
| C-09 | URL layout | Global prefix `api` + URI versioning with default version `1` → `/api/v1/*`. Health controller is `VERSION_NEUTRAL` → `/api/health`, `/api/health/ready`. | T-005, T-007 |
| C-10 | Origins | `GET /origins` returns venues with `isHotspot = true`. Corridors such as Jl. Raya Ubud are seeded as `STREET_CORRIDOR` venues, because `Analysis.originVenueId` is a venue foreign key. | T-018, T-037 |
| C-11 | Agent 2 vs ladder | Agent 2 fetches telemetry **once** for all top-K candidates and reports pass/reject at ladder step 0. Agent 3 re-applies thresholds per relaxation step on the same snapshots — no second telemetry round. | T-032, T-033 |
| C-12 | Permalink access | `/app/a/:id` and `GET /analyses/:id` are owner-only (matching `userId` or hashed `margi_sid`), per TDD §6.7 access rule. "Copy link" lets the owner reopen the result. Revisit for v2 sharing (F-15). | T-036, T-053 |
| C-13 | SSE + Redis | Blocking `XREAD` holds its connection. Each SSE client uses `redis.duplicate()` and quits it on close; never block the shared command client. | T-030, T-036 |
| C-14 | Mail transport | Resend SDK cannot talk to Mailpit. Put a `MailTransport` interface in front: Resend in production, SMTP (nodemailer → Mailpit) in dev/e2e. Templates are typed functions returning `{ subject, html, text }`; React Email is optional. | T-055 |
| C-15 | OAuth state | No `express-session`. Store OAuth `state` + PKCE verifier in a short-lived (10 min) signed `httpOnly` cookie through a custom passport state store. | T-058 |
| C-16 | Shared package build | NestJS compiles to CommonJS; Vite consumes ESM. Build `packages/shared` with `tsup` (ESM + CJS + `.d.ts`), watch mode in dev. | T-003 |
| C-17 | Fonts | The `geist` npm package targets `next/font`. Use Fontsource (`@fontsource/geist-sans`, `@fontsource/geist-mono`), importing only weights 400 and 500. Confirm the emitted `font-family` name. | T-040 |
| C-18 | GSAP plugins | Since GSAP 3.13 all plugins (including SplitText) ship free inside `gsap`. Import from `gsap/ScrollTrigger` and `gsap/SplitText`; no Club registry. | T-040, T-044 |
| C-19 | Design enforcement | The Tailwind `@theme` resets the default palette, shadows and font weights (`--color-*: initial`, `--shadow-*: initial`, `--font-weight-*: initial`), so off-system classes fail to compile instead of relying on review only. | T-040 |
| C-20 | Frontend-first with mocks | Owner decision: build and review the whole web app on mock data before the backend (deviates from the day plan in PRD §12 / TDD §20). Mocks use MSW (≥ 2.12, SSE support) at the network layer, live only in `apps/web/src/mocks/**`, parse every payload with the shared Zod schemas, are excluded from production builds, and are retired per domain in T-086. MSW becomes a web dev dependency, also used for component tests. | T-082 – T-086, T-043, T-046, T-059, T-061, T-064 |

## Open questions (PRD §15) → where they get answered

| Q | Question | Answered in | Default if unanswered |
| :-- | :--- | :--- | :--- |
| Q-01 | Final vision / agent model | T-027 (benchmark) | `google/gemini-2.5-flash` + fallbacks from TDD §6.1 |
| Q-02 | Production domain | T-011 | Dokploy-generated domain until purchased |
| Q-03 | Buy a BestTime key? | T-029 | No key: Forecast + Simulation tiers only |
| Q-04 | Local etiquette reviewer | T-017 (owner action) | Rules ship with "curated, pending local review" note in DECISIONS |
| Q-05 | Venue photo sources | T-018 | Own photos or CC-BY only, credited per venue |
| Q-06 | Shareable permalinks for non-owners | T-053 | Owner-only (C-12) |

---

## Definition of Done

A task is `done` only when **all** of these hold:

- Every acceptance criterion is ticked and every **Verify** step was actually run.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass at the repo root.
- New logic has tests at the level the skill requires (pure functions: unit; services with I/O: unit with fakes or integration; user flows: e2e where listed).
- No secrets, no `console.log`, no commented-out code, no `TODO` without a task ID (`// TODO(T-0xx): …`).
- User-facing strings go through i18n (EN + ID), and every new env var is in `.env.example` and the Zod env schema.
- Spec deviations are recorded in `docs/DECISIONS.md`.
- Work is committed on a branch named `t-0xx-short-slug` with Conventional Commit messages.
