# Phase 02 — Curated Knowledge Base and Seed

Goal of the phase: 40–60 real, verified Bali entities with hours, forecasts, etiquette, and
photos, loaded idempotently with one command. Data quality decides whether the judges
believe the recommendations (PRD §13, "irrelevant recommendations" risk).

Data lives as JSON in `apps/api/prisma/seed/data/` and is validated by Zod before insert.
Treat these files like code: reviewed, versioned, no placeholders in `main`.

---

### T-017 · Regencies, corridors, and etiquette rules
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D4
- **Depends on:** T-006, T-013
- **Spec:** BRD §2.2 (table), §2.3, §7.2 · TDD §5 (Regency, Corridor, EtiquetteRule), §19 (etiquette ids) · PRD AC-05.4, Q-04 · Clarifications C-02, C-03
- **Goal:** Reference data that the scoring and guardrails depend on.

**Scope**
- `regencies.json`: the 9 regencies with `nameEn`, `nameId`, `phrStatus` (3 `DONOR`: Badung, Gianyar, Denpasar; 6 `RECIPIENT`: Bangli, Buleleng, Jembrana, Karangasem, Klungkung, Tabanan).
- `corridors.json`: `jl-raya-ubud` (daily 10:00–21:00), `canggu-junction` (daily 15:00–18:00), `bypass-sanur` (07:00–08:30 northbound peak, 11:00 reversal, weekend 15:00+ toward ICON Bali), each with center, radius, `typicalDelayMinutes` derived from BRD §2.3 (document the derivation in a `_source` field), and `penaltyWindows` using the 0 = Monday convention.
- `etiquette.json`: the 10 rules from TDD §19, each with `tag`, `severity` (1–3), `textEn`, `textId`. Wording is respectful and specific, not preachy (PRD §9).
- Note in `docs/DECISIONS.md` that etiquette text is pending local review (Q-04); the owner arranges the reviewer.

**Out of scope**
- Venues (T-018).

**Files**
- `apps/api/prisma/seed/data/{regencies,corridors,etiquette}.json`

**Acceptance criteria**
- [ ] Every file validates against its Zod schema (shared `PenaltyWindow`, new seed schemas).
- [ ] `temple-sarong` exists with severity 3 (required by the TEMPLE guardrail, TDD §6.5).
- [ ] Both languages are present for every rule; no machine-translation artefacts (owner reads the ID text).

**Verify**
- `pnpm --filter api seed:validate`

---

### T-018 · Venue dataset (40–60 DTW and MSME entities)
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D4
- **Depends on:** T-017
- **Spec:** TDD §19 (groups and counts), §5 (Venue), §9 (venue photos) · BRD §8.1.2 · PRD D-06, AC-12.2, Q-05 · Clarifications C-06, C-10
- **Goal:** A curated, verifiable venue list covering every preset origin and both rerouting radii.

**Scope**
- `venues.json` with groups from TDD §19:
  - 5 hotspot origins (`isHotspot: true`): Pura Lempuyang, Jl. Raya Ubud (`STREET_CORRIDOR`), Ubud Monkey Forest, Canggu Junction (`STREET_CORRIDOR`), Bypass Sanur (`STREET_CORRIDOR`).
  - 6–8 micro alternatives 1–3 km from a hotspot (`isBufferZone: true` where applicable).
  - 12–15 regional alternatives in RECIPIENT regencies (Sangeh is Badung Utara → `isBufferZone: true`, not RECIPIENT).
  - 25–30 MSMEs (culinary, coffee, craft), each within ≤ 3 km of at least one DTW alternative.
- Per venue: `slug`, `kind`, `category`, names and descriptions EN/ID, `regencyId`, `corridorId?`, `lat/lng` (verified on a map, 5 decimals), `openingHours` (WITA, 0 = Monday), `typicalPeakQueueMinutes` (Lempuyang 210), `avgDwellMinutes`, `priceLevel?`, `etiquetteTags`, `imageUrl`, `imageCredit`.
- Photos: reuse the photos already curated for the mock dataset in T-082; add the rest. Own photos or CC-BY/CC0 only (Q-05), converted to WebP ≤ 1024 px into `apps/web/public/venues/`; credit recorded per venue. No hot-linking.
- A coverage script `seed:coverage` that prints, for each hotspot, how many DTW lie 1–3 km away and how many MSMEs lie ≤ 3 km from each alternative — fails if any preset origin has < 2 micro or < 2 regional candidates.

**Out of scope**
- Vibe profiles and embeddings (T-027), forecasts (T-019).

**Files**
- `apps/api/prisma/seed/data/venues.json`, `apps/web/public/venues/*.webp`, `apps/api/prisma/seed/coverage.ts`

**Acceptance criteria**
- [ ] 40–60 venues; all validate; slugs unique; no `TODO`/placeholder text.
- [ ] Every `TEMPLE` venue has the `TEMPLE` etiquette tag; every `FOREST` with monkeys has `SACRED_FOREST`.
- [ ] `seed:coverage` passes for all 4 presets.
- [ ] Every image has a credit, and the source list is copied into `docs/DISCLOSURE.md` draft (T-074 finalizes).

**Verify**
- `pnpm --filter api seed:validate && pnpm --filter api seed:coverage`

---

### T-019 · Hourly forecast curves (7 × 24 per venue)
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-018
- **Spec:** TDD §5 (HourlyForecast), §8.2, §19 (curve patterns) · BRD §2.3, §7.1
- **Goal:** Believable relative busyness curves that encode the documented Bali patterns.

**Scope**
- `forecast-profiles.json`: a small set of named shape profiles (e.g. `temple-morning-peak`, `ubud-corridor-all-day`, `canggu-afternoon`, `sanur-commuter`, `quiet-village`, `coffee-midday`, `waterfall-late-morning`) as 24-value arrays, plus weekend multipliers.
- `forecasts.json`: per venue, a profile reference + optional per-day/hour overrides. A generator (`seed/build-forecasts.ts`) expands it into 168 rows per venue, clamped 0..100, values 0 when closed.
- Patterns that must hold (each is a test): Jl. Raya Ubud ≥ 75 between 10:00–21:00 on Saturday; Canggu peaks at 16:00; Lempuyang ≥ 75 in the early morning on weekends; at least 2 micro + 2 regional alternatives per preset are ≤ 35 at that preset's `defaultHour` and `simPeakHour`.
- Each profile carries a `_source` comment linking the BRD §2.3 observation it encodes.

**Out of scope**
- BestTime sync (T-029).

**Files**
- `apps/api/prisma/seed/data/{forecast-profiles,forecasts}.json`, `apps/api/prisma/seed/build-forecasts.ts` (+ tests)

**Acceptance criteria**
- [ ] Every active venue has exactly 168 forecast rows after build.
- [ ] Pattern tests above pass.

**Verify**
- `pnpm --filter api test -- build-forecasts`

---

### T-020 · Quick presets and preset images
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D4
- **Depends on:** T-018, T-019
- **Spec:** TDD §5 (Preset), §8.4 (virtual clock) · PRD AC-01.1, AC-02.2, AC-06.2 · BRD BR-01
- **Goal:** Four one-click demo scenarios that always produce a strong result.

**Scope**
- `presets.json`: `lempuyang`, `jl-raya-ubud`, `ubud-monkey-forest`, `canggu-junction`, with titles/subtitles EN/ID, `defaultDay/defaultHour` (a realistic busy moment), `simPeakDay/simPeakHour` (e.g. Saturday 13:00 for Ubud), `sortOrder`.
- Reference image per preset (already curated in T-082; reuse it), the viral shot the tourist would have seen, WebP ≤ 1024 px in `apps/web/public/presets/`, with credit.
- `imageSha256` is **not** hand-written: the seed (T-021) computes it from the sanitized bytes using `sanitizeImage()` from T-024, so the vibe cache key matches runtime uploads exactly.

**Out of scope**
- Cache warming (T-038).

**Files**
- `apps/api/prisma/seed/data/presets.json`, `apps/web/public/presets/*.webp`

**Acceptance criteria**
- [ ] 4 presets validate; each origin venue exists and `isHotspot: true`.
- [ ] Each preset image has a credit entry.

**Verify**
- `pnpm --filter api seed:validate`

---

### T-021 · Idempotent seed pipeline
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-017, T-018, T-019, T-020, T-024 (for `sanitizeImage()`)
- **Spec:** TDD §19 (pipeline), §18.4 · PRD AC-12.1
- **Goal:** `pnpm db:seed` loads or updates all reference data safely, any number of times.

**Scope**
- `seed/seed.ts`: validate all JSON with Zod → upsert in dependency order (regencies → corridors → etiquette → venues → forecasts → presets) inside transactions per entity group. Upsert by natural keys (`id` for reference data, `slug` for venues).
- Loads `vibes.json` if present (T-027 produces it) and writes `vibeProfile`/`vibeText`; embeddings are written by `scripts/embed-venues.ts` (T-027), not by the seed, so seeding never calls an external API.
- Preset `imageSha256` = sha256 of `sanitizeImage(readFile(presetImage))` (T-024).
- Venues missing from JSON are set `isActive = false`, never deleted.
- Summary output: counts inserted/updated/deactivated per table.

**Out of scope**
- Admin user creation (handled at login via `ADMIN_EMAILS`, T-056).

**Files**
- `apps/api/prisma/seed/seed.ts`, `apps/api/prisma/seed/schemas.ts`

**Acceptance criteria**
- [ ] Running the seed twice produces "0 inserted" on the second run and identical row counts.
- [ ] Seeding needs no network access (works with `OPENROUTER_API_KEY` empty).
- [ ] Integration test runs the seed against a Testcontainers Postgres.

**Verify**
- `pnpm db:reset && pnpm db:migrate && pnpm db:seed && pnpm db:seed`
