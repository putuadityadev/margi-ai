# Phase 07 — Authentication, History, and Trips

Goal of the phase: optional accounts that unlock saving trips, history with private photos,
and admin access — without ever blocking the guest flow (PRD D-01, BRD §8.2.2).

Execution is split (see `tasks/README.md` → Execution order):
- **Web tasks T-059 and T-061** run in the Frontend prototype stage against the T-084 mocks.
- **API tasks T-055 – T-058 and T-060** run in the Backend stage, only after the real guest pipeline
  (Phase 04) works end-to-end.

Security baseline for every task here (TDD §11, §14): cookies `httpOnly; Secure; SameSite=Lax`,
CSRF header on non-GET, constant-time comparisons for tokens, hashed tokens at rest, generic
responses that do not reveal whether an email exists, all `/me/*` queries filtered by `userId`.

---

### T-055 · Mail module (Resend in production, Mailpit in dev)
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D6
- **Depends on:** T-005
- **Spec:** TDD §4 (MailModule), §11 (Email row) · PRD AC-10.1, AC-10.4 · Clarification C-14
- **Goal:** Send bilingual verification and reset emails through a swappable transport.

**Scope**
- `MailTransport` interface `{ send({ to, subject, html, text }) }`; `ResendTransport` (prod, `RESEND_API_KEY`, `MAIL_FROM`) and `SmtpTransport` (nodemailer → Mailpit, dev/e2e), selected by config.
- Templates as typed functions: `verifyEmailTemplate({ locale, link })`, `resetPasswordTemplate({ locale, link })` → `{ subject, html, text }`; plain, accessible HTML; brand wordmark text only.
- Send failures are logged with the request ID and surfaced as `MAIL_SEND_FAILED`, never as a 500 with provider details.

**Out of scope**
- Marketing emails.

**Files**
- `apps/api/src/mail/**`

**Acceptance criteria**
- [ ] Integration test sends through Mailpit and reads the message back via the Mailpit API.
- [ ] Both templates render in EN and ID (snapshot test).

**Verify**
- `pnpm --filter api test:integration -- mail`

---

### T-056 · Auth core: register, login, tokens, guards
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D6
- **Depends on:** T-055, T-006, T-007
- **Spec:** TDD §11 (all rows except Google), §10.3, ADR-07, §5 (User, RefreshToken) · PRD F-10 (AC-10.1, AC-10.2, AC-10.5, AC-10.6), AC-12.1
- **Goal:** Secure email/password sessions with rotating refresh tokens and role guards.

**Scope**
- `POST /auth/register`: Zod password policy + check against a bundled 10k common-password list; Argon2id (`memoryCost 19456, timeCost 2`); assigns `ADMIN` if email ∈ `ADMIN_EMAILS`; sends verification (T-057); signs the user in.
- `POST /auth/login` via `passport-local`; uniform error and constant-time behaviour for unknown emails (hash a dummy password).
- Access token: JWT HS256, 15 min, claims `{ sub, role, ev }`, cookie `margi_at` (`Path=/`). Refresh token: 32 random bytes, stored as sha256 with `familyId`, cookie `margi_rt` (`Path=/api/v1/auth`), 7 days.
- `POST /auth/refresh`: rotates; reuse of a revoked token revokes the whole family and returns 401.
- `POST /auth/logout`: revokes the family, clears cookies. `GET /auth/me`.
- Guards: `JwtAuthGuard` (`passport-jwt` reading the cookie), real `OptionalJwtGuard` (replaces the T-036 stub), `RolesGuard` + `@Roles('ADMIN')`, `@CurrentUser()` decorator, `@RequireVerifiedEmail()` for save-trip.
- Rate limits: login 5/min per IP+email (TDD §10.3, PRD AC-10.6).

**Out of scope**
- Verify/reset flows (T-057), Google (T-058).

**Files**
- `apps/api/src/auth/**`, `apps/api/src/users/**`, `apps/api/src/common/decorators/**`

**Acceptance criteria**
- [ ] Unit tests: rotation issues a new token and revokes the old; reusing the old token revokes the family (TDD §17).
- [ ] e2e: register → `/auth/me` 200 → logout → `/auth/me` 401.
- [ ] Passwords and tokens never appear in logs (redaction test).

**Verify**
- `pnpm --filter api test -- auth && pnpm --filter api test:e2e -- auth`

---

### T-057 · Email verification and password reset
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6
- **Depends on:** T-056
- **Spec:** TDD §10.3, §11 · PRD AC-10.1, AC-10.2, AC-10.4, AC-10.6
- **Goal:** Single-use, expiring email tokens with enumeration-safe responses.

**Scope**
- `EmailToken` issue/consume service: 32 random bytes, stored hashed, `VERIFY_EMAIL` 24 h, `RESET_PASSWORD` 30 min, `usedAt` set atomically (conditional update) so a token works once.
- `POST /auth/verify-email`, `POST /auth/resend-verification` (rate-limited), `POST /auth/forgot-password` (always `204`, 3/hour per email), `POST /auth/reset-password` (revokes all refresh families).
- Unverified users can log in but cannot save trips (`EMAIL_NOT_VERIFIED`).

**Out of scope**
- UI (T-059).

**Files**
- `apps/api/src/auth/email-tokens/**`

**Acceptance criteria**
- [ ] e2e with Mailpit: register → read link → verify → `ev = true` in a refreshed token.
- [ ] Forgot-password for unknown and known emails returns the same status and similar timing.
- [ ] A used or expired token returns `TOKEN_INVALID`.

**Verify**
- `pnpm --filter api test:e2e -- email-tokens`

---

### T-058 · Google sign-in
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D6
- **Depends on:** T-056
- **Spec:** TDD §11 (sequence diagram, Google linking row), §10.3 · PRD AC-10.3 · Clarification C-15
- **Goal:** One-click Google login that links safely to existing accounts.

**Scope**
- `passport-google-oauth20` with `state: true` and `pkce: true`, using a custom state store that keeps `{ state, codeVerifier, next }` in a signed, `httpOnly`, 10-minute cookie (`oauth_state`) — no server session.
- Callback: upsert `OAuthAccount`; if a user with the same email exists and Google says `email_verified=true`, link and mark verified; issue cookies; redirect to `${APP_URL}/auth/callback?next=` (validate `next` is a relative path).
- Endpoint disabled with a clear 404 when Google env vars are empty (dev without credentials).

**Out of scope**
- Other providers.

**Files**
- `apps/api/src/auth/google/**`

**Acceptance criteria**
- [ ] Unit tests for linking rules (new user, existing verified, existing unverified, unverified Google email → no link).
- [ ] Open-redirect test: `next=https://evil.example` is replaced with `/app`.
- [ ] Manual end-to-end login with a real Google test client on staging.

**Verify**
- `pnpm --filter api test -- google`

---

### T-059 · Web auth pages and session handling
- **Status:** done · **Priority:** P0 · **Size:** M · **Day:** D3
- **Depends on:** T-043, T-084 (real auth API arrives with T-056 – T-058; switched in T-086)
- **Spec:** PRD §5 (auth routes), AC-10.1–AC-10.4, AC-13.1 · TDD §11 (Frontend row), §13.1, §13.2
- **Goal:** Complete, accessible auth screens and silent token refresh.

**Scope**
- Pages: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/callback` — React Hook Form + shared Zod schemas, bilingual errors, `Continue with Google` button.
- `apiClient` 401 handling: single-flight `POST /auth/refresh`, queued requests replayed once, then redirect to login on failure.
- `useMe()` query; `RequireAuth` and `RequireRole('ADMIN')` become real; header shows account menu when signed in.
- "Verify your email" banner for unverified users; language preference saved to profile (`PATCH /me/profile`) when signed in.
- `LoginDialog` (native dialog) used by Save trip (T-061).

**Out of scope**
- Account deletion (not in PRD).

**Files**
- `apps/web/src/pages/auth/**`, `apps/web/src/features/auth/**`, `apps/web/src/lib/apiClient.ts`

**Acceptance criteria**
- [x] Test: two parallel requests receiving 401 trigger exactly one refresh call.
- [x] Forms are fully keyboard-usable, errors linked with `aria-describedby`.

**Verify**
- `pnpm --filter web test -- auth`

---

### T-060 · Me API: history, private photos, claim, trips, profile
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D6
- **Depends on:** T-056, T-036, T-007
- **Spec:** TDD §10.4, §9 (Simpan, Akses, Hapus rows), §14 (IDOR) · PRD F-11 (AC-11.1–AC-11.4), D-05, Flow C
- **Goal:** Signed-in users own their analyses, photos, and trips — and can delete them.

**Scope**
- Analysis create (T-036 extension): when signed in and `saveImage=true`, put the sanitized WebP at `user-uploads/{userId}/{analysisId}.webp` and set `imageKey`; MinIO failure logs a warning and continues (TDD §15).
- `GET /me/analyses?cursor&limit` (uuid v7 cursor), `GET/DELETE /me/analyses/:id`, `DELETE /me/analyses` (deletes objects synchronously, then rows), `GET /me/analyses/:id/image` → 302 to a 5-minute presigned URL.
- `POST /me/analyses/:id/claim`: matches the request's `margi_sid` hash, analysis ≤ 24 h old and unowned; sets `userId`, clears `guestSessionId`.
- Trips: `GET/POST /me/trips`, `GET/PATCH/DELETE /me/trips/:id`; POST validates that `venueId` and `msmeVenueIds` come from that analysis's result; requires verified email.
- `PATCH /me/profile` (`name`, `locale`).
- Daily orphan-object cleanup job (simple `setInterval` guarded by a Redis lock, or a script run by Dokploy cron).

**Out of scope**
- Shareable trip cards (v2).

**Files**
- `apps/api/src/me/**`, `apps/api/src/analyses/**` (image persistence)

**Acceptance criteria**
- [ ] IDOR e2e: user B gets 404 for user A's analysis, image, and trip.
- [ ] Deleting an analysis removes its MinIO object (verified with `HeadObject`).
- [ ] Claim fails for a different `margi_sid` or after 24 h.

**Verify**
- `pnpm --filter api test:e2e -- me`

---

### T-061 · Web: history, trips, and Save trip flow
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D3
- **Depends on:** T-059, T-053, T-084 (real Me API arrives with T-060; switched in T-086)
- **Spec:** PRD Flow C (§6.3), F-11, AC-09.3, AC-02 (save-photo toggle in Flow B step 5) · TDD §13.4 (`SaveTripButton`)
- **Goal:** A guest can save a trip in one interruption (login), and users manage what they saved.

**Scope**
- `SaveTripButton`: guest → `LoginDialog` → after login, `claim` → open save form (title, note, selected DTW + MSMEs) → `POST /me/trips` → toast + `trip_saved` event. Unverified → banner explaining why.
- Analyzer: "Save photo to my history" switch (default on, privacy hint) shown only to signed-in users.
- `/me/history`: paginated list (thumbnail via image endpoint, origin, time, tier, date), delete one / delete all with confirmation dialog.
- `/me/trips` and `/me/trips/:id`: list and detail with Navigate buttons, edit title/note, delete.

**Out of scope**
- Trip sharing (v2).

**Files**
- `apps/web/src/features/trips/**`, `apps/web/src/pages/me/**`

**Acceptance criteria**
- [ ] Flow C works end-to-end in `pnpm dev:mock` (guest analysis → save → login → trip listed); real-API check in T-086.
- [ ] Destructive actions require confirmation and are keyboard-accessible.

**Verify**
- Manual Flow C; `pnpm --filter web test -- trips`
