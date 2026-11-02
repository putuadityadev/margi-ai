# Phase 01 — Shared Domain (`packages/shared`)

Goal of the phase: every number the product shows is produced by small, pure, 100%-tested
functions that both the API and the web app import. This phase is what you defend in the
Technical Verification session (BRD §7, TDD §7).

Rule for the whole phase: **no I/O, no NestJS, no React, no `Date.now()` inside functions** —
time is always passed in.

---

### T-012 · Constants and env-overridable tuning
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D1
- **Depends on:** T-003
- **Spec:** TDD §7 (constants block), §6.5 (bundling, travel speeds), §8.4 (baselines) · BRD §7.2, §7.3
- **Goal:** One typed home for every weight, threshold, and magic number in the scoring model.

**Scope**
- `constants/scoring.ts`: `CFS_WEIGHTS`, `RANK_WEIGHTS`, `THRESHOLDS` (`redZone`, `calmMax`, `simMin`, `corridorPenalty`, `surgePct`), `BUSYNESS_CLASSES`, `COSINE_CALIBRATION` (`floor` 0.20, `ceil` 0.85), `RELAXATION_LADDER` (TDD §6.5 table), `BUNDLE` (`maxPerCard` 2, `radiusKm` 3, `regionalFallbackRadiusKm` 5, weights 0.6/0.4), `TRAVEL_SPEED_KMH` (`corridorPeak` 18, `normal` 30), `CATEGORY_BASELINE_BUSYNESS` (TDD §8.4), `TOP_K` 20, `MAX_RECOMMENDATIONS_PER_TAB` 3, `MAX_SAME_CATEGORY` 2.
- `constants/domain.ts`: `RECIPIENT_REGENCIES`, venue category groups (`MSME_CATEGORIES`), supported locales, `WITA_ZONE = 'Asia/Makassar'`.
- `resolveScoringConfig(overrides)`: merges validated overrides (the API passes env values such as `COS_FLOOR`, `COS_CEIL`, `SIM_SURGE_PERCENT`) over defaults and returns a frozen object. Invalid overrides throw.
- Every constant carries a one-line comment citing its spec source (e.g. `// BRD §7.2: w1 + w2 + w3 = 1`).

**Out of scope**
- Reading env (the API does that in its config module and passes values in).

**Files**
- `packages/shared/src/constants/**`

**Acceptance criteria**
- [ ] Weight groups sum to 1 (unit test).
- [ ] `resolveScoringConfig({ cosFloor: 0.9, cosCeil: 0.8 })` throws (floor must be < ceil).
- [ ] No other file in the repo hard-codes 0.5/0.3/0.2, 75, 35, 70, 115, or 25 for scoring (grep in review).

**Verify**
- `pnpm --filter @margi-ai/shared test`

---

### T-013 · WITA time utilities
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-003
- **Spec:** TDD §7.1, §8.2 (open status, arrival/departure hours), §8.4 (virtual clock) · PRD AC-02.5 · Clarification C-03
- **Goal:** All time logic in one module, always in `Asia/Makassar`, with the 0 = Monday convention.

**Scope**
- `toWita(input: Date | string): DateTime`, `witaDayOfWeek(dt): 0..6` (Luxon `weekday - 1`), `witaHour(dt)`.
- `addHoursWrapped(dt, hours)` → `{ dayOfWeek, hour }` across midnight and Sunday → Monday.
- `isOpen(openingHours, dt)` where `openingHours` is `{ "0": [["08:00","18:00"]], … }`; supports multiple ranges per day and ranges crossing midnight (`["18:00","02:00"]`); missing day = closed.
- `isWithinWindow(windows, dt)` for corridor penalty windows `{ days, start, end }`.
- `pickQuietHours(curve24, openingHours, dt, { windowHours: 4, count: 3 })` → arrival/departure hour lists (TDD §8.2).
- `formatWita(dt, locale)` and `formatLocalEquivalent(dt, browserZone, locale)` using `Intl` (PRD AC-02.5).
- A Zod schema for `OpeningHours` and `PenaltyWindow` (reused by seed and admin).

**Out of scope**
- Busyness lookups (Phase 04).

**Files**
- `packages/shared/src/time/**`

**Acceptance criteria**
- [ ] Sunday 23:00 + 2 h → Monday (0) 01:00.
- [ ] A UTC instant of Sunday 16:30Z resolves to Monday 00:30 WITA, day 0.
- [ ] `isOpen` handles: closed day, multiple ranges, cross-midnight range, exact boundary (open at start, closed at end).
- [ ] 100% line and branch coverage for `src/time`.

**Verify**
- `pnpm --filter @margi-ai/shared test -- --coverage`

---

### T-014 · Scoring pure functions
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-012
- **Spec:** BRD §7.1–§7.3 · TDD §7.2–§7.6, §6.5 step 6 · Clarification C-05
- **Goal:** CFS, similarity calibration, ranking, fiscal boost, geo and impact maths — reproducible and fully tested.

**Scope** (signatures are a contract; keep names)
- `classifyBusyness(pct) → 'low' | 'below_average' | 'average' | 'above_average' | 'high'` (values > 100 → `high`).
- `cfs({ bEff, fPlus2, corridorPenalty }, weights?) → { raw, display }` (`display` clamped 0..100 and rounded; `raw` may exceed 100).
- `isRedZone({ cfsRaw, bEff }, thresholds?)` → `cfsRaw >= 75 || bEff >= 75`.
- `simVibeFromCosine(cos, calibration?)` → linear map from `[floor, ceil]` to `[0, 100]`, clamped.
- `rankScore(simVibe, cfsAlt, eFiscal, weights?)` (clamps `cfsAlt` to 0..100).
- `fiscalBoost({ phrStatus, isBufferZone, isHotspot })` → `100 | 0`.
- `haversineKm(a, b)`.
- `queueEstimateMin(typicalPeakQueueMinutes, bEff)` → `peak × clamp(bEff/100, 0, 1.2)`.
- `travelMinutesEstimate(distanceKm, isCorridorPeak)`.
- `timeSavedRange({ originQueue, originCorridorDelay, altQueue, altTravel })` → `[low, high]` at ±20 %, floored at 0, integers.
- `bundleScore(simVibe, distanceKm, radiusKm)` → `0.6·sim + 0.4·(100 − distance/radius·100)`, clamped.
- `googleMapsDirUrl({ lat, lng })` → `https://www.google.com/maps/dir/?api=1&destination=lat,lng`.
- Re-export everything from `@margi-ai/shared/scoring`.

**Out of scope**
- Partitioning, diversity, relaxation (T-016).

**Files**
- `packages/shared/src/scoring/**`

**Acceptance criteria**
- [ ] The worked example in TDD §7.6 is a test: Lempuyang `CFS = 86` (red zone); Taman Ujung `Sim = 78.5`, `CFS = 20`, `R = 82.3` (±0.1).
- [ ] Boundary tests: busyness 20/21, 35/36, 60/61, 74/75; `CFS` exactly 75; `cos` below floor, above ceil.
- [ ] 100% line and branch coverage for `src/scoring` (TDD §17).

**Verify**
- `pnpm --filter @margi-ai/shared test -- --coverage`

---

### T-015 · Zod contracts (schemas and inferred types)
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D1
- **Depends on:** T-003
- **Spec:** TDD §6.3 (VibeProfile), §6.5 (SynthesisOutput), §6.7 (StreamEvent), §10.2 (AnalysisResult, RouteCard), §10.3–§10.5 (DTO shapes), §4 (error format) · Clarification C-04
- **Goal:** One source of truth for every payload crossing a boundary (LLM ↔ API ↔ web).

**Scope**
- `schemas/vibe.ts`: `VibeDimension`, `VibeProfile` exactly as TDD §6.3.
- `schemas/telemetry.ts`: `TelemetryTier`, `TelemetrySnapshot` (`busynessNow`, `forecastNow`, `forecastPlus2`, `bEff`, `tier`, `synthetic`, `hourlyCurve[24]`, `arrivalHours`, `departureHours`, `isOpen`).
- `schemas/venue.ts`: `VenueLite`, `Regency`, `VenueCategory`, `VenueKind`, `OpeningHours` (re-export from time).
- `schemas/analysis.ts`: `CreateAnalysisInput` (multipart fields as strings coerced), `RouteCard`, `MsmeBundleItem`, `AnalysisResult` (TDD §10.2, including `meta.relaxedStep`, `meta.isReplay`, `simulation?`).
- `schemas/events.ts`: `StreamEvent` discriminated union on `type` (TDD §6.7), `AgentId`, step `status`.
- `schemas/synthesis.ts`: `SynthesisOutput` (TDD §6.5) and `BottleneckInsight`.
- `schemas/auth.ts`, `schemas/me.ts`, `schemas/admin.ts`: request bodies for TDD §10.3–§10.5 (password policy: ≥ 8 chars, letters + digits).
- `schemas/errors.ts`: `ApiError` shape and the shared `ErrorCode` union (API extends it).
- Use Zod 4 APIs (`z.uuid()`, `z.iso.datetime()`, `z.toJSONSchema()`); export `type X = z.infer<typeof X>` next to each schema.

**Out of scope**
- LLM-specific JSON Schema post-processing (T-022 owns `toLlmJsonSchema`).

**Files**
- `packages/shared/src/schemas/**`

**Acceptance criteria**
- [ ] A fixture `AnalysisResult` (`packages/shared/test/fixtures/analysis-result.lempuyang.json`) parses; it is reused by API and web tests (contract test, TDD §17).
- [ ] Each `StreamEvent` variant has a parse test, and an unknown `type` fails.
- [ ] `z.toJSONSchema(VibeProfile)` and `z.toJSONSchema(SynthesisOutput)` succeed (snapshot test).

**Verify**
- `pnpm --filter @margi-ai/shared test`

---

### T-016 · Candidate selection helpers (partition, diversity, relaxation)
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-014, T-015
- **Spec:** TDD §6.5 steps 2, 3, 5 · PRD AC-05.1, AC-05.5 · Clarification C-11
- **Goal:** The deterministic selection logic of Agent 3 as pure, tested functions.

**Scope**
- Input type `ScoredCandidate` (`venueId`, `kind`, `category`, `regencyPhrStatus`, `distanceKm`, `simVibe`, `bEff`, `cfsDisplay`, `isOpen`, `rank`).
- `passesStep(candidate, step)` using `RELAXATION_LADDER[step]` (sim minimum, `bEff` maximum, micro radius range).
- `partition(candidates, step)` → `{ micro, regional }`: micro = distance within the step's radius range; regional = `RECIPIENT` regency; a venue in both stays in micro only.
- `pickTop(list, { limit: 3, maxSameCategory: 2 })` sorted by `rank` desc with a stable tie-break (`simVibe`, then `venueId`).
- `selectWithRelaxation(candidates)` → walks steps 0 → 2 per partition independently until ≥ 2 results or steps are exhausted; returns `{ micro, regional, relaxedStep, relaxedReasons }`, where reasons are i18n keys (e.g. `relaxed.simLowered`), not prose.
- Never returns an empty partition without a reason code.

**Out of scope**
- MSME bundling queries (needs DB; T-033).

**Files**
- `packages/shared/src/scoring/selection.ts` (+ tests)

**Acceptance criteria**
- [ ] Tests cover: enough results at step 0; micro needs step 1; regional needs step 2; still-empty partition returns reason `relaxed.noCandidates`.
- [ ] Diversity rule never lets 3 of the same category through.
- [ ] Output order is deterministic for equal ranks.

**Verify**
- `pnpm --filter @margi-ai/shared test -- --coverage`
