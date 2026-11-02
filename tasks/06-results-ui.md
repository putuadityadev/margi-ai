# Phase 06 — Result Dashboard and Static Pages

Goal of the phase: the result dashboard renders progressively from stream sections, explains
every number, and turns a recommendation into a Google Maps navigation in one click.

Colour rule: `crowd-*` and `sim-banner` tokens may only be used in `features/results/*` and
`components/data/*` (TDD §13.5). Buttons and actions never use crowd colours.

Execution stage: Frontend prototype, built against the T-083 mock stream (no backend needed).

All components read from `streamStore` sections; none fetch data themselves (except the
lazy-loaded map tiles).

---

### T-048 · Origin summary, status banners, and disclaimers
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D3
- **Depends on:** T-046
- **Spec:** PRD AC-04.3, AC-05.7, AC-06.3, §9 (disclaimers) · TDD §13.4 (`OriginSummary`), §15 (replay banner)
- **Goal:** The user instantly sees whether their destination is a Red Zone and what kind of data they are looking at.

**Scope**
- `OriginSummary`: venue name, regency, Red Zone pill ("Red Zone — Reroute recommended") or calm banner, large CFS number (count-up), busyness class badge with tier label, queue estimate, arrival/departure hours, bottleneck insight sentence.
- `components/data/BusynessBadge` (class colour + `%` + tier: `Live` / `Forecast` / `Simulated` / `Simulated (baseline)`).
- Banners: simulation (amber `sim-banner`, "Simulated data — not live conditions"), replay ("Replayed result — AI provider unavailable"), relaxed match summary.
- `Disclaimers` block (crowd + AI disclaimer, always rendered under results).

**Out of scope**
- Histogram (T-050).

**Files**
- `apps/web/src/features/results/{OriginSummary,Banners,Disclaimers}.tsx`, `apps/web/src/components/data/BusynessBadge.tsx`

**Acceptance criteria**
- [x] With `simulate=true` every badge reads `Simulated` and the amber banner is visible (fixture test).
- [x] Disclaimers render in both locales.

**Verify**
- `pnpm --filter web test -- results/OriginSummary`

---

### T-049 · Vibe Breakdown
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D3
- **Depends on:** T-046
- **Spec:** PRD AC-03.5, F-09 · TDD §13.4 (`VibeBreakdown`)
- **Goal:** Show what the AI "saw" in the photo.

**Scope**
- Reference thumbnail (preset image or local preview), scene summary sentence, 5 rows (topography, architecture, lighting, activity, visual density) with intensity bars (ink on parchment, not crowd colours), descriptor chips, confidence as text.
- Skeleton state until `sections.vibe` arrives.

**Out of scope**
- Per-card dimension matches (inside RouteCard, T-051).

**Files**
- `apps/web/src/features/results/VibeBreakdown.tsx` (+ test)

**Acceptance criteria**
- [x] Bars expose their value to assistive tech (`role="meter"` with `aria-valuenow`).
- [x] Renders from the shared fixture without layout shift when data arrives (fixed skeleton height).

**Verify**
- `pnpm --filter web test -- VibeBreakdown`

---

### T-050 · Dual-Histogram Crowd Visualizer
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D3
- **Depends on:** T-048
- **Spec:** PRD F-08 (AC-08.1–AC-08.4) · TDD §13.4 (`DualHistogram`), §13.8 (lazy Recharts) · BRD BR-08
- **Goal:** Red origin vs green alternative, hour by hour, readable by everyone.

**Scope**
- Recharts `ComposedChart`, hours 06:00–22:00 WITA: origin bars coloured by busyness class (surge hour marked "Live surge"/"Simulated surge" as appropriate), alternative bars in the calm scale for the active card.
- `ReferenceLine` at 35 and 75, vertical line at the arrival hour, custom tooltip with both values + class labels, legend.
- Switching `activeCardId` animates the alternative series (Recharts animation, disabled on reduced motion).
- Screen-reader summary: visually hidden text with peak hours and values at the arrival hour for both venues (AC-08.4).
- Loaded lazily (`React.lazy`) after the first `partial: origin` event or on idle.

**Out of scope**
- Map (T-052).

**Files**
- `apps/web/src/features/results/DualHistogram.tsx`, `apps/web/src/components/data/crowdScale.ts`

**Acceptance criteria**
- [x] Recharts is absent from the initial JS bundle (check the build manifest).
- [x] Colour is never the only signal: tooltip and summary include class names.

**Verify**
- `pnpm --filter web build` (inspect chunks), `pnpm --filter web test -- DualHistogram`

---

### T-051 · Route tabs, Route Cards, MSME bundle, Navigate
- **Status:** done · **Priority:** P0 · **Size:** L · **Day:** D3
- **Depends on:** T-048, T-049
- **Spec:** PRD F-05 (AC-05.1–AC-05.6), §9 ("Why this boost?"), §10.4 (Route Card, Impact Badge) · TDD §13.4 · BRD BR-03, BR-04, BR-09
- **Goal:** Each recommendation is a self-explanatory, actionable card.

**Scope**
- `RouteTabs`: `Micro Escape (1–3 km)` / `Regional Discovery (6 recipient regencies)`, tab in URL (`?tab=micro`), max 3 cards each.
- `RouteCard` (white on parchment): photo (radius 18), name, regency, distance + travel estimate ("estimate" label), large Vibe Match % (40 px, count-up) + top matching dimensions, busyness badge, Impact Badges (`Time saved ~X–Y min`, `Fiscal Equity Boost` with "Why this boost?" tooltip, `Supports N local MSMEs`), `whyItMatches`, `bestTimeTip`, Cultural Etiquette (≤ 3), `Relaxed match` label with reasons when present, `Navigate` (lime is reserved for the primary CTA; Navigate uses the ghost/link style unless it is the single CTA in view).
- `MsmeBundleItem` (parchment inner card radius 18): name, category, distance from DTW, busyness, pairing reason, own `Navigate`.
- "How is this calculated?" disclosure that recomputes CFS and R on the client with shared scoring functions from the card's inputs (TDD §3 note) — proves the numbers are deterministic.
- `Navigate` opens `mapsUrl` in a new tab (`rel="noopener noreferrer"`) and tracks `navigate_clicked` with `venueId` + `kind`; card visibility tracks `recommendation_viewed`.
- Selecting a card sets `activeCardId` (drives histogram and map).

**Out of scope**
- Save trip button behaviour for guests (T-061); here it renders and calls a handler prop.

**Files**
- `apps/web/src/features/results/{RouteTabs,RouteCard,MsmeBundleItem,ImpactBadges,Etiquette,ScoreExplainer}.tsx`

**Acceptance criteria**
- [x] Client recomputation in `ScoreExplainer` equals the server values for the fixture (test).
- [x] Temple cards always show the sarong rule (fixture test).
- [x] Cards are reachable and operable by keyboard; Navigate links have descriptive accessible names.

**Verify**
- `pnpm --filter web test -- results`

---

### T-052 · Map view
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D3
- **Depends on:** T-051
- **Spec:** PRD AC-09.1 (markers), AC-09.4 · TDD §13.4 (`MapView`), ADR-11, §14 (CSP tile domain)
- **Goal:** Spatial context for origin, alternatives, and MSMEs without Google Maps billing.

**Scope**
- `react-leaflet` + Leaflet CSS, lazy-loaded chunk; OSM tiles with attribution.
- Markers as `divIcon` using tokens: origin = crowd-high, alternatives = crowd-low, MSMEs = lime outline; active card emphasized; `fitBounds` on result and on tab change.
- Collapsible on mobile; map is decorative for screen readers (`aria-hidden`) because the same data is in the cards.

**Out of scope**
- Admin map picker (T-064 reuses this chunk).

**Files**
- `apps/web/src/features/results/MapView.tsx`

**Acceptance criteria**
- [x] Leaflet is not in the initial bundle.
- [x] Tiles load under the CSP defined in T-066.

**Verify**
- `pnpm --filter web build`, manual check in preview.

---

### T-053 · Result dashboard composition, actions, and permalink
- **Status:** done · **Priority:** P0 (regenerate button is cut-line #3) · **Size:** M · **Day:** D3
- **Depends on:** T-047, T-048, T-049, T-050, T-051, T-052
- **Spec:** PRD F-09 (AC-09.1–AC-09.4), AC-13.2, §5 (`/app/a/:analysisId`) · TDD §13.1 (loader) · Clarification C-12 · Q-06
- **Goal:** The full analyzer page in the PRD order, usable on desktop and mobile, re-openable by link.

**Scope**
- Layout order (desktop): Thought Stream (collapsible after done) → Origin summary → Vibe Breakdown → Dual Histogram → Route Tabs → Map → Etiquette & Disclaimers. Each section appears as soon as its stream section exists (AC-09.2).
- Actions: `Save trip` (handler from T-061), `Re-run with simulation`, `New analysis`, `Copy link` (`/app/a/:id`, toast confirmation).
- `/app/a/:analysisId`: loader calls `GET /analyses/:id`; owner sees the stored result (and stored trace in the Thought Stream); others get a friendly "This analysis is private" page (C-12).
- Language switch after a run shows `Regenerate in {language}` (calls T-038 endpoint; numbers unchanged).
- Mobile < 768 px: single column, sticky bottom CTA, map collapsed by default.

**Out of scope**
- Saving trips (T-061).

**Files**
- `apps/web/src/pages/app/AnalyzerPage.tsx`, `apps/web/src/features/results/ResultDashboard.tsx`

**Acceptance criteria**
- [x] Flow A works end-to-end in `pnpm dev:mock` for every T-083 scenario (real-API verification happens in T-086).
- [x] Reloading `/app/a/:id` restores the same result.
- [x] Q-06 decision recorded in `docs/DECISIONS.md`.

**Verify**
- Manual run of Flow A and Flow B; `pnpm --filter web test`

---

### T-054 · AI Disclosure and Privacy pages
- **Status:** done · **Priority:** P0 · **Size:** S · **Day:** D3
- **Depends on:** T-042
- **Spec:** PRD §5 (`/about/ai-disclosure`, `/privacy`), §8 (Privacy), §9 · BRD §10 · TDD §2
- **Goal:** Responsible-AI and privacy commitments are visible inside the product.

**Scope**
- `/about/ai-disclosure`: how the 3 agents work, which models (from `/system/status` or build-time env), data sources, fallback tiers, simulation honesty, Fiscal Equity Boost rationale, limitations (BRD §9.2). Content mirrors `docs/DISCLOSURE.md` (T-074 keeps them in sync).
- `/privacy`: guest photos processed in memory and discarded; logged-in photos private and deletable; GPS never stored; cookies used (`margi_sid`, `margi_at`, `margi_rt`) and why.
- Both pages EN/ID.

**Out of scope**
- Legal review.

**Files**
- `apps/web/src/pages/about/**`, `apps/web/src/pages/privacy/**`

**Acceptance criteria**
- [x] Every cookie name the API sets is listed on `/privacy`.
- [x] Linked from the header (`Disclosure`) and footer.

**Verify**
- Manual review in both languages.
