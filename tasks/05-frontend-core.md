# Phase 05 — Frontend Core

Goal of the phase: the landing page and the analyzer work end-to-end against the MSW mock layer
(Phase 05a), and later against the real API without code changes,
with the design system enforced at compile time and both languages wired in.

Exit criteria: Flow A (landing → preset → stream → results) runs in `pnpm dev:mock` with no backend running.
Execution stage: Frontend prototype (see `tasks/README.md` → Execution order); build after T-082 and T-083.

Design reference for every task here: PRD §10 and TDD §13.5 (which adapt `docs/DESIGN.md`).
When DESIGN.md and PRD §10.3 disagree, PRD §10.3 wins (Geist font, crowd colours for data only,
amber simulation banner, denser `/app`).

---

### T-040 · Design tokens, fonts, and global styles
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D2
- **Depends on:** T-008
- **Spec:** TDD §13.5, §13.8 (fonts) · PRD §10.2, §10.3 · DESIGN.md (Tokens, Do's and Don'ts) · Clarifications C-17, C-18, C-19
- **Goal:** Only on-system colours, radii, weights, and type sizes can be used.

**Scope**
- `src/styles/index.css`: `@import "tailwindcss";` then `@theme` with resets first (`--color-*: initial; --shadow-*: initial; --inset-shadow-*: initial; --drop-shadow-*: initial; --font-weight-*: initial;`) followed by the TDD §13.5 tokens, `--font-weight-normal: 400`, `--font-weight-medium: 500`, line-heights and tracking per DESIGN.md type scale (`-0.03em` for ≥ 28 px; `0.1em` uppercase eyebrows).
- Fonts via Fontsource: `@fontsource/geist-sans` and `@fontsource/geist-mono`, weights 400 and 500 only, imported in `main.tsx`; preload the 500 weight; `font-display: swap`.
- Base layer: `body` on `--color-white` with `--color-ink` text, visible focus ring (`outline` 2 px ink, offset 2 px), `prefers-reduced-motion` respected globally for CSS transitions.
- `lib/cn.ts` (`clsx` + `tailwind-merge`).
- `lib/gsap.ts`: register `ScrollTrigger`, `SplitText`, `useGSAP`; export a `useReducedMotion()` hook.

**Out of scope**
- Components (T-041).

**Files**
- `apps/web/src/styles/index.css`, `apps/web/src/lib/{cn.ts,gsap.ts}`, `apps/web/src/main.tsx`

**Acceptance criteria**
- [x] `bg-red-500`, `shadow-md`, and `font-bold` produce no CSS (verify in build output) and fail `lint-design`.
- [x] Only Geist 400/500 font files appear in the production build.
- [x] Lime is never used as a text colour on white (contrast rule, PRD §8 Accessibility) — documented in a comment beside the token.

**Verify**
- `pnpm --filter web build && pnpm lint`

---

### T-041 · UI kit (`components/ui`)
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D2
- **Depends on:** T-040
- **Spec:** TDD §13.4 (UI kit list), §13.5 lint rules · PRD §10.4 · DESIGN.md (Components)
- **Goal:** A small set of accessible primitives so feature code never re-styles basics.

**Scope**
- `Button` (`variant: 'primary' | 'ghost' | 'link'`, `size`, `asChild`-free; primary = lime pill 28 px radius, the **only** lime CTA path), `Card` (`tone: 'white' | 'parchment' | 'dark' | 'lime'`, radius 28, padding 32–48), `InnerCard` (radius 18), `Pill`/`Tag` (eyebrow style), `Tabs` (roving tabindex, `aria-selected`), `Switch` (button with `role="switch"` + `aria-checked`), `Input`, `Select` (native `<select>` styled), `Dialog` (native `<dialog>` + focus return), `Toast` (`aria-live="polite"` region), `Spinner`, `VisuallyHidden`.
- Each component: typed props, accepts `ref` as a regular prop (React 19, no `forwardRef`), accepts `className`, no business logic, no data fetching.
- A dev-only `/__ui` route (excluded from production build) rendering every variant for visual checks.

**Out of scope**
- Headless UI libraries (not in the stack; native elements cover these needs).

**Files**
- `apps/web/src/components/ui/**`

**Acceptance criteria**
- [x] Testing Library tests: keyboard operation of Tabs, Switch, Dialog (Esc closes, focus returns).
- [x] axe check on `/__ui` reports no violations.
- [x] No component uses a hard-coded hex colour.

**Verify**
- `pnpm --filter web test -- components/ui`

---

### T-042 · App shell, routing, and i18n
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D2
- **Depends on:** T-041
- **Spec:** TDD §13.1, §13.7 · PRD §5 (sitemap, global nav), F-13 (AC-13.1, AC-13.3) · DESIGN.md (Layout, footer)
- **Goal:** Every route from PRD §5 exists (placeholder where its task is later), in EN and ID.

**Scope**
- Router per TDD §13.1 with `lazy` for auth, me, admin, about, privacy; `RequireAuth` / `RequireRole` wrappers stubbed (real checks in T-059).
- `RootLayout`: header (logo wordmark, `How it works`, `Analyzer`, `Disclosure`, `EN | ID` toggle, `Sign in` ghost, lime `Try Analyzer`), footer (dark ink, links, system status badge from `/system/status`), toast region, skip-to-content link.
- `react-i18next` with namespaces `common`, `landing`, `analyzer`, `results`, `auth`, `admin`; detection order `localStorage` → `navigator.language` → `en`; `<html lang>` follows the active language.
- `lib/format.ts`: `formatWita`, numbers, minutes, distance — via shared time utils + `Intl`.
- `NotFound` page and a route-level error boundary with a friendly retry.
- A CI check script `i18n:check` that fails if EN and ID key sets differ.

**Out of scope**
- Persisting language to the user profile (T-059).

**Files**
- `apps/web/src/app/**`, `apps/web/src/locales/{en,id}/*.json`, `apps/web/src/lib/{i18n.ts,format.ts}`, `scripts/i18n-check.mjs`

**Acceptance criteria**
- [ ] All PRD §5 paths resolve; lazy chunks load only when visited (network tab).
- [ ] Switching language updates every visible string without reload and persists across reloads.
- [ ] `i18n:check` passes and runs in `pnpm lint`.

**Verify**
- `pnpm --filter web test && pnpm lint`

---

### T-043 · API client, query hooks, and product events
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D2
- **Depends on:** T-042, T-082 (real endpoints arrive with T-037; switched in T-086)
- **Spec:** TDD §11 (Frontend row, CSRF header), §13.2 · PRD §11
- **Goal:** One typed way to call the API, with consistent errors.

**Scope**
- `lib/apiClient.ts`: `fetch` wrapper with base `VITE_API_BASE`, `credentials: 'include'`, `X-Requested-With: margi-ai` on non-GET, JSON/multipart support, response validation with shared Zod schemas, `ApiError` carrying `code` and `requestId`. A 401 hook point for refresh (implemented in T-059).
- `lib/queryKeys.ts` factory; hooks `usePresets`, `useOrigins`, `useRegencies`, `useSystemStatus`, `useVenueForecast`.
- `lib/track.ts`: `track(name, props)` → `POST /events`, fire-and-forget, never throws, batched per animation frame.
- Error message mapping from `ErrorCode` to i18n keys.

**Out of scope**
- Analysis stream (T-046).

**Files**
- `apps/web/src/lib/{apiClient.ts,queryKeys.ts,track.ts}`, `apps/web/src/features/*/api.ts`

**Acceptance criteria**
- [ ] Unit tests using the shared MSW handlers (`mocks/node.ts`): success parse, schema mismatch → typed error, error body → `ApiError` with `requestId`.
- [ ] No component calls `fetch` directly (grep in review).

**Verify**
- `pnpm --filter web test -- lib`

---

### T-044 · Landing page
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D2
- **Depends on:** T-042, T-043
- **Spec:** PRD F-01 (AC-01.1–AC-01.5), §9 (copy), §10.1, §10.5 · TDD §13.6 · BRD §2 (numbers) · DESIGN.md (Lime Accent Block, Dark Island, Layout)
- **Goal:** A judge reaches a running analysis in exactly one click from the first screen.

**Scope**
- Sections: lime hero (display headline "Same vibe. Without the queue.", one-line sub-copy, `Try Analyzer` CTA, 4 `PresetCard`s), *Problem in numbers* (dark island; figures from BRD §2 with source captions), *How the 3 agents work*, *Impact for MSMEs & regencies*, *Responsible AI*, dark footer.
- Preset card click → `navigate('/app?preset={id}&run=1')`.
- GSAP (cut-line #4 for anything beyond the basics): headline line reveal with SplitText, count-up stats, ScrollTrigger fade-up; all inside `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`.
- Hero image with explicit `width/height`, `fetchpriority="high"`; preset images lazy below the fold.
- No popups, cookie walls, or modals on load (AC-01.5).

**Out of scope**
- Analyzer (T-045).

**Files**
- `apps/web/src/pages/landing/**`, `apps/web/src/features/analyzer/PresetCard.tsx`

**Acceptance criteria**
- [ ] Clicking any preset starts an analysis without further input (Playwright check in T-068).
- [ ] Lighthouse mobile: LCP ≤ 2.5 s, CLS < 0.1 on the production build.
- [ ] With reduced motion enabled, no GSAP animation runs.

**Verify**
- `pnpm --filter web build && pnpm --filter web preview`, Lighthouse in Chrome DevTools.

---

### T-045 · Analyzer input panel
- **Status:** todo · **Priority:** P0 ("Use my location" is cut-line #2) · **Size:** L · **Day:** D2
- **Depends on:** T-043
- **Spec:** PRD F-02 (AC-02.1–AC-02.6), Flow B (§6.2), F-06 (AC-06.1) · TDD §13.2 (`analyzerStore`), §13.4, §9 (client row)
- **Goal:** A fast, validated input panel that feeds the analysis request.

**Scope**
- `stores/analyzerStore.ts` (Zustand): `presetId`, `file`, `previewUrl`, `originVenueId`, `arrival` (`{ day, hour }` WITA, `isManual`), `simulate`; actions; revokes object URLs.
- `PresetGrid` (selecting fills image preview, origin, default time; user may still change time).
- `ImageDropzone`: `react-dropzone`, accepts JPEG/PNG/WebP/HEIC; HEIC converted in the browser when supported, else a clear bilingual message; `browser-image-compression` to 1024 px WebP q≈0.82; reject > 5 MB after compression; preview radius 18.
- `OriginSelect` (native select from `/origins`) + "Use my location" (geolocation → nearest origin ≤ 5 km via `haversineKm`, else "Nearest supported area: …"; coordinates never sent to the API).
- `ArrivalTimePicker`: day + hour (step 1 h), label `WITA (UTC+8)`, small local-time equivalent when the browser zone differs.
- `SimulationToggle` with the exact PRD AC-06.1 label in both languages.
- CTA `Analyze vibe` disabled with helper text until a preset or photo exists.
- URL state: `?preset=&run=1` triggers auto-run once, then removes `run` from the URL.

**Out of scope**
- Running/streaming (T-046).

**Files**
- `apps/web/src/features/analyzer/**`, `apps/web/src/stores/analyzerStore.ts`, `apps/web/src/pages/app/**`

**Acceptance criteria**
- [ ] Component tests: preset fills fields; oversize file rejected; HEIC fallback message; CTA disabled state.
- [ ] Mobile (360 px): single column, sticky CTA at the bottom (PRD AC-09.4).
- [ ] Every control is keyboard-operable with visible focus.

**Verify**
- `pnpm --filter web test -- analyzer`

---

### T-046 · `useAnalysisStream` hook and stream store
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D2
- **Depends on:** T-045, T-083 (real SSE arrives with T-036; switched in T-086)
- **Spec:** TDD §13.3, §13.2 (`streamStore`), §6.7 · PRD AC-07.5, AC-09.2
- **Goal:** Start an analysis and turn SSE events into progressively available UI state.

**Scope**
- `stores/streamStore.ts`: `analysisId`, `status` (`idle | starting | streaming | completed | failed`), `events[]` (deduped by event id), `sections` (`vibe`, `origin`, `candidates`, `recommendations`, `result`), `error`, `activeCardId`, `activeTab`.
- `useAnalysisStream()`: `start(input)` → multipart `POST /analyses` → `new EventSource(streamUrl, { withCredentials: true })` → parse each event with `StreamEvent` → dispatch. Native reconnect uses `Last-Event-ID`; after 3 failed reconnects fall back to `GET /analyses/:id` polling every 2 s until terminal. Closes the source on `done`/`error`, on unmount, and when a new analysis starts.
- Map `error.code` to i18n messages; `NOT_A_SCENE` shows the friendly "use a preset" message (PRD AC-03.3).
- Fire `analysis_started`, `simulation_toggled` product events.

**Out of scope**
- Rendering (T-047, Phase 06).

**Files**
- `apps/web/src/features/stream/useAnalysisStream.ts`, `apps/web/src/stores/streamStore.ts` (+ tests with a fake `EventSource`)

**Acceptance criteria**
- [ ] Tests: event dedupe on replay, section updates per `partial`, reconnect then fallback polling, cleanup on unmount (no leaked `EventSource`).
- [ ] Invalid event payloads are ignored and logged to the console only in dev.

**Verify**
- `pnpm --filter web test -- stream`

---

### T-047 · Glass-Box Thought Stream panel
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D2
- **Depends on:** T-046
- **Spec:** PRD F-07 (AC-07.1–AC-07.6), §10.4 (Thought Stream) · TDD §13.4 (`ThoughtStream`) · BRD BR-07
- **Goal:** A terminal-like dark island that proves the agents are working, step by step.

**Scope**
- Dark island card (`#30302a`), parchment text, Geist Mono 13 px. Groups: `Orchestrator`, `Agent 1 · Vibe`, `Agent 2 · Crowd`, `Agent 3 · Bundler`.
- `StepRow`: status icon (lime dot running, check done, amber triangle fallback, cross failed), title, detail, `ms`; expandable payload (`<details>`) rendering compact JSON / the CFS table for crowd tool calls; tier badge on `tool_call`.
- Footer line: total time and models used (from `done`).
- `aria-live="polite"` on the list, auto-scroll that stops when the user scrolls up, collapsible after completion, GSAP stagger 60 ms for new rows (reduced-motion safe).
- Shows decision summaries only, never raw chain-of-thought (AC-07.4).

**Out of scope**
- Result cards (Phase 06).

**Files**
- `apps/web/src/features/stream/ThoughtStream.tsx`, `StepRow.tsx` (+ tests)

**Acceptance criteria**
- [ ] Renders the T-083 mock transcript correctly for the `normal`, `replay`, and `vision-busy` scenarios (T-039 later locks the same order against the real API).
- [ ] Screen reader announces new steps politely (verified with the axe/Testing Library role queries).

**Verify**
- `pnpm --filter web test -- ThoughtStream`
