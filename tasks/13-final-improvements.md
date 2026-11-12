# 13 · Final-round improvements from user testing (Tahap 2)

User testing on 2026-11-12 (questionnaire export: `docs/Evaluasi Penggunaan MARGI AI (Jawaban).xlsx`)
gave 15 responses. **Five were submitted independently** (U1-U5, numbered by submission time; testers agreed to be quoted without their names); the
other ten arrived one second apart (23:38:49–23:39:00) and are not used as evidence. Every task below
traces to an independent tester's finding. The owner approved this scope on 2026-11-13.

| Tester | Finding (their words, shortened) | Task |
| :--- | :--- | :--- |
| U5 | "Pengaturan jadwal perlu penyesuaian karena pertama kali"; wants "user guide sederhana saat pertama kali masuk" | T-101, T-102 |
| U1 | "Menu pilihan untuk jam keramaian di maps dibuat lebih fleksibel" | T-102 |
| U3 | "Perencanaan bisa di-export atau dihubungkan dengan Google Calendar" | T-103 |
| U4 | Asked for "daerah kos sekitar Renon", was sent to the first beach recommendation | T-104 |
| All five | Their real Chat and Copilot messages | T-104 (regression cases) |
| U1 | "Rekomendasi tempat makan yang saya lewati belum bisa diberikan dengan baik" | T-105 |
| Owner | Travellers also look for basic places (kos, hotel, ATM, apotek) | T-106 (optional, last) |

Execution order: **T-104 → T-101 → T-102 → T-103 → T-105 → T-106 → T-107**. T-104 runs first because
it sets the "before" numbers. T-106 is cut if time runs out; nothing else depends on it.

**Not selected by the owner (stay out of scope):**
- Switching to the Rencana tab and highlighting changes after "Terapkan".
- Defaulting Explore to tomorrow 08:00 at night (T-102's free time picker covers the need).
- Shortcuts to saved plans, renaming plans, share links.
- Sending the traveller's GPS position to Chat.
- PWA, real-time crowd reports, ticket prices (no data source; would break the no-dummy-data rule).

These go into the "rencana pengembangan" part of the Tahap 1→2 improvement notes.

---

### T-101 · First-use guided tour per screen
- **Status:** done (manual check by the owner pending) · **Priority:** P0 · **Size:** M · **Day:** final
- **Depends on:** —
- **Spec:** PRD §6.0 (onboarding) · this file (U5)
- **Goal:** A first-time user is shown, on the real UI, which control does what on Explore, place
  detail, Rencana and Chat, and can replay it any time.

**Scope**
- Library: `driver.js` (MIT, about 5 KB gzip, framework-free so it works with React 19). Reason for
  the dependency: highlight, scroll-into-view, keyboard and focus handling are not worth rebuilding.
  Not shepherd.js (AGPL) and not react-joyride (React 19 support not stable).
- Elements are targeted with `data-tour="<id>"` attributes, never with CSS classes.
- Four short tours, each started the first time its screen opens:
  - **Explore** (after the intro slides end, the user is asked "Mulai tur singkat (1 menit)" or
    "Lewati"; "Lewati" marks every tour as offered, so none starts on its own later):
    1. mood filter, 2. visit time, 3. crowd percentage on a card ("persentase keramaian
    prakiraan saat kamu tiba"), 4. tap a place for detail, 5. **Rencanakan perjalanan** / assist button.
  - **Place detail** (first detail opened): hourly crowd chart and quietest hours, calmer places
    with a similar mood, "Perlu tahu" etiquette and local businesses (UMKM), add to plan.
  - **Rencana**: 1. departure day and time, 2. departure chart ("klik batang terendah untuk
    berangkat saat paling sepi"), 3. timeline (arrival time, crowd, reorder, remove),
    4. **Tambah tujuan** (search, or *Tandai di peta* for a kos or campus), 5. **Tanya MARGI** tab
    (type freely, then press **Terapkan** on the suggestion card; nothing changes until then),
    6. **Simpan rencana**.
  - **Chat**: 1. ask anything about places, 2. place cards and adding them to a plan, 3. the
    difference from Tanya MARGI (Chat answers questions; Tanya MARGI edits the open plan).
- A **Panduan** button (question-mark icon, labelled for screen readers) in the top bar of every
  screen replays that screen's tour.
- Steps whose element is not on screen (layout differs between phone and desktop) are skipped,
  never shown floating over nothing.
- "Already shown" flags live in `localStorage`, wrapped in try/catch like `exploreStore`; blocked
  storage only means the tour is offered again.
- All copy in `locales/{id,en}/tour.json`. Reduced motion: no animated transitions.
- Style the popover with the design tokens (border ink, no shadow, one lime button).

**Out of scope**
- A tour that spans several routes in one run.
- Server-side tracking of tour completion.

**Files**
- `apps/web/package.json` (driver.js)
- `apps/web/src/features/tour/` (`tours.ts` step definitions, `useTour.ts`, `TourButton.tsx`)
- `data-tour` attributes in `BrowsePanel.tsx`, `PlaceDetailPanel.tsx`, `TripPlanPanel.tsx`,
  `TripPage.tsx`, `ChatPage.tsx`, `IntroOnboarding.tsx` (start prompt)
- `apps/web/src/locales/{id,en}/tour.json`

**Acceptance criteria**
- [x] A fresh browser (cleared storage) is offered the tour after the intro; "Lewati" never shows a
  tour again until the Panduan button is pressed. (Offer appears right after the intro slides, on the start-point screen; unit test and browser run.)
- [x] Each tour runs on a 390 px phone and on desktop without a step pointing at a hidden element.
  (Playwright screenshots of Explore, place, planner and Chat tours at 390x844 and 1366x800.)
- [ ] The Panduan button replays the tour of the current screen.
- [ ] Keyboard: Esc closes, arrow keys move, focus returns to the page after closing.
- [x] All tour text exists in Indonesian and English.

**Verify**
- Testing Library: a tour starts on first visit and not on the second; Panduan replays it.
- Manual run on a phone-sized viewport and desktop on production after deploy.

---

### T-102 · Free choice of visit and departure time
- **Status:** done (manual check by the owner pending) · **Priority:** P0 · **Size:** S · **Day:** final
- **Depends on:** —
- **Spec:** PRD F-17 · this file (U1, U5)
- **Goal:** Explore and Rencana let the user pick any day and hour instead of fixed presets or
  15-minute steps only.

**Scope**
- Explore: the visit-time select (`now`, `2 jam lagi`, `Pukul 08.00`) gains **Pilih waktu…**, which
  opens a small sheet with day (today or tomorrow, matching the trip planner) and hour (hourly
  slots 05:00–22:00 WITA). The chosen time is sent as the existing `at` parameter; the select shows
  it, e.g. "Besok 16.00".
- Rencana: a native `<input type="time">` next to the ±15 minute buttons sets the departure time
  directly (rounded to 15 minutes so it matches the departure chart slots).
- All time conversion goes through `packages/shared/time` (WITA).

**As built (D-037):** the hours are listed in the same visit-time select (no separate sheet), and the
planner's clock opens a select of 15-minute slots, because `<input type="time">` follows the browser
locale (12-hour, truncated on a 390 px phone).

**Out of scope**
- Dates beyond tomorrow (forecasts and the planner cover today and tomorrow only).
- Changing the departure chart.

**Files**
- `apps/web/src/features/explore/BrowsePanel.tsx`, the explore store or page that maps the visit
  window to `at`
- `apps/web/src/features/trip/TripPlanPanel.tsx` (`DepartureControl`)
- `apps/web/src/locales/{id,en}/{explore,trip}.json`

**Acceptance criteria**
- [ ] Picking "Besok 16.00" in Explore reloads the places with the forecast for that hour.
- [x] Typing 07:40 in Rencana sets departure 07:45 and the timeline and chart follow. (`atClock` test;
  07:45 picked in the browser moved the timeline.)
- [ ] Existing presets still work.

**Verify**
- Unit test for the hour-to-`at` mapping across midnight (WITA).
- Testing Library: the time input changes the departure.

---

### T-103 · Add the plan to a calendar (.ics)
- **Status:** done (import into Google Calendar not yet checked) · **Priority:** P1 · **Size:** S · **Day:** final
- **Depends on:** —
- **Spec:** this file (U3)
- **Goal:** A planned or saved trip can be downloaded as an `.ics` file that Google Calendar, iOS and
  Android calendars import.

**Scope**
- Pure function `planToIcs(plan)` in the web app: one event per stop, starting at the stop's
  computed arrival time and lasting its visit minutes; title = place name; description = expected
  crowd on arrival and the travel time from the previous stop (numbers from the plan, never from
  the LLM); location = place name with `GEO:` coordinates. Times written in UTC (`Z`) so no
  timezone database is needed. RFC 5545 line folding and escaping.
- Button **Tambah ke kalender** on the trip page and on a saved plan; downloads via a Blob.

**Out of scope**
- Google Calendar API or OAuth; reminders; recurring events.

**Files**
- `apps/web/src/features/trip/planToIcs.ts` (+ test), trip page and saved plan view, locales.

**Acceptance criteria**
- [ ] The file imports into Google Calendar with one event per stop at the right WITA times.
- [x] Names with commas, semicolons and newlines are escaped.

**Verify**
- Unit test against a fixed plan (fixed clock).
- Manual import into Google Calendar.

---

### T-104 · Assistant handles the testers' real messages (incl. U4's bug)
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** final
- **Depends on:** —
- **Spec:** D-035 · D-036 · this file
- **Goal:** Every Chat and Copilot message the five independent testers wrote gets a correct,
  sourced, finished answer, and the eval proves it with before and after numbers.

**Scope**
- Add, as `apps/api/scripts/eval-testers.ts` (Chat and Copilot), the testers' messages:
  - Chat: "Tempat makan nasi babi guling dengan biew yang bagus" · "Beritahu saya pantai di
    denpasar" · "Saya ingin mengetahui dimana lokasi dengan sunset terbaik hari ini" · "pingin ke
    bedugul hari minggu nih, saran enaknya ke wisata apa aja yah" · a question about how the crowd
    level is calculated (must say it is a forecast, not live) · an out-of-scope question (must
    decline politely and steer back).
  - Copilot: "Saya mau ganti tempat deh, mau nyari babi guling yang dekat dengan daerah pantai" ·
    "rute terbaik ke pantai sanur" · "buat rencana" · "ubah rencana ke bedugul mau ke pura dulu
    habis itu ngopi baru ke botania" · "daerah kos sekitar renon" (U4) · "geser jam
    keberangkatan ke jam yang paling sepi" · "Danau Batur Kedisan".
- Run the eval on production **before** any change and record the result in this task.
- Reproduce U4's case, find the cause (area query for a non-tourist place falling back to the
  first recommendation) and fix it: an area plus a kind of lodging is either searched as a place
  near that area or answered honestly, never replaced by an unrelated recommendation.
- Fix the other failures with prompt rules or tool behaviour, smallest change first; no hard-coded
  answers.
- Run the eval again and record the "after" result; add a `docs/DECISIONS.md` entry if behaviour
  changes.

**Out of scope**
- Basic-needs search for kos, hotel, ATM (T-106).
- Model change.

**Files**
- `apps/api/scripts/eval-copilot.ts`, `apps/api/src/copilot/*`, `apps/api/src/places/*`, specs.

**Acceptance criteria**
- [x] Eval before and after recorded here (pass count, median and max latency).
  - Before (production, 2026-11-13 00:30): 9/13, median 4.2 s, max 13.8 s.
  - After (local, same messages plus two along-route cases): 14/15 to 15/15 across runs, median
    5-7 s, max 12-18 s. Unstable: U4's "ubah rencana ke bedugul ... ngopi ... botania" (about 3 in 5).
  - Regression eval (17 cases): production 16/17, local 15-17/17 depending on the run.
  - Production after the deploy of 2026-11-13 (same messages): testers 14/15 (median 5.3 s,
    max 18.6 s; the miss was U4's Sunday question answered for today), regression 16/17.
- [x] U4's message no longer returns an unrelated beach.
- [ ] All tester cases pass; the 17 earlier cases still pass. (Not reliably: see the variance above.)
- [x] OpenRouter spend for eval runs stays within the $1.5 test budget.

**Verify**
- `API_URL=https://margi.web.id/api/v1 npx tsx scripts/eval-copilot.ts` (before and after deploy).
- `pnpm lint && pnpm typecheck && pnpm test`.

---

### T-105 · Places to eat along the route
- **Status:** done (Terapkan in the browser not yet checked) · **Priority:** P1 · **Size:** M · **Day:** final
- **Depends on:** T-104
- **Spec:** D-035 · this file (U1)
- **Goal:** "Ada tempat makan yang searah?" returns local eateries close to the route between two
  stops, with the extra minutes each detour costs, and Copilot can insert one between those stops.

**Scope**
- Pure function in `packages/shared` (tested): distance from a point to a leg (straight segment
  between two stops, local equirectangular projection) and detour estimate in minutes using the
  same speed model as the trip legs.
- Copilot tool `places_along_route { afterStopIndex?, kind: 'food' }`: candidates from curated
  local businesses first (crowd profile available), then TomTom category search sampled along the
  leg as in D-035; keep places within a corridor of the leg; return name, id, detour minutes,
  crowd when known. Numbers come from the function, never the model.
- `change_trip` accepts inserting a place **between** stops (existing reorder path), so "mampir
  makan di jalan" ends between the right stops.
- Chat's `nearby_places` is unchanged.

**Out of scope**
- Real road routing for the detour (uses the existing travel model; T-081 remains v2).
- Non-food categories (T-106).

**Files**
- `packages/shared/src/scoring/` or `geo/` (corridor and detour function + tests)
- `apps/api/src/copilot/copilot.tools.ts`, `copilot.service.ts` (prompt rule), eval cases.

**Acceptance criteria**
- [ ] On the Mertasari trip, "mampir makan babi guling yang searah" proposes a warung between the
  right stops with a detour in minutes, and Terapkan inserts it there.
- [x] No candidate farther than the corridor; when none exist the answer says so.
- [x] Shared function at 100% line and branch coverage.

**Verify**
- Unit tests; two new eval cases; manual check on production.

---

### T-106 · Basic traveller needs near a place (optional)
- **Status:** todo (deferred: owner marked it last and optional) · **Priority:** P2 · **Size:** S · **Day:** final · **cut first if time runs out**
- **Depends on:** T-104, T-105
- **Spec:** D-035 · owner request 2026-11-13
- **Goal:** "kos dekat Renon", "hotel dekat Ubud", "ATM terdekat dari stop 2" list real nearby
  places from TomTom category search with their distance, and one can be added as a stop.

**Scope**
- Extend the D-035 `addFood` category path with a small fixed category map (lodging, ATM,
  pharmacy, fuel). Results are listed, never auto-added; added ones are saved as `OTHER` / `PENDING`
  as in D-035.

**Out of scope**
- Prices, availability, bookings, reviews.

**Acceptance criteria**
- [ ] "kos dekat Renon" lists real lodgings near Renon with distances, or says none was found.

**Verify**
- One eval case; manual check.

---

### T-107 · Release `v2.0-final`
- **Status:** done (production deploy and tag 2026-11-13; proposal and improvement notes are
  updated outside the repository) · **Priority:** P0 · **Size:** S · **Day:** final
- **Depends on:** T-101 – T-105 (T-106 if done)
- **Goal:** Production, tag, and every submission document point at the same commit.

**Scope**
- `pnpm lint && pnpm typecheck && pnpm test`; `./deploy/backup.sh`; pull, build, up; smoke test.
- Annotated tag `v2.0-final`, pushed.
- Tahap 1→2 improvement notes: each item as tester finding → change → measured result, with
  honest sample size (n = 5) and the SUS scale caveat (reversed scale; two testers likely misread it).
- Update the disclosure and proposal hash where required; check the deliverable files' mtime
  before overwriting (owner edits them in Word).

**Acceptance criteria**
- [x] `https://margi.web.id` serves the tagged commit (`GIT_COMMIT` in the health response).
- [ ] Notes and documents cite the same hash.
