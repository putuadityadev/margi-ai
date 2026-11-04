# 12 · Map-first prototype and real-data integration (D-025, D-026, D-027)

The approved prototype (owner sign-off 2026-11-03) moved the product's main entry to a map:
explore → place detail → in-app trip planner → MARGI Copilot. This file records the prototype
work that is already done and plans the backend and data work that makes every screen run on
real data with **no mocks**. Provider choices, quotas, and fallbacks live in
[`docs/DATA-SOURCES.md`](../docs/DATA-SOURCES.md); contracts live in
`packages/shared/src/schemas/{explore,trip}.ts` and are executable through the MSW mocks in
`apps/web/src/mocks/handlers/{explore,trip}.ts`. **The mock is the spec**: a real endpoint is
done when the web app works unchanged after its mock domain is switched off.

---

## Done (prototype, stage 3)

### T-087 · Explore map prototype (D-025)
- **Status:** done · **Priority:** P0 · **Size:** L · **Day:** D3
- **Spec:** PRD §5, §6.0, F-17 · BRD BR-11 · TDD §10.7
- Landing, onboarding, GPS/manual start point with drag-to-correct centre pin, mood filter, radar
  scan, browse carousel, place detail with hourly crowd, quiet hours, calmer alternatives, MSMEs,
  etiquette. Shared explore contract and MSW mocks; 121 places, 47 areas.

### T-088 · Trip planner and MARGI Copilot prototype (D-026)
- **Status:** done · **Priority:** P0 · **Size:** L · **Day:** D3
- **Spec:** PRD §6.0, §6.5, F-18 – F-20 · BRD BR-12, BR-13 · TDD §6.8, §10.8
- Itinerary, corridor delays, trip score, route drawing and playback, copilot chat with typed
  suggestion cards, three situations, saved plans, shared trip contract and mock engine.

### T-089 · UX polish round
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D3
- MARGI avatar, staged thinking view, proactive insight, undo, impact summary, departure chart
  (`POST /trips/departures`), draggable sheets, pin clustering, 44 px touch targets.

---

## To do (stage 4 backend, stage 5 integration)

### T-090 · Shared engine package
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-015
- **Spec:** TDD §1.3 (numbers by code), §7
- **Goal:** The crowd curve, nearby search, alternatives ranking, trip evaluation, departure scan,
  and suggestion strategies run from one implementation used by both the API and the mocks.

**Scope**
- Move the pure parts of `apps/web/src/mocks/pipeline/{explore,trip,departures}.ts` into
  `packages/shared/src/engine/`, taking places, corridors, regencies, telemetry, and a
  `legTimer(from, to, departAt)` as parameters instead of importing mock data.
- Mocks keep working by passing their data in; their tests move with the engine.

**Acceptance**
- [ ] `pnpm test` green; engine coverage ≥ 90 % lines.
- [ ] No file under `packages/shared` imports from `apps/`.

### T-091 · Database schema and seed for the explore flow
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-006, T-017
- **Spec:** TDD §5 (D-025/D-026 additions)
- **Goal:** Postgres holds every place, area, and corridor the prototype uses.
- **Note:** supersedes the dataset part of T-018 (121 places replace the planned 40–60); T-021
  seeds the JSON files this task exports.

**Scope**
- Prisma: `Area`, `TripPlan`; `Venue` gets `vibeTags`, crowd baseline fields, `externalRefs`,
  `imageLicense`, `imageSourceUrl`; `Corridor` gets bilingual names, `typicalDelayMinutes`, `path`.
- Export the mock datasets (places, areas, corridors) to JSON seed files and seed idempotently.
- Fix the Tanah Lot photo (currently shows Ulun Danu Beratan) and every other mismatched image.

**Acceptance**
- [ ] `pnpm db:seed` twice in a row leaves identical row counts (121 venues, 47 areas, 6 corridors).
- [ ] Every venue image has a license and a source URL.

### T-092 · Place enrichment from the places provider
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-091
- **Spec:** `docs/DATA-SOURCES.md` §Places, §Photos
- **Goal:** Coordinates, opening hours, and photos come from a real source and are re-checkable.

**Scope**
- Sources (D-027): Overpass/OSM import (`amenity=cafe|restaurant`, `tourism=attraction`, `craft=*`,
  `shop=craft|art`, `opening_hours`, `wikidata`, `wikimedia_commons`) and the FSQ OS Places dump into
  Postgres with a `source` column; Geoapify `/v2/places` + `/v2/place-details` for enrichment;
  Wikimedia Commons geosearch for photos (store `Artist`, `LicenseShortName`, `LicenseUrl`).
- Admin script `pnpm data:enrich-places`: match each venue to the provider by name + coordinates,
  store the provider id, verify the coordinate (flag > 300 m drift), import opening hours, and pick
  a photo with an allowed license (attribution stored).
- Respect the provider's caching terms (store ids; refresh other fields within the allowed TTL).
- Admin review list for flagged matches.

**Acceptance**
- [ ] The ~40 low-confidence coordinates listed in the dataset report are verified or corrected.
- [ ] Re-running the script is idempotent and stays within the free quota.

### T-093 · Crowd data ingestion and labelling
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D5
- **Depends on:** T-028, T-091
- **Spec:** BRD BR-05, BR-14 · TDD §8 · `docs/DATA-SOURCES.md` §Crowd
- **Goal:** Hourly forecasts for hotspots come from the chosen crowd provider; the rest use
  baseline curves; every reading carries an honest tier label.

**Scope**
- MARGI crowd model for every venue: category × weekday × hour curve with multipliers from
  API Hari Libur (holidays, cuti bersama), `balinese-date-js` (Galungan, Kuningan, Purnama,
  Tilem, Nyepi), BPS monthly arrivals (season), and BMKG weather (rain dampens outdoor venues).
- Weekly job pulls BestTime forecasts for hotspots and their nearest alternatives within the free quota;
  `HourlyForecast.source` records the provider.
- Live busyness (if the provider offers it) only for venues the user opens, cached 15 minutes.
- Baseline curve for venues without provider data, labelled `FORECAST` with source `CURATED`.

**Acceptance**
- [ ] The UI never shows `LIVE` unless the value came from a live call in the last 15 minutes.

### T-094 · Routing and traffic service
- **Status:** in-progress · **Priority:** P0 · **Size:** M · **Day:** D5
- **Depends on:** T-090
- **Spec:** TDD §4 `RoutingModule` · `docs/DATA-SOURCES.md` §Routing
- **Goal:** Leg distance, duration, traffic-aware duration, and road geometry come from the
  routing provider chain, replacing the straight-line × winding-factor estimate.
- **Progress:** Routing service (TomTom, ORS, TTL cache) is wired into trip evaluation and verified against real TomTom (route, historic delay, road geometry). Failures return 503 (D-029). Corridor flow polling is not built.

**Scope**
- Providers (D-027): TomTom Calculate Route (`traffic=true`, `computeTravelTimeFor=all`,
  `routeRepresentation=encodedPolyline`) → ORS `driving-car` → self-hosted OSRM → estimate.
- `CorridorPoller` cron every 30 min: TomTom Traffic Flow Segment Data per corridor point
  (`currentSpeed / freeFlowSpeed`); store per hour-of-week to build our own jam history.
- `RoutingService.leg()` with provider chain (traffic-aware → no-traffic → haversine estimate),
  timeouts, and Redis cache keyed by rounded coordinates + 15-minute departure bucket.
- Corridor delay = traffic duration − free-flow duration when the provider gives traffic;
  otherwise the curated `typicalDelayMinutes` inside the penalty window.
- Return the polyline so the map draws the real road instead of an arc.

**Acceptance**
- [ ] With every provider key removed, trips still evaluate (estimate tier) and say so in the trace.

### T-095 · Explore and Geo API
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D5
- **Depends on:** T-090, T-091, T-093
- **Spec:** TDD §10.7
- **Goal:** `/explore/*` and `/geo/*` return the shared contract from Postgres + engine.
- **Progress:** `/explore/*` and `/geo/*` served from the catalogue JSON through the shared engine; verified against the web app in a real browser.

**Acceptance**
- [ ] Explore page tests pass against the API with the `explore` mock domain disabled.

### T-096 · Vibe embeddings for places
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D5
- **Depends on:** T-025, T-026, T-091
- **Spec:** TDD §7.3 · BRD §7.3
- **Goal:** "Same mood" alternatives rank by embedding similarity (pgvector), with tag overlap
  only as the fallback when an embedding is missing.

**Acceptance**
- [ ] Every active venue has an embedding; alternatives cite `similarity` from cosine in the trace.

### T-097 · Trips API and saved plans
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D5
- **Depends on:** T-090, T-094
- **Spec:** TDD §10.8
- **Goal:** `/trips/evaluate`, `/trips/departures`, and `/trips/plans` run on real routing and
  crowd data; plans belong to the guest session or user.
- **Progress:** `/trips/evaluate`, `/trips/departures`, `/trips/plans` on the API with guest-session ownership; plans persisted in Postgres with origin rounded to ~1 km.

**Acceptance**
- [ ] Trip page tests pass with the `trip` mock domain disabled; a plan saved as guest is listed
      only for that session.

### T-098 · Copilot agent with tool calling
- **Status:** in-progress · **Priority:** P0 · **Size:** L · **Day:** D6
- **Depends on:** T-022, T-023, T-097
- **Spec:** TDD §6.8 · BRD BR-13
- **Goal:** `/copilot/reply` uses the LLM to understand free text, call the trip tools, and
  narrate; numbers are validated against tool output; template fallback on any failure.
- **Progress:** Copilot service with tool calling and a number-validated narrative is verified live on OpenRouter (DeepSeek v4.1 Flash, 1.7 - 3.6 s; ID and EN; off-topic and injection refused). No template fallback: failures return 503 (D-029). The 30-prompt evaluation set is not written.

**Scope**
- Tool schemas generated from the shared Zod schemas (`z.toJSONSchema`).
- Number validator on the narrative; `source: 'LLM' | 'TEMPLATE'` set honestly.
- Prompt and tool-call trace logged without user text beyond 200 characters.

**Acceptance**
- [ ] With the LLM key removed, every copilot request still answers (template) within 2 s.
- [ ] A 30-prompt ID/EN evaluation set (stuck in traffic, best time, quieter, food, sunset,
      constraints like "bawa anak, balik jam 5") passes ≥ 90 % on intent and tool choice.

### T-099 · Production map tiles and attribution
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D6
- **Spec:** `docs/DATA-SOURCES.md` §Tiles
- **Goal:** The deployed app uses OpenFreeMap vector tiles through `maplibre-gl-leaflet`
  (`VITE_MAP_STYLE_URL`), styled to the parchment palette, with a self-hosted Bali PMTiles
  fallback and the "© OpenMapTiles © OpenStreetMap contributors" attribution shown (D-027).

### T-100 · Switch explore, geo, and trip domains off mocks
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D6
- **Depends on:** T-095, T-097, T-098, T-099
- **Spec:** Clarification C-20 · extends T-086
- **Goal:** `VITE_API_MOCKS` no longer lists `explore` or `trip`; Flows 6.0 and 6.5 pass on the
  deployed API at random hours, including night (visit time "08:00 next").
