---
name: margi-ai-engineering
description: Engineering rules and workflow for building MARGI AI, a pnpm monorepo with a NestJS 11 API, a React 19 + Vite 7 web app, a shared Zod/scoring package, Postgres + pgvector, Redis, MinIO, and OpenRouter-based AI agents. Use whenever writing, reviewing, refactoring, or testing code in this repository, and whenever picking up, implementing, or closing a task from the tasks/ folder.
---

# MARGI AI Engineering

You are building a competition MVP that judges will test at random hours with their own
inputs. It must be **correct, explainable, and impossible to crash**, and the code itself is
graded. Build exactly what the specs ask, in the simplest way that is still robust.

## 1. Sources of truth

Read before coding. When they conflict, the higher row wins.

| Priority | Source | Owns |
| :-: | :--- | :--- |
| 1 | `docs/DECISIONS.md` | Reviewed deviations and resolved questions (newest entry wins) |
| 2 | `tasks/README.md` → *Spec clarifications* | Corrections to outdated or conflicting spec details |
| 3 | `docs/TDD.md` | Architecture, data model, API, algorithms, fallbacks |
| 4 | `docs/PRD.md` | Features, acceptance criteria, UX rules, design adaptations (§10) |
| 5 | `docs/BRD.md` | Business rules, formulas (§7), scope limits (§8) |
| 6 | `docs/DESIGN.md` | Visual language (PRD §10.3 lists the approved deviations) |

Never invent behaviour the specs do not describe. If something is genuinely missing, choose the
simplest option consistent with the specs, implement it, and record it in `docs/DECISIONS.md`.

## 2. Task workflow

1. Open `tasks/README.md` → *Execution order*. In the current stage, pick the first `todo` task
   whose dependencies are `done`. Task IDs are identifiers, not the build order: the frontend
   prototype (stage 3, on mock data) is built before the backend (stage 4).
2. Read the task **and every spec section it cites**. Read the relevant reference file
   (section 9) for the layer you are touching.
3. Set `Status: in-progress`. Create branch `t-0xx-short-slug`.
4. Plan in a few lines: files to touch, functions to add, tests to write. If the plan needs
   anything listed under the task's *Out of scope*, stop and do the scoped work only.
5. Implement in small steps. Write the test with (or before) the logic for pure functions.
6. Run the task's **Verify** commands plus `pnpm lint && pnpm typecheck && pnpm test`.
7. Tick each acceptance criterion only after you have actually checked it. Set `Status: done`.
8. Commit with Conventional Commits referencing the task: `feat(api): add crowd agent (T-032)`.

Report honestly: if a check was skipped or failed, say so in the task notes and leave the box unticked.

## 3. Product invariants (never violate)

- **Guest-first.** No login, modal, or cookie wall before the core analysis (PRD D-01).
- **Numbers by code, words by LLM.** CFS, similarity, rank, distances, time saved, and filters are
  computed by pure functions in `packages/shared/scoring`. LLM output is never the source of a
  number, an ID, or an etiquette rule; it is validated and filtered against inputs (TDD §1.3, §6.5).
- **Every external call has a fallback and an honest label.** Telemetry: Live → Forecast →
  Simulation. LLM: model fallback → template / cached vibe / Last-Known-Good. Simulated or replayed
  data is always labelled as such in the UI (PRD AC-04.5, AC-06.4).
- **Time is WITA.** All time logic goes through `packages/shared/time` (`Asia/Makassar`,
  day 0 = Monday). Never call `new Date().getDay()` or `getHours()` for domain logic.
- **Privacy.** Guest photos are processed in memory and discarded. Uploaded images are sanitized
  (re-encoded, EXIF stripped) before any other use. GPS coordinates are never stored.
- **No secrets in code.** Config comes only from the validated env schema; `.env.example` lists names.
- **Bilingual.** Every user-facing string exists in EN and ID. Backend agent messages use the
  catalogue in `apps/api/src/agents/messages/`.

## 4. Engineering principles

### Keep it simple (no over-engineering)
- Implement the spec, not a framework for it. No generic repositories, no plugin systems,
  no abstract base classes "for later", no event sourcing, no CQRS.
- Add an interface only when there are **two real implementations now** (e.g. `TelemetryProvider`,
  `MailTransport`) or a test double is impossible without it.
- Prefer a plain function over a class, a class over a module, a module over a package.
- No new dependency when the platform or an existing dependency already does the job
  (native `<dialog>`, `Intl`, `crypto.randomBytes`, `AbortController`). A new dependency
  needs a one-line reason in the PR/commit body.
- Do not build configuration for values that never change; do make spec weights and thresholds
  configurable, because the TDD requires it (§7).
- Three similar lines are fine. Extract a helper on the third real use, not the first.

### Clean code
- Names say what a thing is in domain terms: `crowdFrictionScore`, `recipientRegency`, `bEff`
  (spec symbol, document once), not `data`, `info`, `handleStuff`, `utils2`.
- Functions do one thing, mostly < 40 lines, ≤ 3 positional parameters (use an object beyond that).
- Return early; avoid nested conditionals deeper than two levels.
- No magic numbers: scoring constants come from `packages/shared/constants`; others are named
  `const` with a unit in the name (`SSE_HEARTBEAT_MS`, `PRESIGN_TTL_SECONDS`).
- Make illegal states unrepresentable: discriminated unions over boolean flags, Zod-parsed types at
  every boundary, `readonly` where mutation is not intended.
- One component / service / module per file; file name matches the main export.

### Reliability (high availability within a single-instance MVP)
- Every network call has a timeout (`AbortSignal.timeout(ms)` or the client's option). No unbounded waits.
- Retries are explicit, bounded (max 1 unless the spec says otherwise), and only for retryable errors.
- Use `Promise.allSettled` when one failing item must not fail the batch; cap concurrency.
- Never leave a promise floating. Fire-and-forget work gets its own `.catch` that logs with context.
- Long-running analysis state always ends in a terminal status (`COMPLETED` / `FAILED`) — use `try/finally`.
- Degrade, don't crash: on dependency failure, return the documented fallback and log a warning.
- Idempotency for scripts and seeds: running twice must be safe.
- Validate input at the edge (Zod), trust nothing from clients, LLMs, or third-party APIs.

## 5. Code conventions

### TypeScript
- `strict` with `noUncheckedIndexedAccess`; no `any` (use `unknown` + parsing). No non-null `!`
  unless a comment proves why it cannot be null.
- Types come from Zod schemas (`z.infer`) for anything crossing a boundary; do not duplicate them by hand.
- `import type` for type-only imports. Named exports only (except where a framework requires default).
- Errors: throw typed errors (`AppException` with a stable `code` in the API; `ApiError` in the web).
  Never throw strings. Never swallow errors silently.
- Async: `async/await`, not `.then` chains. Pass `AbortSignal` through long call chains.

### Comments — pure English, purposeful
Write comments for the reader who must change this code later. Explain **why**, constraints,
units, spec references, and non-obvious trade-offs. Do not narrate what the code already says.

```ts
// Good: explains a non-obvious rule and where it comes from.
// BRD §7.2: live signal may exceed 100% during a viral surge, so only the display value is clamped.
const display = Math.min(100, Math.round(raw));

// Good: TSDoc on an exported function, with units.
/**
 * Great-circle distance between two WGS84 points.
 * @returns Distance in kilometres.
 */
export function haversineKm(a: LatLng, b: LatLng): number { … }

// Bad: restates the code.
// Increment the counter by one
count += 1;

// Bad: chatty, vague, or speculative.
// This is a super robust and scalable helper that handles everything!
// Might need to change this later?
```

Rules: TSDoc (`/** … */`) on every exported function, class, and type that is not self-evident.
Inline comments only where needed. `TODO` must reference a task: `// TODO(T-081): use routed duration`.
No commented-out code, no banner art, no emojis, no Indonesian in code comments
(UI copy belongs in locale files).

### Logging
- API: inject the Pino logger; structured fields (`analysisId`, `agent`, `ms`, `code`), short message.
- Never log secrets, tokens, cookies, passwords, full prompts, or image data.
- Levels: `error` = needs action, `warn` = degraded but handled (fallbacks), `info` = lifecycle, `debug` = local only.
- Web: no `console.*` in committed code.

### Git
- Branch per task; Conventional Commits (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`);
  scope = `api`, `web`, `shared`, `infra`, `docs`; subject in imperative mood, ≤ 72 chars; task ID in the subject or body.
- Small commits that each build and pass tests. Never commit `.env`, generated Prisma client, or build output.

## 6. Anti-slop checklist (reject in review)

- Placeholder logic, mocked data, or hard-coded results outside test fixtures, `LLM_MOCK` mode,
  and the web mock layer in `apps/web/src/mocks/**`. Feature and page code never branches on
  "are we mocked?".
- Code written "for completeness" that no task or spec asks for.
- Wrapper functions that only rename another function.
- Defensive checks for states the types already rule out; `try/catch` that only rethrows.
- Over-generic names (`Manager`, `Helper`, `Handler`, `processData`) and vague comments.
- Duplicated types that drift from the Zod schema.
- Console logs, commented-out code, unused exports, unused dependencies.
- UI that ignores the design rules: shadows, bold weights, extra accent colours, gradients,
  crowd colours on buttons, more than one lime CTA in view.
- Copy that over-promises ("real-time" for forecast data, "guaranteed" anything).

## 7. Testing expectations

- `packages/shared/scoring` and `packages/shared/time`: 100% line and branch coverage, including the
  TDD §7.6 worked example as a test.
- Services with I/O: unit tests with small fakes for collaborators; integration tests against real
  Postgres/Redis (Testcontainers or the compose services) for SQL, vector search, and streams.
- API endpoints: Supertest e2e with `LLM_MOCK=true`; always include the unhappy path (validation,
  auth, IDOR, rate limit).
- Web: Testing Library for behaviour (roles, keyboard), not snapshots of markup.
- Playwright for the five critical journeys only (T-068).
- Tests are deterministic: fake timers for time, seeded randomness, no real network, no sleeps.
- Details and patterns: `references/testing.md`.

## 8. Definition of Done

Identical to `tasks/README.md` → *Definition of Done*. In short: acceptance criteria verified,
lint/typecheck/tests green, tests at the required level, no secrets/console/dead code,
i18n complete, env documented, deviations recorded, committed on the task branch.

## 9. Reference files (load when relevant)

| Load when you touch… | File |
| :--- | :--- |
| `apps/api/**` (NestJS, Prisma, Redis, SSE, auth, storage) | `references/backend.md` |
| `apps/web/**` (React, routing, state, styling, animation, i18n, charts, map) | `references/frontend.md` |
| Agents, LLM client, prompts, embeddings, telemetry, scoring integration | `references/ai-pipeline.md` |
| Any test, CI test job, fixtures | `references/testing.md` |

## 10. Official documentation

Check the official docs for the installed major version before using an API you are not sure
about; library APIs change between majors and the TDD was written before some releases.

- NestJS: https://docs.nestjs.com · Prisma 7 upgrade guide: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
- pgvector: https://github.com/pgvector/pgvector · Redis Streams: https://redis.io/docs/latest/develop/data-types/streams/
- OpenRouter: https://openrouter.ai/docs (structured outputs, model fallbacks, embeddings)
- Zod 4: https://zod.dev (JSON Schema: https://zod.dev/json-schema) · nestjs-zod: https://github.com/BenLorantfy/nestjs-zod
- React: https://react.dev · Vite: https://vite.dev · React Router 7: https://reactrouter.com
- Tailwind CSS v4: https://tailwindcss.com/docs · TanStack Query v5: https://tanstack.com/query/latest
- Zustand: https://zustand.docs.pmnd.rs · GSAP + React: https://gsap.com/resources/React
- Recharts: https://recharts.org · React Leaflet: https://react-leaflet.js.org
- Luxon: https://moment.github.io/luxon · sharp: https://sharp.pixelplumbing.com
- Playwright: https://playwright.dev · Vitest: https://vitest.dev
