# MARGI AI Mock Service Worker (MSW) Layer

This directory provides the complete mock API, pipeline simulation, and database layer powering the frontend prototype (`pnpm dev:mock`).

## Mock Accounts

All accounts share the development password: `Password123`

| Email                   | Role    | Email Verified | Purpose                                                                  |
| :---------------------- | :------ | :------------- | :----------------------------------------------------------------------- |
| `demo@margi.test`       | `USER`  | `true`         | Verified user with saved trip history and full consumer privileges.      |
| `unverified@margi.test` | `USER`  | `false`        | Unverified user to test email verification banner and trip saving block. |
| `admin@margi.test`      | `ADMIN` | `true`         | System administrator with access to `/admin/*` operations and overrides. |

## Mock Data & Storage

- **Storage Engine:** Ephemeral `sessionStorage` (`margi_mock_db_state`) reset on browser tab closure or via the DevPanel "Reset Mock Storage" button.
- **Mock Mailbox:** Verification links (`/verify-email?token=...`) and password reset links (`/reset-password?token=...`) are captured in memory and listed with 1-click links in the DevPanel drawer.
- **Simulate Google Sign-in:** DevPanel button logs in `demo@margi.test` and routes to `/auth/callback?next=/app`.

## Supported Endpoints

### Public Endpoints (`/api/v1/*`)

- `GET /presets` · Returns 4 curated photo presets.
- `GET /origins` · Returns 5 tourist hotspot origins.
- `GET /venues/:slug` · Venue details by slug.
- `GET /venues/:id/forecast` · Hourly crowd curve.
- `GET /regencies` · Bali's 9 regencies.
- `GET /system/status` · Model and telemetry status.
- `POST /events` · CSRF-guarded analytics tracking.

### Explore (`/api/v1/explore/*`, `/api/v1/geo/*`) — D-025

- `GET /explore/nearby?lat&lng&radiusKm&vibes&at` · Places around the traveller, nearest first, with the crowd reading for the visit time.
- `GET /explore/places/:venueId?lat&lng&vibes&at` · Hourly curve, quiet hours, CFS, calmer alternatives, nearby MSMEs, etiquette.
- `GET /geo/areas` · 47 named start points (8 popular).
- `GET /geo/reverse?lat&lng` · Nearest named area and whether the point is inside Bali.
- Scenarios: `surge` lifts hotspots to 115 % (labelled Simulation), `simulate` labels readings as Simulation, `error_500` fails the nearby scan.

### Trip planner & copilot (`/api/v1/trips/*`, `/api/v1/copilot/*`) — D-026

Engine: `pipeline/trip.ts` (pure evaluation and suggestions) and `pipeline/copilot.ts` (intent rules and bilingual template prose). Numbers by code, words by template: every reply is `source: 'TEMPLATE'`.

- `POST /trips/evaluate` · `TripRequest` → `TripPlan`: legs (haversine × 1.35 road factor), corridor delays active at each leg's departure, crowd at each arrival, CFS, red zones and trip metrics. Unknown venue → `404 NOT_FOUND`.
- `POST /copilot/reply` · `CopilotRequest` → `CopilotReply` (intent, ≤ 3 short sentences, up to 3 pre-computed suggestions, quick replies, glass-box trace). Adds ~600 ms × latency so the typing indicator shows.
- `GET /explore/corridors` · Six gridlock corridors (Ubud, Canggu, Sanur bypass, Kuta–Legian, Tegallalang, Uluwatu) with WITA penalty windows.
- `GET /explore/search?q&lat&lng` · Up to 8 places (DTW and MSME) whose EN or ID name matches, nearest first, crowd read now.
- `GET /trips/plans` · `POST /trips/plans` (201, `SavedTripPlan` with `plan-<base36>` id) · `DELETE /trips/plans/:id` (204). Guest-first, stored in `sessionStorage` (`margi_mock_trip_plans`) with an in-memory fallback.
- All POST/DELETE require `X-Requested-With: margi-ai`; bodies failing the shared Zod schema return `400 VALIDATION_FAILED`.
- Scenarios: `surge` lifts hotspots to 115 % (Simulation), `simulate` labels readings as Simulation, `error_500` fails the copilot reply.

### Analysis Pipeline (`/api/v1/analyses/*`)

- `POST /analyses` · Multipart photo upload or JSON preset submission.
- `GET /analyses/:id/stream` · Server-Sent Events (SSE) streaming ThoughtStream transcript and progressive results.
- `GET /analyses/:id` · Stored result lookup (with private non-owner protection).
- `POST /analyses/:id/regenerate-narrative` · Bilingual re-synthesis with invariant metrics.

### Auth & Accounts (`/api/v1/auth/*`)

- `POST /auth/register` · Account creation with verification email issuance.
- `POST /auth/login` · Password authentication.
- `POST /auth/logout` · Session termination.
- `GET /auth/me` · Session check (returns 401 when unauthenticated).
- `POST /auth/refresh` · Silent token rotation.
- `POST /auth/verify-email` · Email token consumption.
- `POST /auth/resend-verification` · Rate-limited email re-dispatch.
- `POST /auth/forgot-password` · Enumeration-safe reset email generation.
- `POST /auth/reset-password` · Password modification via single-use token.

### User History & Trips (`/api/v1/me/*`)

- `GET /me/analyses` · Analysis history with pagination.
- `GET /me/analyses/:id` · Analysis inspection.
- `DELETE /me/analyses/:id` · Remove individual analysis.
- `DELETE /me/analyses` · Bulk deletion of user analyses.
- `GET /me/analyses/:id/image` · Private image serving.
- `POST /me/analyses/:id/claim` · Session claim linking guest analysis to account.
- `GET /me/trips` · Saved trips list.
- `POST /me/trips` · Save trip (requires verified email).
- `GET /me/trips/:id` · Trip details.
- `PATCH /me/trips/:id` · Edit trip title or notes.
- `DELETE /me/trips/:id` · Delete trip.
- `PATCH /me/profile` · Update profile name or preferred locale.

### Administration (`/api/v1/admin/*` — requires `ADMIN` role)

- `GET /admin/venues` · Venue catalog table with search & regency filters.
- `POST /admin/venues` · Create destination / MSME venue.
- `GET/PATCH/DELETE /admin/venues/:id` · Venue management.
- `POST /admin/venues/:id/vibe/generate` · AI vibe extraction preview without persistence.
- `POST /admin/venues/:id/embed` · Save vibe profile and re-index vector.
- `POST /admin/venues/re-embed-all` · Async batch vector re-indexing job.
- `GET /admin/jobs/:id` · Job progress polling.
- `GET/PUT /admin/venues/:id/forecast` · 7x24 crowd curve editing.
- `POST /admin/venues/:id/forecast/import-csv` · Transactional CSV import.
- `POST /admin/venues/:id/forecast/sync-besttime` · Returns `409 BESTTIME_DISABLED`.
- `CRUD /admin/presets`, `/admin/etiquette-rules`, `/admin/corridors`.
- `GET /admin/stats` · Operational analytics fixture.
