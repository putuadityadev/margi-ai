# Phase 10 — Submission Package (Day 7)

Goal of the phase: the competition attachments are complete, consistent with the tagged
code, and honest. These are mostly **owner tasks**; an AI agent may draft, but the owner
writes the final wording and verifies every claim.

Consistency rule: every number in the proposal and disclosure must come from the specs,
`docs/eval.md`, or production stats — never estimated fresh.

---

### T-074 · AI & Technology Disclosure (Lampiran C)
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D7
- **Depends on:** T-073
- **Spec:** BRD §10.2 (template) · TDD §2 · Clarification C-07
- **Goal:** A complete, truthful disclosure that matches the shipped code.

**Scope**
- `docs/DISCLOSURE.md`: fill every `[Isi …]` placeholder in BRD §10.2 from the real stack — frontend, backend, database, hosting (Dokploy VPS), AI models actually used (from `docs/DECISIONS.md` Q-01), main libraries (generated from `package.json` files, production dependencies only), data sources and photo credits (from `venues.json`/`presets.json`), AI coding assistant usage stated honestly, pre-existing components (none), third-party assets.
- Sync the in-app `/about/ai-disclosure` page (T-054) with the final document.

**Out of scope**
- Legal advice.

**Files**
- `docs/DISCLOSURE.md`, `apps/web/src/pages/about/**`

**Acceptance criteria**
- [ ] No placeholder text remains.
- [ ] Every library listed exists in a `package.json`; every model listed appears in production `modelsUsed`.

**Verify**
- Owner review against `pnpm ls --prod -r --depth 0` and `/admin/stats`.

---

### T-075 · Proposal PDF (Lampiran A, max 5 pages) — owner task
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D7
- **Depends on:** T-071, T-074
- **Spec:** BRD §2 (Bab 1), §4 (Bab 2), §5 (Bab 3, 6), §7 (Bab 4), §9 (Bab 7, 8), §3 (rubric map)
- **Goal:** A 5-page proposal whose claims are backed by the running product.

**Scope**
- Structure follows the BRD chapter notes; include the architecture diagram, the CFS/R formulas with the §7.6 worked example, reliability evidence (T-071 results), latency numbers (`docs/eval.md`), live URL, repo URL, tag `v1.0-submission` + commit hash.
- Rubric check: one explicit paragraph per scoring criterion in BRD §3 (AI relevance, reliability, problem-solution fit, innovation, feasibility/UX/compliance).

**Out of scope**
- Code changes.

**Files**
- `docs/proposal/` (source) and the exported PDF (not committed if it contains personal data).

**Acceptance criteria**
- [ ] ≤ 5 pages; every figure traceable to a source listed in BRD §2 or `docs/eval.md`.

**Verify**
- Owner read-through with the rubric table open.

---

### T-076 · Demo video — owner task
- **Status:** todo · **Priority:** P0 · **Size:** S · **Day:** D7
- **Depends on:** T-073
- **Spec:** BRD §5 (Clean-Start demo flow), BRD §4 (Evaluator persona) · PRD Flow A, F-06, F-07
- **Goal:** A short, honest recording of the real product doing the real thing.

**Scope**
- Script: open the live URL (no login) → Lempuyang preset → Thought Stream → Red Zone → Micro/Regional cards → histogram → Navigate; then a custom photo upload; then Judge Test Mode at a quiet hour; close on the disclosure page.
- Record against production at the tagged commit; no edited or staged results; simulated data stays labelled.

**Out of scope**
- Motion graphics.

**Files**
- `docs/demo-script.md`

**Acceptance criteria**
- [ ] The video shows only features present in `v1.0-submission`.

**Verify**
- Owner review.
