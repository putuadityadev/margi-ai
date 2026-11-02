# Phase 08 — Admin

Goal of the phase: a curator can add an MSME, generate and review its vibe, embed it, and edit
its crowd curve without touching code (PRD Flow D, F-12). Function over polish: if time is
short, T-065 is cut and T-064 stays (cut-line #1).

Execution is split: the **admin UI (T-064, T-065)** is built in the Frontend prototype stage
against the T-084 mocks; the **admin API (T-062, T-063)** is built in the Backend stage.

Every admin endpoint: `JwtAuthGuard` + `RolesGuard('ADMIN')`, Zod-validated bodies from
`packages/shared/schemas/admin.ts`, audit log line (`adminUserId`, action, entity id).
The admin web bundle is a separate lazy chunk and must not grow the public bundle.

---

### T-062 · Admin API: venues, vibe generation, embeddings, reference data
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D6
- **Depends on:** T-056, T-031, T-025, T-024
- **Spec:** TDD §10.5, §9 (venue photos) · PRD F-12 (AC-12.1–AC-12.3, AC-12.5), Flow D
- **Goal:** Full CRUD and the "Generate → review → Save & Embed" loop for venues.

**Scope**
- `GET/POST /admin/venues`, `GET/PATCH/DELETE /admin/venues/:id` (DELETE = soft delete, `isActive = false`). Fields per PRD AC-12.2; photo upload goes through `sanitizeImage` into the `public-venues` bucket.
- `POST /admin/venues/:id/vibe/generate`: runs the Agent 1 vision step on the venue photo, returns the profile **without saving**.
- `POST /admin/venues/:id/embed`: saves the (possibly edited) profile, canonicalizes, embeds, writes the vector.
- `POST /admin/venues/re-embed-all`: background job (in-process, single instance) with progress in Redis; `GET /admin/jobs/:id` returns `{ status, done, total, errors[] }`.
- CRUD for `/admin/presets`, `/admin/etiquette-rules`, `/admin/corridors` (penalty windows validated by the shared schema). Preset save recomputes `imageSha256` with `sanitizeImage`.
- Invalidate affected caches (`telemetry:forecast:*`, LKG for presets whose origin changed).

**Out of scope**
- Forecast editing (T-063).

**Files**
- `apps/api/src/admin/**`

**Acceptance criteria**
- [ ] e2e: non-admin gets 403 on every admin route; admin can create an MSME, generate, edit, embed, and the venue appears in a subsequent analysis's candidates (mock mode).
- [ ] Re-embed-all reports progress and survives one failing venue (error listed, others continue).

**Verify**
- `LLM_MOCK=true pnpm --filter api test:e2e -- admin`

---

### T-063 · Admin API: forecasts, BestTime sync, stats
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6
- **Depends on:** T-062, T-029
- **Spec:** TDD §10.5 (forecast rows, stats), §16 (admin stats) · PRD AC-12.4, AC-12.6
- **Goal:** Curators can maintain crowd curves; the owner can see how the system behaves.

**Scope**
- `GET/PUT /admin/venues/:id/forecast` (full 7 × 24 matrix, validated 0..100), `POST /admin/venues/:id/forecast/import-csv` (header `day,hour,busyness`; reports row errors), `POST /admin/venues/:id/forecast/sync-besttime` (409 `BESTTIME_DISABLED` without key).
- `GET /admin/stats?from&to`: analyses per day, p50/p95 `durationMs`, tier distribution, LLM fallback ratio (from `modelsUsed`/trace), replay count, top recommended venues, navigate clicks by kind — computed with SQL aggregates, not in memory.

**Out of scope**
- Charts (T-065).

**Files**
- `apps/api/src/admin/{forecast,stats}/**`

**Acceptance criteria**
- [ ] CSV import with one bad row imports nothing and returns the row number (transactional).
- [ ] Stats query runs < 300 ms on 10k synthetic analyses (seeded in the test).

**Verify**
- `pnpm --filter api test:e2e -- admin-forecast admin-stats`

---

### T-064 · Admin UI: venues, vibe review, forecast editor
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D3
- **Depends on:** T-059, T-084 (real admin API arrives with T-062, T-063; switched in T-086)
- **Spec:** PRD §5 (`/admin/venues`, `/admin/forecast`), Flow D, AC-12.2–AC-12.4 · TDD §13.1 (lazy admin chunk)
- **Goal:** The Flow D loop works in the browser.

**Scope**
- `AdminLayout` (lazy chunk, `RequireRole('ADMIN')`), simple side navigation.
- `/admin/venues`: table with search and kind/regency filters; create/edit form (React Hook Form + shared schema) with a map picker (reuses the Leaflet chunk), opening-hours editor, EN/ID fields, photo upload.
- Vibe panel: `Generate Vibe Profile` → editable 5 dimensions (label, descriptors, intensity) → `Save & Re-embed`; `Re-embed all` with progress polling.
- `/admin/forecast`: venue picker + editable 7 × 24 heatmap (keyboard-editable cells), CSV import, `Sync from BestTime` (disabled with tooltip if live telemetry is off).

**Out of scope**
- Visual polish beyond the UI kit.

**Files**
- `apps/web/src/features/admin/{venues,forecast}/**`, `apps/web/src/pages/admin/**`

**Acceptance criteria**
- [ ] Flow D completes in `pnpm dev:mock`; the real-model run is checked in T-086.
- [ ] The public route bundle size is unchanged by this task (compare build manifests).

**Verify**
- Manual Flow D; `pnpm --filter web build`

---

### T-065 · Admin UI: presets, etiquette, corridors, stats
- **Status:** todo · **Priority:** P0* (cut-line #1) · **Size:** M · **Day:** D3
- **Depends on:** T-064
- **Spec:** PRD AC-12.5, AC-12.6, §5 (`/admin/presets`, `/admin/etiquette`, `/admin/corridors`, `/admin/stats`)
- **Goal:** Remaining admin screens, kept deliberately simple.

**Scope**
- Table + form screens for presets, etiquette rules (EN/ID text, severity, tag), corridors (centre on map, radius, penalty windows editor, typical delay).
- `/admin/stats`: KPI tiles and small charts (Recharts, already lazy) for the T-063 aggregates; telemetry status.

**Out of scope**
- Export features.

**Files**
- `apps/web/src/features/admin/{presets,etiquette,corridors,stats}/**`

**Acceptance criteria**
- [ ] Each screen supports create, edit, and deactivate/delete with confirmation.
- [ ] If cut, the task is marked `cut` and the API remains reachable for manual use.

**Verify**
- Manual check of each screen.
