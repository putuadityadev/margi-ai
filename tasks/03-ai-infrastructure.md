# Phase 03 — AI Infrastructure

Goal of the phase: reliable building blocks for the agents — an OpenRouter client that never
hangs and never returns unvalidated JSON, a safe image intake, embeddings, and a calibrated
vector search. Agents (Phase 04) only compose these.

Principle (TDD §1.3): **LLMs perceive and narrate; code computes.** Nothing in this phase lets a
model produce a score, a distance, or an ID that is trusted without validation.

---

### T-022 · OpenRouter client (`LlmModule`)
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D4
- **Depends on:** T-005, T-015
- **Spec:** TDD §6.1, §6.2, ADR-04 · Clarification C-04
- **Goal:** One injectable client for chat, vision, and structured output with timeouts, retries, model fallback, and metrics.

**Scope**
- `OpenRouterClient` using the `openai` SDK with `baseURL: https://openrouter.ai/api/v1`, `defaultHeaders: { 'HTTP-Referer': APP_URL, 'X-Title': 'MARGI AI' }`, SDK-level retries disabled (the client owns retry policy).
- `structured<T>({ purpose, model, messages, schema, maxTokens, timeoutMs })`:
  - Converts the Zod schema with `toLlmJsonSchema()` (wraps `z.toJSONSchema`, enforces `additionalProperties: false` and all-required properties, strips keywords the provider rejects) and sends `response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } }`.
  - Sends OpenRouter's `models: [primary, ...LLM_FALLBACK_MODELS]` for provider-side fallback.
  - Parses and validates with Zod. On failure: exactly **one** repair retry that includes the validation issues; then throws `LlmSchemaError`.
  - Retries once on 429/5xx with 300 ms + jitter backoff; never retries on 4xx validation errors.
  - Per-purpose timeouts via `AbortController`: vision 7 s, agent 6 s (TDD §6.2).
- `vision(...)`: builds the multimodal message with a base64 data URL (`image_url`).
- Returns `{ data, meta: { modelUsed, latencyMs, promptTokens, completionTokens, attempt } }`; `modelUsed` comes from the response, not the request.
- Typed errors: `LlmTimeoutError`, `LlmUnavailableError`, `LlmSchemaError`.
- Prompts live as versioned constants in `llm/prompts/*.ts` (`VIBE_SYSTEM_PROMPT_V1`, …), never inline in services.
- Health: `/api/health/ready` gains an OpenRouter check (`GET /api/v1/key` or `/models`) cached 60 s; failure marks `llm: 'degraded'`, not unhealthy.

**Out of scope**
- Circuit breaker and mock mode (T-023), embeddings (T-025).

**Files**
- `apps/api/src/llm/**`

**Acceptance criteria**
- [ ] Unit tests with a fake HTTP layer cover: valid JSON; invalid → repair → valid; invalid twice → `LlmSchemaError`; 429 → retry → success; timeout → `LlmTimeoutError` within budget + 100 ms.
- [ ] `toLlmJsonSchema(VibeProfile)` and `toLlmJsonSchema(SynthesisOutput)` have `additionalProperties: false` on every object and every key listed in `required` (test).
- [ ] No API key or full prompt appears in logs; logs include `purpose`, `modelUsed`, `latencyMs`, token counts.

**Verify**
- `pnpm --filter api test -- llm`

---

### T-023 · Circuit breaker, mock mode, and forced-failure mode
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-022, T-007
- **Spec:** TDD §6.2 (circuit breaker), §6.1 (`LLM_MOCK`), §17 (`LLM_FORCE_FAIL`), §12 (`cb:llm`)
- **Goal:** The pipeline can be tested deterministically and degrades instantly when the provider is down.

**Scope**
- `LlmCircuitBreaker` backed by Redis (`cb:llm`): ≥ 5 failures in 60 s → `OPEN` for 30 s → `HALF_OPEN` allows one probe. Exposes `isOpen()` for the orchestrator. If Redis is unavailable, fall back to an in-process counter (single instance, TDD §15).
- `LLM_MOCK=true`: the client returns fixtures from `llm/fixtures/` selected by `purpose` and, for vision, by image sha256 (preset images get realistic fixtures; unknown images get a generic travel-scene fixture; a `not-a-scene` fixture exists for tests). Mock latency is configurable to exercise the UI.
- `LLM_FORCE_FAIL=true`: every call throws `LlmUnavailableError` (staging reliability test, TDD §17).
- Both flags are refused when `NODE_ENV=production` unless `ALLOW_TEST_FLAGS_IN_PROD=true` (document in `.env.example`).

**Out of scope**
- Last-Known-Good replay (T-038).

**Files**
- `apps/api/src/llm/{circuit-breaker.ts,mock/**,fixtures/**}`

**Acceptance criteria**
- [ ] Unit test: 5 failures open the breaker; calls short-circuit without network; after 30 s (fake timers) one probe is allowed.
- [ ] With `LLM_MOCK=true` the full API test suite runs offline.
- [ ] Booting production with `LLM_MOCK=true` fails with a clear message.

**Verify**
- `LLM_MOCK=true pnpm --filter api test`

---

### T-024 · Image intake and sanitization
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-005
- **Spec:** TDD §9 · PRD AC-02.3, §8 (Privacy, Security) · BRD §10.1.2
- **Goal:** Any uploaded file becomes a clean 1024 px WebP buffer with a stable hash, or is rejected with a precise error.

**Scope**
- `ImagesModule` with `sanitizeImage(buffer) → { webp: Buffer, sha256: string, width, height }`: `sharp(buffer).rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 })` — metadata is not copied, so EXIF/GPS is dropped.
- `validateImage(buffer)`: `file-type` magic bytes ∈ {jpeg, png, webp}; otherwise `415` with code `ANALYSIS_IMAGE_UNSUPPORTED`. Size > 6 MB → `413` `ANALYSIS_IMAGE_TOO_LARGE`.
- Multer config for the analysis endpoint: memory storage, 1 file, 6 MB limit, field name `image`.
- Pure function, no storage here; callers decide whether to persist (T-060).

**Out of scope**
- Client-side compression and HEIC conversion (T-045).

**Files**
- `apps/api/src/images/**` (+ test fixtures: jpeg with GPS EXIF, png, webp, a `.exe` renamed to `.jpg`, a 7 MB file)

**Acceptance criteria**
- [ ] Sanitized output of the GPS-tagged JPEG contains no EXIF (asserted with `sharp(...).metadata()`).
- [ ] Renamed executable is rejected with 415 regardless of extension or declared MIME type.
- [ ] Same input bytes always produce the same `sha256`.

**Verify**
- `pnpm --filter api test -- images`

---

### T-025 · Embedding module and vibe canonicalizer
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-022, T-023, T-006
- **Spec:** TDD §6.3 steps 3–4, §5 (dimension note), §12 (`cache:emb:*`)
- **Goal:** Deterministic vibe text → cached embedding vector → stored in pgvector.

**Scope**
- `canonicalizeVibe(profile) → string`: fixed dimension order (topography, architecture, lighting, activity, visual_density), lower-cased, deduplicated descriptors in stable order, intensity with 2 decimals, English only (TDD §6.3 example format). Pure; unit-tested with a snapshot.
- `EmbeddingService.embed(text)`: OpenRouter `/embeddings` with `EMBEDDING_MODEL`, timeout 3 s, validates returned length equals `EMBEDDING_DIMENSIONS`. Cache in Redis at `cache:emb:{sha256(text)}:{model}` as base64 Float32 (30 days).
- `VenueEmbeddingRepository.write(venueId, vector, model)` via `$executeRaw` with a `'[…]'::vector` literal and `::uuid` cast (Prisma cannot write `Unsupported` columns).
- Mock mode: deterministic pseudo-embeddings derived from the text hash (so similarity tests are stable offline).

**Out of scope**
- Similarity search (T-026).

**Files**
- `apps/api/src/embedding/**`

**Acceptance criteria**
- [ ] Two semantically identical profiles with different descriptor order produce identical `vibeText`.
- [ ] A cache hit performs no network call (spy test).
- [ ] Wrong vector length throws `EmbeddingDimensionError`.

**Verify**
- `pnpm --filter api test -- embedding`

---

### T-026 · Vector similarity search (pgvector top-K)
- **Status:** todo · **Priority:** P0 · **Size:** M · **Day:** D4
- **Depends on:** T-025, T-021
- **Spec:** TDD §7.3, §6.3 step 5 · BRD §7.3
- **Goal:** Given a reference embedding, return the top-K active venues with raw cosine and calibrated `simVibe`.

**Scope**
- `VenueSearchRepository.topK({ vector, excludeVenueId, k = 20, kinds? })` using the exact SQL in TDD §7.3 through `prisma.$queryRaw` (tagged template, parameters never string-concatenated).
- `VenueSearchRepository.similarityFor({ vector, venueIds })` for MSME bundling (cosine for a specific set).
- Map rows to `{ venueId, cos, simVibe }` with `simVibeFromCosine` and the configured calibration.
- Integration tests on Testcontainers `pgvector/pgvector:pg17` with hand-made 3-D fixtures (use a test migration that creates a small `vector(3)` table, or seed with the mock embedder at 1536 dims).

**Out of scope**
- Filtering by telemetry (Agent 2).

**Files**
- `apps/api/src/embedding/venue-search.repository.ts` (+ integration test)

**Acceptance criteria**
- [ ] Results are ordered by distance, exclude the origin and inactive venues, and never exceed `k`.
- [ ] `EXPLAIN` on the production-size table shows the HNSW index is usable (document the output in the PR).

**Verify**
- `pnpm --filter api test:integration -- venue-search`

---

### T-027 · AI scripts: benchmark, venue vibes, embeddings, calibration
- **Status:** todo · **Priority:** P0 · **Size:** L · **Day:** D4
- **Depends on:** T-022, T-024, T-025, T-026
- **Spec:** TDD §6.1 (benchmark), §7.3 (calibration golden set), §17 (AI evaluation), §19 (pipeline) · PRD Q-01
- **Goal:** Pick the models with evidence, generate reviewed venue vibes, and calibrate the similarity scale.

**Scope**
- `scripts/bench-models.ts`: 10 images × 3 candidate models → p50/p95 latency, JSON validity rate, cost estimate; writes `docs/eval.md` (table). Choose the model with vision p95 ≤ 4 s; record the decision in `docs/DECISIONS.md` (answers Q-01) and set env defaults.
- `scripts/generate-vibes.ts`: runs Agent 1's vision call on every venue photo and writes `prisma/seed/data/vibes.json` (`slug → VibeProfile`). The owner reviews and edits this file by hand before committing (TDD §19).
- `scripts/embed-venues.ts`: canonicalize + embed + write vector for all active venues whose `vibeText` or model changed (idempotent).
- `scripts/calibrate-similarity.ts`: golden set `scripts/data/golden-pairs.json` (15 labelled "similar" / "not similar" pairs) → prints cosine distributions and the recommended `COS_FLOOR`/`COS_CEIL`; results appended to `docs/eval.md`, chosen values put in `.env.example` defaults.
- Golden-set evaluation (TDD §17): 15 reference photos → top-3 must contain ≥ 1 venue labelled relevant; report the hit rate in `docs/eval.md`.

**Out of scope**
- Automating these in CI (they cost money; run manually).

**Files**
- `apps/api/scripts/**`, `apps/api/prisma/seed/data/vibes.json`, `docs/eval.md`

**Acceptance criteria**
- [ ] `docs/eval.md` contains the benchmark table, calibration numbers, and golden-set hit rate (≥ 12/15 target; if lower, write down the mitigation).
- [ ] All active venues have a reviewed `vibeProfile` and an embedding with `embeddingModel` set.
- [ ] Q-01 is closed in `docs/DECISIONS.md`.

**Verify**
- `pnpm --filter api script:embed-venues`, then `SELECT count(*) FROM "Venue" WHERE embedding IS NULL AND "isActive";` → 0
