# Phase 11 — `v2.0-final` Roadmap (P1)

Start only after `v1.0-submission` is tagged and the improvement window opens. Each task here
is a sketch; expand it with full scope and acceptance criteria (same template as the other
phases) before starting, and re-check it against any spec updates.

Backlog notes not yet scheduled: hybrid score with direct image embeddings (TDD §22.4),
Google Places for opening hours (TDD §22.5), Renovate (TDD §14), Agent 2 experimental
LLM tool-calling mode `AGENT2_LLM_TOOLCALLING` (TDD §6.4).

---

### T-077 · Self-service MSME onboarding (F-14)
- **Status:** todo · **Priority:** P1 · **Size:** L · **Day:** v2
- **Depends on:** T-062, T-064
- **Spec:** PRD F-14 · BRD BR-10 · TDD §22.1
- **Goal:** MSMEs register themselves; Agent 1 drafts their vibe; an admin approves.

**Scope (sketch)**
- Public form (no login wall for viewing; spam protection via rate limit + email verification of the submitter), photo upload through `sanitizeImage`, automatic vibe generation, moderation queue in admin, approval embeds and activates the venue.

**Acceptance criteria (sketch)**
- [ ] A submitted MSME is invisible to recommendations until approved.

---

### T-078 · Shareable Trip Card (F-15)
- **Status:** todo · **Priority:** P1 · **Size:** M · **Day:** v2
- **Depends on:** T-061
- **Spec:** PRD F-15 · TDD §22.2 · Clarification C-12 (revisit)
- **Goal:** A trip becomes a PNG card and a public, read-only link.

**Scope (sketch)**
- Server-side render with `satori` + `@resvg/resvg-js`; public route `/t/:slug` showing only trip data (no photo, no user identity); revocable by the owner.

**Acceptance criteria (sketch)**
- [ ] Revoking a share link returns 404 immediately.

---

### T-079 · Product analytics and regional impact dashboard (F-16)
- **Status:** todo · **Priority:** P1 · **Size:** M · **Day:** v2
- **Depends on:** T-063
- **Spec:** PRD F-16, §2.3 (North Star) · TDD §22.6
- **Goal:** Measure the North Star (Navigate clicks to alternatives) and show redistribution per regency.

**Scope (sketch)**
- Self-hosted Umami for page analytics (cookieless); admin view aggregating `navigate_clicked` by regency and DTW/MSME kind for a public-sector-style impact summary.

**Acceptance criteria (sketch)**
- [ ] No personal data leaves the server; privacy page updated.

---

### T-080 · Background worker and horizontal scaling
- **Status:** todo · **Priority:** P1 · **Size:** L · **Day:** v2
- **Depends on:** T-035, T-030
- **Spec:** TDD §21 (in-process orchestrator debt), §22.3
- **Goal:** Analyses run in a BullMQ worker so the API can scale beyond one instance.

**Scope (sketch)**
- Move `Orchestrator.run` behind a BullMQ queue; the API only enqueues; the event bus is already Redis-based. Remove the in-memory event fallback once multi-instance is enabled (document the trade-off).

**Acceptance criteria (sketch)**
- [ ] Two API instances behind Traefik pass the T-068 suite and the T-071 smoke test.

---

### T-081 · Real travel-time estimates
- **Status:** todo · **Priority:** P1 · **Size:** M · **Day:** v2
- **Depends on:** T-033
- **Spec:** TDD §21 (rough travel estimate debt), §22.5
- **Goal:** Replace constant-speed travel estimates with routed durations.

**Scope (sketch)**
- Self-hosted OSRM (Bali extract) or a routing API behind a `TravelTimeProvider` interface with the current constant-speed function as fallback; cache by origin/destination/hour bucket.

**Acceptance criteria (sketch)**
- [ ] When routing is down, cards still show the labelled estimate.
