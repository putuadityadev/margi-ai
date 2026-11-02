# Testing Reference

Spec anchors: TDD §17 (strategy), §18.3 (CI) · PRD G-02 (0 crashes in 50 runs).

## 1. Tools and file naming

| Package | Runner | Unit | Integration | E2E |
| :--- | :--- | :--- | :--- | :--- |
| `packages/shared` | Vitest | `*.test.ts` next to source | — | — |
| `apps/api` | Jest (Nest default) | `*.spec.ts` next to source | `test/**/*.int-spec.ts` (real Postgres/Redis) | `test/**/*.e2e-spec.ts` (Supertest, `LLM_MOCK=true`) |
| `apps/web` | Vitest + Testing Library | `*.test.tsx` next to source | — | `e2e/**/*.spec.ts` (Playwright) |

Scripts: `test` (unit), `test:integration`, `test:e2e`. CI runs all three.

## 2. What to test where

- **Pure functions** (scoring, time, selection, canonicalizer, guardrails): exhaustive unit tests,
  boundaries on both sides of every threshold, the TDD §7.6 worked example, 100% coverage in `shared`.
- **Services with collaborators**: unit tests with hand-written fakes implementing the real interface
  (`FakeTelemetryProvider`, `FakeLlmClient`). Prefer fakes over deep `jest.mock` of modules.
- **SQL, pgvector, Redis Streams, MinIO**: integration tests against real services
  (Testcontainers `pgvector/pgvector:pg17`, `redis:7-alpine`, or the dev compose stack in CI service containers).
- **HTTP contracts**: Supertest e2e per controller; every endpoint gets one happy path and its
  important failures (validation 400, auth 401, ownership 404, rate limit 429, CSRF 403).
- **UI behaviour**: Testing Library by role and accessible name; assert what the user perceives.
  Network calls are answered by the same MSW handlers as prototype mode (`src/mocks/node.ts`,
  `setupServer` in the Vitest setup file); override per test with `server.use(...)` for error cases.
  Do not stub `fetch` or mock `apiClient` in component tests.
- **Journeys**: Playwright for the five flows in T-068 only.

## 3. Writing tests

- Arrange / Act / Assert, one behaviour per test, names that read as a specification:
  `it('flags the origin as red zone when raw CFS reaches 75')`.
- Deterministic: `vi.useFakeTimers()` / `jest.useFakeTimers()` for time, fixed `DateTime` inputs,
  seeded randomness, no real network, no `sleep`.
- Shared fixtures live in `packages/shared/test/fixtures/` (e.g. `analysis-result.lempuyang.json`)
  and are used by API and web tests alike so the contract is checked from both sides.
- Test data builders (`buildVenue({ category: 'TEMPLE' })`) over large copied literals.
- Do not test framework behaviour (that Nest calls a controller, that React renders a div).
- Do not use snapshot tests for markup; use them only for stable serialized contracts
  (JSON Schema output, SSE event order).

## 4. Examples

```ts
// packages/shared/src/scoring/cfs.test.ts
describe('cfs', () => {
  it('matches the Lempuyang worked example from TDD §7.6', () => {
    const score = cfs({ bEff: 115, fPlus2: 95, corridorPenalty: 0 });
    expect(score.raw).toBeCloseTo(86, 5);
    expect(isRedZone({ cfsRaw: score.raw, bEff: 115 })).toBe(true);
  });

  it('clamps the display value but keeps the raw value above 100', () => {
    // 0.5 * 160 + 0.3 * 100 + 0.2 * 25 = 115
    const score = cfs({ bEff: 160, fPlus2: 100, corridorPenalty: 25 });
    expect(score.display).toBe(100);
    expect(score.raw).toBeCloseTo(115, 5);
  });
});
```

```tsx
// apps/web/src/features/analyzer/SimulationToggle.test.tsx
it('announces the judge test mode state to assistive technology', async () => {
  const user = userEvent.setup();
  render(<SimulationToggle />);
  const toggle = screen.getByRole('switch', { name: /judge test mode/i });

  await user.click(toggle);

  expect(toggle).toHaveAttribute('aria-checked', 'true');
});
```

## 5. Playwright rules

- Locators by role/label/text (`getByRole('button', { name: 'Analyze vibe' })`); `data-testid` only when no accessible handle exists.
- Wait for state, never for time: `await expect(page.getByRole('tab', { name: /micro/i })).toBeVisible()`.
- Each spec starts from a clean state (fresh context, seeded DB); no ordering dependencies between specs.
- Run against the production build (`vite preview` + compiled API) in CI.

## 6. Reliability tests

- `scripts/smoke-prod.ts` (T-071) is the release gate: 50 randomized runs, 0 unexpected errors.
- Forced-failure runs (`LLM_FORCE_FAIL=true`) on staging prove the fallbacks, not just the happy path.
- Every production bug gets a regression test at the lowest level that reproduces it.
