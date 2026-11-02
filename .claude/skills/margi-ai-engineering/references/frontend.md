# Frontend Reference — `apps/web` (React 19, Vite 7, React Router 7, Tailwind v4)

Spec anchors: PRD §5 (sitemap), §7 (features), §8 (non-functional), §10 (UX/UI) · TDD §13 · DESIGN.md.

## 1. Folder roles

```text
app/            router, providers, layouts, route guards
pages/          one folder per route; composes features; no reusable logic
features/<x>/   components, hooks, api calls, and local types for one domain area
components/ui/  design-system primitives (no data fetching, no domain words)
components/data/ data-viz primitives allowed to use crowd colours (badges, scales)
lib/            apiClient, i18n, format, gsap, cn, track — framework glue only
stores/         Zustand stores for client/UI state
locales/{en,id}/ translation JSON per namespace
```

Import direction: `pages → features → components/lib/stores`. Features do not import other
features' internals; share through `components/` or `lib/` if truly shared.

## 2. Components

- Function components with typed props; React 19 passes `ref` as a normal prop, so do not use `forwardRef`.
- One exported component per file; small private subcomponents in the same file are fine.
- Props: required data first, callbacks named `onX`, no boolean prop pairs that conflict (use a `variant` union).
- Variants via a plain object map + `cn()`; no class-variance library needed for this size.

```tsx
const toneClass = {
  white: 'bg-white',
  parchment: 'bg-parchment',
  dark: 'bg-charcoal text-parchment',
  lime: 'bg-lime',
} as const satisfies Record<CardTone, string>;

export function Card({ tone = 'white', className, ...props }: CardProps) {
  return <div className={cn('rounded-card p-8 md:p-12', toneClass[tone], className)} {...props} />;
}
```

## 3. Routing (React Router 7, library/data mode)

- Import from `react-router` (not `react-router-dom`). Use `createBrowserRouter` + `RouterProvider`.
- Lazy routes return route module fields:

```ts
{ path: 'admin/*', lazy: async () => ({ Component: (await import('@/pages/admin/AdminLayout')).AdminLayout }) }
```

- Search params hold shareable UI state (`?preset=`, `?run=1`, `?tab=micro`); Zustand holds transient state.
- Every route has an error boundary that shows a friendly retry, never a blank page.

## 4. State

| State | Tool | Rule |
| :--- | :--- | :--- |
| Server data | TanStack Query v5 | Keys from `lib/queryKeys.ts`; never copy server data into Zustand |
| Analyzer input, stream progress, UI prefs | Zustand | Select narrowly: `useStreamStore((s) => s.status)`; use `useShallow` for multiple fields |
| Forms | React Hook Form + `zodResolver` | Schemas from `@margi-ai/shared`; errors via i18n keys |
| URL | search params | Parse with Zod; ignore invalid values |

Stores expose actions inside the store; components never mutate state objects directly.

## 5. Styling (Tailwind v4 + DESIGN rules)

- Tokens only (defined in `styles/index.css` `@theme`); the default palette, shadows, and bold
  weights are reset, so off-system classes simply do not exist (Clarification C-19).
- Radii: cards/buttons `rounded-card` (28), inner `rounded-inner` (18), inputs `rounded-input` (8), pills `rounded-pill`.
- Type: weights 400/500 only; `tracking-[-0.03em]` for ≥ 28 px; uppercase eyebrows with `tracking-[0.1em]` at 10–12 px.
- Surfaces: white → parchment → lime → dark island. No shadows, no gradients.
- Lime is a background for the primary CTA and hero only; text on lime is ink. One lime CTA per viewport area.
- `crowd-*` and `sim-banner` colours only in `features/results/*` and `components/data/*`.
- `/app` uses tighter spacing (24–40 px sections); landing keeps 80–120 px.
- Mobile first; test at 360 px. No horizontal scroll.

## 6. Accessibility (WCAG 2.1 AA)

- Use semantic elements first (`button`, `a`, `nav`, `main`, `dialog`, `select`); ARIA only to fill gaps.
- Every interactive element is keyboard-reachable with a visible focus ring.
- Thought Stream list: `aria-live="polite"`; do not announce every heartbeat.
- Charts and colour badges always have a text equivalent (class name, value).
- Images: meaningful `alt`; decorative images `alt=""`.
- Respect `prefers-reduced-motion` in CSS and GSAP.

## 7. Animation (GSAP 3 + `@gsap/react`)

```tsx
export function StepList({ steps }: StepListProps) {
  const scope = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-step]:last-child', { y: 8, autoAlpha: 0, duration: 0.3, ease: 'power2.out' });
      });
    },
    { scope, dependencies: [steps.length] },
  );

  return <ol ref={scope}>{/* … */}</ol>;
}
```

- Always `useGSAP` with a `scope` (automatic cleanup). Never animate in `useEffect` without cleanup.
- Durations 200–600 ms, `power2.out`. Count-up numbers tween an object and write `textContent`
  with tabular numerals; the final value is rendered without animation for reduced motion.
- Plugins (`ScrollTrigger`, `SplitText`) are registered once in `lib/gsap.ts`.

## 8. Internationalization

- Keys are semantic and namespaced: `results.routeCard.timeSaved`, not sentences as keys.
- Interpolation and plurals through i18next (`t('results.msmeCount', { count })`); never build sentences by concatenation.
- Dates, times, numbers via `Intl` with `timeZone: 'Asia/Makassar'`.
- Narrative text from the API already arrives in the analysis locale; do not translate it on the client.
- `pnpm lint` fails if EN and ID key sets differ.

## 9. Data fetching and streaming

- All HTTP through `lib/apiClient.ts` (credentials, CSRF header, error parsing, refresh single-flight).
- Responses are parsed with shared Zod schemas; a schema mismatch is a bug report, not a silent cast.
- `EventSource` lives only in `useAnalysisStream`; events are parsed with `StreamEvent` and deduped by `id`.
- Always clean up: abort fetches and close event sources on unmount or when a new analysis starts.

## 10. Mock API layer (prototype mode)

The web app is built first against mocks (tasks T-082 – T-086, Clarification C-20).

- Mocks are MSW handlers at the network layer: `apiClient`, `useAnalysisStream`, and components
  are the production code paths. Nothing outside `src/mocks/**` imports from `src/mocks/**`,
  except the single guarded dynamic import in `main.tsx`.
- Enabled with `vite --mode mock` (`VITE_API_MOCKS=true` or a comma list of domains still mocked).
  Production builds must contain no mock code; verify with the grep in T-082.
- Every mock payload (fixtures, handler responses, SSE events) is parsed with the shared Zod
  schemas. A mock is a faithful copy of the contract, never a looser one.
- Mock numbers are computed with `@margi-ai/shared` scoring functions from mock inputs, so the
  "How is this calculated?" explainer matches exactly. Never hand-type a score.
- Mock data is realistic and bilingual (real Bali places and coordinates, credited photos).
- Error responses use the real status codes and `{ error: { code, message, requestId } }` body;
  non-GET handlers enforce the `X-Requested-With: margi-ai` header like the API.
- The SSE mock (`sse()` from MSW ≥ 2.12) cannot reproduce server-side `Last-Event-ID` replay;
  test reconnection against the real API (T-086).
- Scenarios (surge, relaxed, not-a-scene, replay, errors, expired session…) are selected in the
  dev panel, never by special-casing component code.
- When the real API and a mock disagree, fix the API or the shared schema per the spec, then
  update the mock. Record any contract change in `docs/DECISIONS.md`.

## 11. Performance

- Initial JS ≤ 250 KB gzip. Lazy-load admin, auth pages, Leaflet (import its CSS inside the lazy module), and Recharts.
- Images: WebP/AVIF, explicit `width`/`height`, `loading="lazy"` below the fold, `fetchpriority="high"` for the hero.
- Avoid unnecessary re-renders from broad store selectors; measure with React DevTools before memoizing.
  Do not sprinkle `useMemo`/`useCallback` by default.

## 12. Charts and map

- Recharts: one `DualHistogram` component; colours from `components/data/crowdScale.ts`; tooltip and
  legend text from i18n; animation disabled under reduced motion.
- React Leaflet: OSM tiles with attribution, `divIcon` markers styled by tokens, `fitBounds` on data change.
  The map duplicates information in the cards, so it is `aria-hidden` and never the only way to reach data.
