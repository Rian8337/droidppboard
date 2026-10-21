# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A leaderboard website for experimental osu!droid performance points (pp). It is a pnpm workspace (Node 22) with three packages:

- `server/` (`droidppboard-server`): an Express 4 API in TypeScript, compiled to CommonJS in `server/dist`. It also serves the built client from `client/dist`.
- `client/` (`droidppboard-client`): a React 19 + Vite SPA that uses React Router, TanStack Query and CSS modules, with the React Compiler enabled through Babel.
- `modules/app-structures/`: shared TypeScript types (DB documents, API shapes, `PPVariant`, recalculation queue views). Both the server and the client import it as `app-structures` from source (`main: src/index.ts`), so it has no build step.

## Commands

Run these from the repo root after `pnpm install`. CI (`.github/workflows/ci.yml`) runs every one of them.

```bash
# Server
pnpm --filter droidppboard-server build      # tsc -> server/dist
pnpm --filter droidppboard-server test       # vitest, src/**/*.test.ts (co-located with sources)
pnpm start                                   # runs server/dist (needs a build and a .env first)

# Client
pnpm --filter droidppboard-client dev            # Vite dev server; proxies /api to localhost:3001
pnpm --filter droidppboard-client typecheck      # tsc -b
pnpm --filter droidppboard-client typecheck:tests
pnpm --filter droidppboard-client lint           # oxlint (type-aware, import/no-cycle is an error)
pnpm --filter droidppboard-client format         # oxfmt; format:check in CI
pnpm --filter droidppboard-client test           # vitest + jsdom, tests/**
pnpm --filter droidppboard-client test:e2e       # Playwright (desktop/tablet/phone projects)
pnpm --filter droidppboard-client build

# Server / app-structures formatting (Prettier, 4-space tabs)
pnpm run format-code-server
pnpm run format-code-app-structures
```

To run a single test file, pass its path: `pnpm --filter droidppboard-server exec vitest run --no-file-parallelism --maxWorkers=1 src/recalculation/weightedTotal.test.ts`. Use `-t "<name>"` to run one test by name. The client works the same way with paths under `tests/`.

Tests must run on a single worker (`--no-file-parallelism --maxWorkers=1`, and `--workers=1` for Playwright). The machine starves when tests run in parallel, so keep these flags on any vitest or Playwright command you write, including commands you hand to subagents.

E2E tests build their own production bundle in `--mode e2e` (`client/.env.e2e` supplies Cloudflare's test Turnstile key). The API is mocked by `client/e2e/mockApi.ts`. To install the browser: `pnpm --filter droidppboard-client exec playwright install chromium`.

## Server architecture

`server/src/index.ts` wires the app together. Routers are mounted under `/api/ppboard`, `/api/auth`, `/api/manage`, `/api/recalc` and `/api/skins`. Each router stacks its own rate limit, `requireAllowedOrigin` (for state-changing routers) and `sessionMiddleware`. Any other GET returns the SPA's `index.html`. On startup the server connects to the databases, initialises sessions, refreshes the cached top-pp lists (`Util.refreshPrototypeTopPP`), and starts the calculator-capacity refresh loop.

Data sources:
- **MongoDB**: there are two clusters, reached through the static `DatabaseManager`. `aliceDb` holds `prototypepp` (each player's per-variant profile, keyed by uid and `reworkType`), `playerskins`, `calculationsnapshots` and sessions. `elainaDb` holds the map whitelist. Each collection has a `*CollectionManager` under `database/managers/`.
- **Official osu!droid MySQL**: `database/official/index.ts` (a `mysql2` pool). It is used for accounts (`auth/OsuDroidAccounts`) and players' top scores (`recalculation/OfficialScores`).
- **Variant broker** (`clients/BrokerClient`): an external service that owns pp *variants*. It handles their visibility and permissions, admin grants and roles, and calculator builds and instance health, and it serves beatmap performance calculations. Requests to it act for a uid (`actingUid`), so the broker decides what each person can see. `/api/manage` mostly forwards to its admin API, which only accepts paths that pass `BrokerClient.isValidAdminPath`.
- **Score service** (`recalculation/ScoreServiceClient`): calculates a single online score in a given variant.

Variants: `droid-live` (`liveVariant`) and `droid-rebalance` (`masterVariant`) are special. Every stored profile entry keeps its `local` state (its own variant) and its `live` state, and every profile other than the master keeps a `master` state too. The leaderboard compares these states.

Recalculation (`server/src/recalculation/`):
- `instance.ts` builds the single process-wide `RecalculationQueue`, injecting its dependencies (clock, ids, limits from `RECALC_*` env vars, `calculateProfile`, the broker's healthy-instance count as per-variant capacity, and a `FullRunStore` over `prototypepp`). The queue lives in memory. A "full run" recalculates every profile of a variant, tracking a scan flag per profile so that it can resume.
- `ProfileCalculator.calculateProfile` fetches a player's top scores, looks up the beatmaps and calls the score service for each variant, then saves the profile along with `calculatorBuilds`. `ReusableCalculations` lets a calculation reuse states from stored profiles whose recorded build matches the variant's current `builtAt`, instead of recalculating them.
- Modules take a `deps` object (with defaults such as `defaultDeps`) so that tests can substitute fakes. Follow this pattern rather than mocking modules.

Auth: users log in with their osu!droid credentials and a Cloudflare Turnstile check. Sessions are stored in MongoDB (`auth/sessions.ts`, `SessionStore`) and read from a cookie by `sessionMiddleware`. Login has its own throttle (`LoginThrottle`).

Server env vars (read through `dotenv`): `ALICE_DB_KEY`, `ELAINA_DB_KEY`, `OFFICIAL_DB_*`, `DPP_BROKER_URL`/`DPP_BROKER_KEY`, `DPP_SCORE_SERVICE_URL`/`DPP_SCORE_SERVICE_KEY`, `DROID_API_KEY`, `OSU_API_KEY`, `DROID_SERVER_INTERNAL_KEY`, `SESSION_SECRET`, `TURNSTILE_SECRET_KEY`, `PORT` (default 3001), `SNAPSHOT_TTL_DAYS` (default 30), and `RECALC_MAX_ACTIVE_PER_PERSON` / `RECALC_ADD_COOLDOWN_SECONDS` / `RECALC_FINISHED_RETENTION_MINUTES`.

## Client architecture

- Routes are defined in `src/routing/routes.tsx`, with path builders in `paths.ts`. Most pages are scoped to a variant: `/v/:variant/...` (leaderboard, players, calculator, queue, info, admin tabs). `legacyRedirects.ts` maps the old site's URLs to new ones.
- `src/api/` holds one module per server area, built on `http.ts`. That module defines `ApiError` and normalises the broker's error shape (`{ error: { code, message } }`) and the server's (`{ message }`). Query keys are centralised in `queryKeys.ts`.
- Feature folders (`leaderboard/`, `profile/`, `calculator/`, `queue/`, `admin/`, `scores/`, `variant/`, `shell/`) build on the shared primitives in `components/`. Each component has its own `.module.css`.
- `VITE_TURNSTILE_SITE_KEY` is read at build time (for example from `client/.env.production.local`).
- Unit tests use MSW (`tests/mocks/handlers.ts`, `fixtures.ts`) and render through `tests/utils/renderWithProviders.tsx`, which provides a no-retry QueryClient and a MemoryRouter and mocks `GET /api/auth/me`.

## Conventions

- Name functions with verbs and variables with nouns.
- Comments and JSDoc are written in plain, full sentences that explain *why*. Match the existing comment density.
- Design specs and implementation plans live in `docs/superpowers/specs` and `docs/superpowers/plans`.
- Open PRs against the fork: `gh ... --repo Rian8337/droidppboard`.
