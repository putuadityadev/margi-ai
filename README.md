# MARGI AI

**Bali, minus the queue.** MARGI AI reads the crowd hour by hour and points travellers to a calm place with the same feel, with real forecasts, real roads and no guessing.

Built for the **Bali DigiFest 2026, AI Web Innovation Challenge (AIWIC)**. MARGI (Sanskrit/Balinese for "a harmonious path") was developed from scratch for this competition; there is no earlier product behind it.

- **Live:** https://margi.web.id (judge demo account: delivered through the organisers' form, not in this repository)
- **Submitted version:** see the git tag `v1.0-submission`
- **AI & Technology Disclosure:** [`/about/ai-disclosure`](https://margi.web.id/about/ai-disclosure) in the app, and [Responsible AI](#ai-implementation) below

## Problem and target user

Bali's visitors pile into the same few famous places at the same hours (7.05 million foreign arrivals in 2025; an 11-hour daily gridlock on Jl. Raya Ubud) while equally good places a short drive away stay quiet. Tourism income concentrates in a few regencies: Badung receives 60.5% of hotel and restaurant tax, Bangli 1.7% (DJPK).

**Who it is for:** visitors and residents planning a day in Bali who would rather skip the queue, and the family-run warung, cafés and attractions that rarely get discovered.

## Key features

All of these work today, on real data.

| Feature                        | What it does                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Explore** (map)              | Pick a start point and a mood; the map shows how busy each place will be when you arrive and ranks the calm ones. Place detail shows an hourly forecast, quiet hours, etiquette, calmer places with a similar mood, and nearby local businesses.                                                      |
| **Feed**                       | An endless, full-screen scroll through every destination with the quietest hour, and a calmer twin for busy places. No location needed to browse.                                                                                                                                                     |
| **Chat MARGI**                 | Ask in plain language ("a quiet beach near me?", "is Tegallalang busy at 4?"). Answers come with place cards you can add to a plan.                                                                                                                                                                   |
| **Trip planner + Copilot**     | Build a multi-stop trip. Road time uses live traffic routing; every stop shows crowd on arrival; a departure chart shows the best hour. The Copilot can swap, add or reorder stops, change the destination, and answer "what if I leave at 06:00?". Changes are applied from cards and can be undone. |
| **Accounts**                   | Planning and searching are open to guests. Saving a plan needs an account (email and password, or Google). Saved plans live under Plans.                                                                                                                                                              |
| **Curator console** (`/admin`) | Admins add, edit, deactivate and restore destinations and local businesses; new places are embedded and appear in the app immediately.                                                                                                                                                                |
| **Bilingual**                  | English and Indonesian throughout.                                                                                                                                                                                                                                                                    |

## Tech stack

| Layer       | Choice                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend    | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, Zustand, react-i18next, react-leaflet, GSAP + Lenis (landing page motion) |
| Backend     | NestJS 11, TypeScript, Zod 4 validation, Pino logging                                                                                  |
| Database    | PostgreSQL 17 with pgvector (Prisma 7 + `@prisma/adapter-pg`), Redis 7                                                                 |
| Shared code | `packages/shared`: Zod schemas, the scoring and trip engine, WITA time helpers                                                         |
| Hosting     | Docker containers on a VPS behind Traefik (Let's Encrypt HTTPS); see [`docs/DEPLOY.md`](./docs/DEPLOY.md)                              |
| Tooling     | pnpm workspaces, ESLint, Prettier, Vitest, Jest, GitHub Actions CI, Gitleaks                                                           |

## AI implementation

MARGI follows one rule: **numbers by code, words by AI.**

- **Assistant (Copilot and Chat).** A language model (DeepSeek V4.1 Flash through OpenRouter, with an NVIDIA Nemotron fallback) reads the question, chooses tools (search places, nearby places, place details, check a departure time, change the trip, suggest changes) and writes the answer. The tools run in the shared engine and compute every crowd figure, travel time and ranking. A check rejects any number in the answer that no tool returned. If no model is available the app shows an error; there are no canned replies.
- **Same-mood matching.** Place descriptions are embedded with Google Gemini Embedding 001 (768 dimensions). Cosine similarity, calibrated between 0.60 and 0.90, decides which calm place feels like a busy one and feeds the ranking `R = 0.50 x similarity + 0.35 x (100 - crowd friction) + 0.15 x fiscal-equity boost`.
- **Crowd forecast (not generative AI).** Curated hourly curves adjusted by public holidays (API Hari Libur), Balinese ceremonies and season, plus live road congestion beside a place (TomTom Traffic Flow). Figures are labelled forecasts, never head counts.
- **Honesty.** No invented fallback data: if routing or the model fails, the interface shows an error with a retry. Full details in the in-app [AI & Technology Disclosure](./apps/web/src/pages/about/AiDisclosurePage.tsx).
- **AI coding assistant.** Claude (Anthropic, through Claude Code) helped with scaffolding, debugging, tests and documentation. Architecture, algorithms and code were reviewed and tested by the builder.

A behavioural check of the assistant (11 traveller messages against the running API) lives in `apps/api/scripts/eval-copilot.ts`.

## Architecture and data flow

```
Browser (React SPA)
   |  /api/v1  (same origin, httpOnly cookies)
   v
nginx (static files + /api proxy) --> NestJS API
                                        |-- Auth: sessions, Google OAuth (PKCE)
                                        |-- Explore / Feed / Trips ---- shared engine (crowd, ranking, trip metrics)
                                        |-- Copilot / Chat ---- LLM tool loop --> OpenRouter
                                        |                          '-- tools call the engine; numbers are checked
                                        |-- Routing --> TomTom (OpenRouteService fallback)
                                        |-- Context --> holidays, Balinese calendar, live traffic signal
                                        '-- Postgres (places, embeddings, users, plans)  +  Redis
Admin console --> admin API --> Postgres --> engine catalogue reloaded
```

Places live only in Postgres. The API refuses to start if the catalogue is empty or the database is unreachable (there is no file fallback).

## Run instructions

Requirements: Node 22 (`.nvmrc`), pnpm 12 (`corepack enable`), Docker.

```bash
git clone <this repository> && cd app
cp .env.example .env            # fill OPENROUTER_API_KEY, TOMTOM_API_KEY, JWT_ACCESS_SECRET, ADMIN_EMAILS
docker compose -f docker-compose.dev.yml up -d postgres redis
pnpm install
pnpm db:generate
pnpm db:migrate                 # applies migrations
pnpm db:seed                    # loads the reviewed catalogue (86 destinations, 60 local businesses)
pnpm dev                        # API on :3000, web on :5173
```

Open http://localhost:5173. Without `OPENROUTER_API_KEY` the Copilot and Chat answer with an error; map, feed and planning still work (routing needs `TOMTOM_API_KEY` or `ORS_API_KEY`). Google sign-in appears only when the three `GOOGLE_*` variables are set.

```bash
pnpm lint && pnpm typecheck && pnpm test      # the CI gate
```

Production deployment: [`docs/DEPLOY.md`](./docs/DEPLOY.md).

## Team members

| Name                    | Role                                                     |
| ----------------------- | -------------------------------------------------------- |
| Aditya (@putuadityadev) | Solo builder: product, UX, full-stack and AI engineering |

## Known limitations

- Crowd levels are curated model forecasts with a live-traffic nudge, not sensor counts; accuracy varies by place and day.
- 86 destinations and 60 local businesses (OpenStreetMap) today. Some destinations have no qualifying local business within 3 km, and business opening hours are only as current as OpenStreetMap.
- Ceremonies that close roads without notice are not detected.
- The AI answers depend on third-party model availability and a small spending cap; under heavy load it may return an error (requests are rate limited per visitor).
- Email verification and password reset are not offered (no mail provider yet); Google sign-in is the alternative.
- Photo-based place matching was prototyped and removed; it is not part of this version.

## Third-party resources

- **Data:** OpenStreetMap contributors (ODbL; local businesses and map tiles; see [`docs/osm-attribution.md`](./docs/osm-attribution.md)); Wikimedia Commons (place photos, each with author and licence; see [`docs/photo-attribution.md`](./docs/photo-attribution.md)); API Hari Libur (Indonesian holidays); BPS Bali, Bali Tourism Office and DJPK (context statistics).
- **APIs and models:** OpenRouter (DeepSeek V4.1 Flash, NVIDIA Nemotron, Google Gemini Embedding 001); TomTom Routing and Traffic Flow; OpenRouteService (fallback); Google Identity (sign-in).
- **Libraries (main):** React, Vite, Tailwind CSS, TanStack Query, Zustand, react-i18next, react-leaflet and Leaflet, GSAP, Lenis, lucide-react, Luxon, balinese-date-js, NestJS, Prisma, Zod, Pino, Jest, Vitest. The full list is in the `package.json` files and `pnpm-lock.yaml`.
- **Fonts:** Geist Sans and Geist Mono (SIL OFL).
- **Hero illustration** and the mascot were supplied by the team for this project.

## More documentation

[`docs/BRD.md`](./docs/BRD.md) · [`docs/PRD.md`](./docs/PRD.md) · [`docs/TDD.md`](./docs/TDD.md) · [`docs/DESIGN.md`](./docs/DESIGN.md) · [`docs/DECISIONS.md`](./docs/DECISIONS.md) (every design decision with its reason) · [`docs/DATA-SOURCES.md`](./docs/DATA-SOURCES.md) · [`docs/data-verification.md`](./docs/data-verification.md)
