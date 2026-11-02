# Phase 09 — Hardening and Release `v1.0-submission`

Goal of the phase: the deployed product survives 50 random judge-style sessions with zero
crashes, meets the performance and accessibility targets, and is tagged for submission.

Exit criteria (PRD §12, Day 6): every G-01/G-02 metric met; tag `v1.0-submission` pushed.

---

### T-066 · Security hardening
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6–D7
- **Depends on:** T-036, T-056, T-060
- **Spec:** TDD §14 (all rows), §11 · PRD §8 (Security, Privacy) · BRD §10.1 · Clarification C-08
- **Goal:** Every control in TDD §14 is in place and tested.

**Scope**
- CSP from TDD §14 served by nginx for the web app (`default-src 'self'; img-src 'self' data: blob: https://*.tile.openstreetmap.org <media-domain>; connect-src 'self'; frame-ancestors 'none'`; add `font-src 'self'`, `style-src 'self'` — verify Recharts/Leaflet inline styles and adjust minimally with a documented reason).
- `helmet` tuning for the API: HSTS, `noSniff`, `referrerPolicy: strict-origin-when-cross-origin`.
- Throttler review: every public POST and auth route has an explicit limit; storage is Redis (`@nest-lab/throttler-storage-redis`); in-memory fallback when Redis is down (TDD §15).
- OpenRouter balance check: scheduled every 30 min (`GET /api/v1/key`), logs a warning below a threshold env `OPENROUTER_MIN_CREDIT`.
- Audit: `rg` for `dangerouslySetInnerHTML`, `process.env` outside config, raw SQL string concatenation, secrets in fixtures; `pnpm audit --prod`; gitleaks over full history.
- Security e2e suite: IDOR (analyses, images, trips), CSRF header, cookie flags, upload of a polyglot file, rate limits.

**Out of scope**
- External penetration test.

**Files**
- `apps/web/nginx.conf`, `apps/api/src/main.ts`, `apps/api/test/security.e2e-spec.ts`

**Acceptance criteria**
- [ ] Security e2e suite passes in CI.
- [ ] `securityheaders.com` (or `curl -I`) shows CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` on production.
- [ ] No high/critical findings from `pnpm audit --prod`.

**Verify**
- `pnpm --filter api test:e2e -- security`, `curl -I https://<domain>/`

---

### T-067 · Observability
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6–D7
- **Depends on:** T-035
- **Spec:** TDD §16 · PRD §8 (Observability, Availability)
- **Goal:** Know within one minute when the demo is broken, and why.

**Scope**
- `prom-client` metrics at `/api/metrics` (basic auth `METRICS_BASIC_AUTH`): `analysis_duration_seconds{stage}`, `llm_calls_total{model,status}`, `telemetry_tier_total{tier}`, `fallback_total{kind}`, default process metrics.
- Log fields standardised: `requestId`, `analysisId`, `userId?`, `agent`, `ms`.
- Optional Sentry (`SENTRY_DSN` empty = disabled) for API and web, with PII scrubbing.
- Uptime Kuma on Dokploy monitoring `/api/health` and `/` every minute, alerting to Telegram or email.

**Out of scope**
- Grafana dashboards (not required for MVP).

**Files**
- `apps/api/src/metrics/**`, `apps/web/src/lib/sentry.ts` (optional)

**Acceptance criteria**
- [ ] Running one analysis increments the expected counters (integration test reads `/api/metrics`).
- [ ] Stopping the API container triggers an Uptime Kuma alert.

**Verify**
- `curl -u user:pass localhost:3000/api/metrics | grep analysis_duration`

---

### T-068 · End-to-end tests (Playwright) in CI
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D6–D7
- **Depends on:** T-053, T-061, T-064
- **Spec:** TDD §17 (E2E row), §18.3 (`e2e` job) · PRD §6 (Flows A–D)
- **Goal:** The five critical journeys are tested on every push.

**Scope**
- Playwright project in `apps/web/e2e` (or `/e2e` at root) with `LLM_MOCK=true` API.
- Specs: (1) landing → Lempuyang preset → Micro + Regional visible; (2) custom upload; (3) simulation toggle → amber banner + `Simulated` badges; (4) register → verify via Mailpit API → save trip; (5) admin creates venue → generate → embed.
- Accessibility smoke with `@axe-core/playwright` on `/`, `/app` (with results), `/login`.
- CI job `e2e`: service containers (pgvector, redis, minio, mailpit) → migrate → seed → embed (mock) → build → start → test; uploads trace on failure.

**Out of scope**
- Visual regression testing.

**Files**
- `e2e/**`, `.github/workflows/ci.yml`

**Acceptance criteria**
- [ ] All 5 specs pass three consecutive CI runs (no flakiness; no fixed `waitForTimeout`).
- [ ] axe reports no serious or critical violations.

**Verify**
- `pnpm test:e2e`, green `e2e` job on GitHub.

---

### T-069 · Performance and accessibility pass
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6–D7
- **Depends on:** T-053
- **Spec:** PRD §8 (Performance, Accessibility, Compatibility), G-04, AC-01.4 · TDD §13.8
- **Goal:** Meet the numeric targets in PRD §8.

**Scope**
- Bundle budget: initial JS ≤ 250 KB gzip; add a CI check (`scripts/check-bundle.mjs` reading Vite's manifest) that fails above budget.
- Verify lazy chunks: admin, auth pages, Leaflet, Recharts.
- Images: WebP/AVIF with explicit dimensions; preset images responsive `srcset`.
- Lighthouse (mobile, production build): Performance ≥ 90 on `/`, Accessibility ≥ 90 on `/` and `/app`; LCP ≤ 2.5 s, CLS < 0.1.
- Manual keyboard-only run of Flow A and Flow B; screen reader spot check (NVDA or VoiceOver) of the Thought Stream and Route Cards.
- Cross-browser check: Chrome, Edge, Firefox, Safari/iOS 16+, widths 360–1440 px.

**Out of scope**
- Re-architecting for performance; fix only what measurements show.

**Files**
- `scripts/check-bundle.mjs`, fixes across `apps/web`

**Acceptance criteria**
- [ ] Lighthouse reports saved to `docs/eval.md` (scores + date).
- [ ] Bundle check runs in CI and passes.

**Verify**
- `pnpm --filter web build && node scripts/check-bundle.mjs`, Lighthouse.

---

### T-070 · Production deployment and operations runbook
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6–D7
- **Depends on:** T-011, T-038, T-066, T-067
- **Spec:** TDD §18.1, §15 (startup warm-up), §16 · PRD §8 (Availability 99.5 %)
- **Goal:** Production is configured, backed up, warmed, and documented.

**Scope**
- All production env vars set in Dokploy (cross-check against `.env.example`); `LLM_MOCK` and `LLM_FORCE_FAIL` false.
- Migrations run on API start; seed + `embed-venues` run once against production; `warm-cache` after every deploy (Dokploy post-deploy command or documented manual step).
- Daily Postgres backup to S3/R2 via Dokploy; one restore rehearsal into a scratch database.
- SSE through Traefik verified: events arrive incrementally (no buffering) — test with `curl -N`.
- `docs/runbook.md`: deploy, rollback (redeploy previous image), restore, rotate secrets, what to do when OpenRouter is down (breaker + LKG), how to toggle BestTime.

**Out of scope**
- Multi-instance scaling (v2, T-080).

**Files**
- `docs/runbook.md`

**Acceptance criteria**
- [ ] Production `warm-cache` exits 0.
- [ ] Backup restore rehearsal succeeds and is logged in the runbook.
- [ ] `curl -N` on a production stream shows events spaced in time, not delivered at the end.

**Verify**
- `pnpm --filter api script:warm-cache` against production, `curl -N https://<domain>/api/v1/analyses/<id>/stream`

---

### T-071 · Reliability smoke test (50 scenarios)
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6–D7
- **Depends on:** T-070
- **Spec:** TDD §17 (reliability row), §15 · PRD G-01, G-02 · BRD BO-02
- **Goal:** Prove "0 crashes in 50 random tests" before tagging.

**Scope**
- `scripts/smoke-prod.ts`: 50 randomized runs (presets × simulate on/off × hours including 00:00 WITA × both locales × custom uploads from `scripts/data/smoke-images/`, including a non-travel image), each followed through SSE to `done`/`error`. Records duration, tiers, fallbacks, replay flag.
- Staging run with `LLM_FORCE_FAIL=true`: presets must return LKG replays; uploads must return the recoverable "AI vision is busy" error, never a 500.
- Results table (p50/p95, crash count, fallback counts) appended to `docs/eval.md`; every failure becomes a bug fix before T-073.

**Out of scope**
- Load testing beyond the rate limits.

**Files**
- `apps/api/scripts/smoke-prod.ts`, `docs/eval.md`

**Acceptance criteria**
- [ ] 50/50 runs end in `done` (or the expected `NOT_A_SCENE`), 0 unexpected errors.
- [ ] p95 ≤ 10 s overall, ≤ 6 s for presets.
- [ ] Forced-failure run behaves as specified.

**Verify**
- `pnpm --filter api script:smoke-prod -- --base https://<domain> --runs 50`

---

### T-072 · README, `.env.example` audit, architecture diagram
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6–D7
- **Depends on:** T-070
- **Spec:** BRD BO-04, §10.1 · PRD G-04, §8 (Compliance) · TDD §3 (`docs/ARCHITECTURE.png`), §18.2, §18.4
- **Goal:** A judge can understand, run, and verify the project from the repository alone (Lampiran B).

**Scope**
- `README.md`: one-paragraph pitch, live URL, 60-second judge guide (presets, upload, Judge Test Mode, where to see the Thought Stream), architecture diagram, the 3 agents and the formulas (CFS, Sim, R with the §7.6 worked example), fallback tiers, tech stack, local setup (compose → migrate → seed → embed → dev), testing commands, env table (names only), known limitations (BRD §9.2), license, AI Disclosure link.
- `docs/ARCHITECTURE.png` (exported from the TDD §1.1 Mermaid diagram, updated if implementation differs).
- `.env.example` audit: every variable read by the env schema is present, no values that look like secrets, comments explain each group.

**Out of scope**
- Proposal PDF (T-075).

**Files**
- `README.md`, `docs/ARCHITECTURE.png`, `.env.example`

**Acceptance criteria**
- [ ] A fresh clone following only the README reaches a working local analysis (dry run by the owner).
- [ ] A script diff between env schema keys and `.env.example` keys is empty.

**Verify**
- Fresh clone in a temporary directory; follow README verbatim.

---

### T-073 · Release `v1.0-submission`
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D6–D7
- **Depends on:** T-068, T-069, T-071, T-072
- **Spec:** BRD §10.1.3 (version locking) · TDD §18.3 · PRD §12 (Day 6)
- **Goal:** An immutable, traceable submission version.

**Scope**
- Confirm CI green on `main`, production running that exact commit (`/system/status.commit`).
- Annotated tag `v1.0-submission` on that commit; push the tag; record the commit hash in `docs/DECISIONS.md` and for the proposal.
- Freeze rule: after tagging, only critical fixes go to `main`; each needs a new patch tag and a note in DECISIONS.

**Out of scope**
- `v2.0-final` (Phase 11).

**Files**
- `docs/DECISIONS.md`

**Acceptance criteria**
- [ ] `git show v1.0-submission` matches the production commit.
- [ ] Commit hash recorded.

**Verify**
- `git rev-parse v1.0-submission`, `curl https://<domain>/api/v1/system/status`
