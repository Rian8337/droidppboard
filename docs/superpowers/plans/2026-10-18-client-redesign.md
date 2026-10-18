# Client Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace droidppboard's CRA client with a variant-first, mobile-first Vite/React 19 client in the reference site's look, plus the server endpoints it needs (variant list, per-variant calculator, "my score", expiring snapshots).

**Architecture:** The server keeps its Express routes and gains four `/api/ppboard` endpoints and a MongoDB snapshot collection. The client is rebuilt from scratch in `client/` (same workspace package name), organised by feature folder; all server data goes through TanStack Query hooks in `src/api/`; pages are tested with Testing Library against MSW, and key flows with Playwright against the built client with mocked routes. Old URLs redirect client-side.

**Tech Stack:** Vite 8, React 19 + React Compiler, TypeScript 7, React Router (current major), TanStack Query, CSS modules, react-markdown, an established DOM-to-image library, Vitest, Testing Library, jsdom, MSW, Playwright, oxlint, oxfmt. Server: Express, MongoDB, Vitest (unchanged stack).

**Spec:** `docs/superpowers/specs/2026-10-18-client-redesign-design.md`. Read it alongside this plan; it holds the layout, copy, and behaviour details tasks refer to by section name. The broker half is `~/Projects/dpp-processor-backend/docs/superpowers/plans/2026-10-18-client-redesign-broker.md` and is done first.

## Global Constraints

- Branch: `client-redesign` (already created; the spec is committed on it).
- **Tests run with a single worker**: Vitest `--no-file-parallelism --maxWorkers=1`, Playwright `--workers=1`. Put the flags in package scripts. Never run two test processes at once.
- **Naming:** functions and methods start with a verb (`fetchVariants`, `formatPp`); variables, constants, properties, and components are nouns (`variants`, `ScoreTable`); booleans may be predicates (`isOpen`, `canManage`, `hasMaster`).
- Match the streaming client's conventions (`~/Projects/osu-droid-streaming-client`): 4-space indent (oxfmt `tabWidth: 4`), CSS modules (`X.module.css` beside `X.tsx`), named exports, JSDoc on non-obvious exports.
- Versions: Vite 8, React 19, TypeScript 7, current majors of everything else (check with `pnpm view <pkg> version`; pnpm's `minimumReleaseAge` may need an exclude entry in `pnpm-workspace.yaml`, as the streaming client does). `@rian8337/osu-base` stays `4.0.0-beta.102`.
- Only osu!droid variants anywhere, **except** the Beatmap calculator tool's four: `droid-live`, `droid-rebalance`, `osu-live`, `osu-rebalance`. `droid-live` is never a pickable variant on the board; it is the baseline.
- Private variants never reach people who cannot see them (sidebar, tabs, queue, calculator, snapshots, redirects).
- Layout widths: phone `< 640px`, tablet `640–1023px`, desktop `>= 1024px`. Design at 390px first.
- Touch: no hover-only behaviour; under `(pointer: coarse)` clickable controls and rows are at least 44px tall.
- Colours (CSS custom properties in `src/styles/global.css`): `--bar #f06c9b`, `--bg #2b2b2b`, `--side #252525`, `--panel #313131`, `--input #363636`, `--line #3b3b3b`, `--accent #ff6ba0`, `--btn #d8336d`, `--btn2 #5a2a3a`, `--text #ececec`, `--muted #9b9b9b`, `--up #6fd36a`, `--down #ff4d5e`, `--warn #ff3b4a`. Dark only, `color-scheme: dark`. Font: Torus (weights per the streaming client's `src/index.css`).
- The approved mockup is `.superpowers/brainstorm/321859-1792298844/content/style-v2.html` (git-ignored, local); open it for spacing and density.
- Use libraries for Markdown (`react-markdown`, raw HTML off) and DOM-to-image; do not hand-roll either.
- Copy rules: osu!droid says **Tap**, not Speed; full-run wording exactly as the spec's "Queue tab" section.

## Review Focus

1. Someone who cannot see a private variant opens a snapshot or calculator link naming it → "not found", identical to an unknown id (server test in Task 4, client test in Task 15).
2. `droid-live` or an osu! variant requested through a board route (leaderboard, profile, top plays, calculator with scope `variant`, queue) → 404 "Variant not found" (server tests in Tasks 1 and 2).
3. A snapshot older than its expiry is requested before MongoDB's TTL sweep removes it → treated as expired (410), not served (server test in Task 4).
4. Logging out while on a private variant's page → its data is dropped from the cache and the page shows not found, with no flash of private data (client test in Task 7).
5. A variant description containing raw HTML such as `<img onerror>` or `<script>` → shown as text, never executed (client test in Task 9).

---

## Part A: Server

### Task 1: Variant list for the board

**Files:**
- Modify: `modules/app-structures/src/structures/PPVariant.ts`
- Modify: `server/src/utils/visibleVariant.ts`, `server/src/utils/visibleVariant.test.ts`
- Create: `server/src/routes/api/ppboard/get-variants.ts`, `server/src/routes/api/ppboard/get-variants.test.ts`
- Modify: `server/src/index.ts` (mount), `server/src/routes/api/ppboard/variantGate.test.ts` (fixture fields)

**Interfaces:**
- Consumes: `BrokerClient.getVariants(actingUid?)` (now returns the broker's `public`, `builtAt`, `calculatorVersion` too).
- Produces:
  - `PPVariant` gains `public: boolean`, `builtAt: string | null`, `calculatorVersion: string | null`.
  - `liveVariantName = "droid-live"` exported from `visibleVariant.ts`.
  - `listVisibleDroidVariants(actingUid?)` now also drops `droid-live` (so `resolveVisibleVariant` answers `"notFound"` for it).
  - `GET /api/ppboard/variants` → `200 PPVariant[]` (visible droid variants minus `droid-live`, sorted by name), `503 { message }` when the broker is unreachable. `Cache-Control: no-store`. Uses `res.locals.uid` like other ppboard routes.

- [ ] **Step 1: Write failing tests**

`visibleVariant.test.ts`: `it("leaves out droid-live")` — broker returns `droid-live`, `droid-rebalance`, `osu-rebalance`, `flowaim` (droid) → `["droid-rebalance", "flowaim"]`; `it("answers notFound for droid-live")` — `resolveVisibleVariant("droid-live")` → `"notFound"`.
`get-variants.test.ts` (same express-on-a-port pattern as `variantGate.test.ts`, `BrokerClient` mocked): returns the filtered list with `public`/`builtAt` passed through; passes the session uid as acting uid; `503` when `getVariants` returns `null`.
`variantGate.test.ts`: add `it("answers 404 for droid-live on the leaderboard")`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter droidppboard-server exec vitest run --no-file-parallelism --maxWorkers=1 src/utils src/routes/api/ppboard`
Expected: FAIL.

- [ ] **Step 3: Implement** the type fields, the filter, and the route (mounted at `ppboardRouter.use("/variants", getVariants)`; rate limit like the other ppboard routes). Fix fixtures that build `PPVariant` literals.

- [ ] **Step 4: Run the tests** (Step 2 command) → PASS. Then the whole server suite (`pnpm --filter droidppboard-server exec vitest run --no-file-parallelism --maxWorkers=1`; the recalc routes also use these helpers, so `droid-live` can no longer be queued — update any recalc test that expected it) → PASS, and `pnpm --filter droidppboard-server build` → no errors.

- [ ] **Step 5: Change the test script to single-worker** in `server/package.json`: `"test": "vitest run --no-file-parallelism --maxWorkers=1"`.

- [ ] **Step 6: Commit** — `git commit -m "Add the board's variant list and hide droid-live from it"`

### Task 2: Per-variant calculator route

**Files:**
- Create: `modules/app-structures/src/structures/Calculation.ts` (export from `index.ts`)
- Create: `server/src/calculation/calculatorVariants.ts`, `server/src/calculation/calculationRequest.ts`, `server/src/calculation/calculateScore.ts` (+ `.test.ts` for each)
- Create: `server/src/routes/api/ppboard/calculate.ts`, `server/src/routes/api/ppboard/calculate.test.ts`
- Delete: `server/src/routes/api/ppboard/calculate-beatmap.ts` and its mount in `server/src/index.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Produces (in `app-structures`):
  ```ts
  export type CalculationScope = "variant" | "tool";
  export interface CalculationParameters {
      readonly beatmap: { readonly id: number } | { readonly file: true };
      readonly mods: SerializedMod[];          // from @rian8337/osu-base
      readonly combo?: number; readonly accuracy?: number; readonly totalScore?: number;
      readonly n100?: number; readonly n50?: number; readonly nmiss?: number;
      readonly sliderTicksMissed?: number; readonly sliderEndsDropped?: number;
  }
  export interface CalculationOutcome {
      readonly difficulty: Record<string, number>;
      readonly performance: Record<string, number>;
      readonly strainChart: string | null;      // base64 PNG
  }
  export interface CalculationResponse {
      readonly scope: CalculationScope;
      readonly variant: string;
      readonly baseline: string | null;         // the live variant compared against, or null
      readonly calculatorVersion: string | null;
      readonly calculatedAt: string;            // ISO
      readonly beatmap: { readonly id: number | null; readonly hash: string; readonly title: string;
          readonly maxCombo: number; readonly cs: number; readonly ar: number; readonly od: number; readonly hp: number };
      readonly parameters: CalculationParameters;
      readonly result: CalculationOutcome;
      readonly baselineResult: CalculationOutcome | null;
      readonly ignoredMods: string[];           // acronyms not applicable to an osu!standard variant
  }
  ```
- Produces (server):
  - `toolVariantNames = ["droid-live", "droid-rebalance", "osu-live", "osu-rebalance"] as const`.
  - `getBaselineVariant(scope: CalculationScope, variant: string): string | null` — scope `variant` → `"droid-live"`; scope `tool`: `droid-rebalance → droid-live`, `osu-rebalance → osu-live`, live variants → `null`.
  - `parseCalculationRequest(body: unknown, file: UploadedFile | undefined): { scope; variant; parameters; beatmapInput } | { error: string }` — validates with zod; `mods` arrives as a JSON string of `SerializedMod[]`; `beatmap` is a link or ID (last path segment, as the old route) unless `beatmapfile` (`.osu`, ≤ 1 MB as today) is given.
  - `calculateScore(input: { scope; variant; parameters; osuFile: string; beatmapId: number | null; actingUid?: number }): Promise<CalculationResponse | { error: string; status: number }>` — decodes the file for title/hash (MD5 of the file content)/max combo/stats after mods, calls the broker's `POST /variants/:variant/performance` with `{ beatmap: { file }, mods, score, strainChart: true }` for the variant and, if any, the baseline, **sending `X-Acting-Uid` when `actingUid` is set** (private variants need it; reuse or extend `BrokerClient`). For osu! variants, converts mods with `@rian8337/osu-base` and lists dropped acronyms in `ignoredMods`.
  - `POST /api/ppboard/calculate` (multipart, as the old route) → `200 CalculationResponse`; `400 { message }` invalid input; `404 { message: "Variant not found" }` when scope `variant` and `resolveVisibleVariant` says notFound, or scope `tool` and the name is not one of the four; `503` broker unreachable. Rate limit `Util.createRateLimit(5, 1000)` as today.

- [ ] **Step 1: Write failing unit tests**

`calculatorVariants.test.ts`: the baseline table above, case by case.
`calculationRequest.test.ts`: accepts an ID and a full link; accepts an uploaded `.osu`; rejects a non-`.osu` file (`"Invalid file uploaded"`), a non-positive ID, malformed `mods` JSON, negative counts; passes `totalScore`, `sliderTicksMissed`, `sliderEndsDropped` through.
`calculateScore.test.ts` (broker fetch mocked): sends the score fields under the broker's names (`n100`, `n50`, `nmiss`, `combo`, `totalScore`, `sliderTicksMissed`, `sliderEndsDropped`; `n300` derived from accuracy when counts are absent, as the old route does with `Accuracy.fromPercent`); calculates baseline only when there is one; sends `X-Acting-Uid`; reports `ignoredMods` for an osu! variant given a droid-only mod.

- [ ] **Step 2: Write failing route tests in `calculate.test.ts`**

`it("answers 404 for droid-live with scope variant")`, `it("answers 404 for a private variant the person cannot see")`, `it("accepts osu-rebalance with scope tool and compares it to osu-live")`, `it("answers 404 for flowaim with scope tool")`, `it("returns no baseline for droid-live with scope tool")`.

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm --filter droidppboard-server exec vitest run --no-file-parallelism --maxWorkers=1 src/calculation src/routes/api/ppboard/calculate.test.ts` → FAIL.

- [ ] **Step 4: Implement** the three modules and the route; mount at `ppboardRouter.use("/calculate", calculate)`; delete `calculate-beatmap.ts` and its mount.

- [ ] **Step 5: Run the tests** (Step 3 command) → PASS; `pnpm --filter droidppboard-server build` → no errors.

- [ ] **Step 6: Commit** — `git commit -m "Calculate scores per variant against live"`

### Task 3: "Calculate my score on this beatmap"

**Files:**
- Create: `server/src/routes/api/ppboard/calculate-my-score.ts`, `.test.ts`
- Modify: `server/src/calculation/calculateScore.ts` (export the shared "build a CalculationResponse from two outcomes" part), `server/src/index.ts`

**Interfaces:**
- Consumes: `ScoreServiceClient.getOnlineScore(uid, hash, variant, actingUid): Promise<OnlineScoreOutcome>` (already sends `best=true`, i.e. best **by pp**; keep it), `parseCalculationRequest`, `getBaselineVariant`.
- Produces: `POST /api/ppboard/calculate/my-score` (multipart: `scope`, `variant`, `beatmap` or `beatmapfile`) → `200 CalculationResponse` whose `parameters` are the stored score's mods and counts; `401 { message: "Not logged in" }`; `404 { message: "You have no score on this beatmap" }` when the outcome is `skip` for lack of a score; `404 "Variant not found"` as Task 2 (and for osu! variants: scope `tool` with `osu-live`/`osu-rebalance` → 404, scores are osu!droid scores); `503` on `error`.

- [ ] **Step 1: Write failing route tests**: requires login; looks up by the MD5 of the beatmap file and the session uid, for the variant and then the baseline; asserts `best=true` reaches the score service (mock `fetch` and inspect the URL); maps a no-score outcome to the 404 message above; refuses osu! variants.
- [ ] **Step 2: Run** `pnpm --filter droidppboard-server exec vitest run --no-file-parallelism --maxWorkers=1 src/routes/api/ppboard/calculate-my-score.test.ts` → FAIL.
- [ ] **Step 3: Implement** (mounted before `/calculate` so the more specific path wins, or as a sub-route of it). Map the online score response's score statistics into `CalculationParameters` so "Load data from result" works.
- [ ] **Step 4: Run** → PASS; build → no errors.
- [ ] **Step 5: Commit** — `git commit -m "Calculate a person's best score on a beatmap"`

### Task 4: Expiring calculation snapshots

**Files:**
- Create: `server/src/database/managers/aliceDb/CalculationSnapshotCollectionManager.ts`
- Modify: `server/src/database/managers/AliceDBCollection.ts`, `server/src/database/managers/DatabaseManager.ts` (create the TTL index at init)
- Create: `server/src/routes/api/ppboard/snapshots.ts`, `.test.ts`
- Modify: `modules/app-structures/src/structures/Calculation.ts`, `server/src/index.ts`

**Interfaces:**
- Produces:
  - `CalculationSnapshot { readonly id: string; readonly createdAt: string; readonly expiresAt: string; readonly calculation: CalculationResponse }` in `app-structures`.
  - `CalculationSnapshotCollectionManager`: `insertSnapshot(snapshot): Promise<void>`, `findSnapshot(id: string): Promise<CalculationSnapshot | null>`, `ensureExpiryIndex(): Promise<void>` (TTL index on `expiresAt` stored as a `Date`, `expireAfterSeconds: 0`). Collection `calculationsnapshots`.
  - `POST /api/ppboard/snapshots` — same multipart fields as `/calculate`, plus optional `source: "my-score"`; login required (`401`); **the server recalculates** (Task 2's `calculateScore`, or Task 3's path for `my-score`) and stores that result, so a snapshot can never carry client-made numbers; → `201 { id, expiresAt }`. Rate limit `Util.createRateLimit(5, 60_000)` per person (key by session uid). Expiry: `SNAPSHOT_TTL_DAYS` env var, default `30`. IDs: 10-character URL-safe random (`crypto.randomBytes` → base64url).
  - `GET /api/ppboard/snapshots/:id` → `200 CalculationSnapshot`; `404 { message: "Snapshot not found" }` for unknown ids **and** for snapshots whose variant the requester cannot see (scope `variant` → `resolveVisibleVariant`; scope `tool` variants are always readable); `410 { message: "This snapshot has expired" }` when `expiresAt <= now` but the document is still there.

- [ ] **Step 1: Write failing route tests** (collection manager mocked): creation needs login; the stored calculation is the server's recalculation, not anything in the body; `expiresAt` is 30 days after creation by default and follows `SNAPSHOT_TTL_DAYS`; reading a private variant's snapshot as someone who cannot see it → 404 with the same body as an unknown id; reading an expired one → 410; the creation rate limit answers 429 on the sixth request in a minute.
- [ ] **Step 2: Run** `pnpm --filter droidppboard-server exec vitest run --no-file-parallelism --maxWorkers=1 src/routes/api/ppboard/snapshots.test.ts` → FAIL.
- [ ] **Step 3: Implement**; call `ensureExpiryIndex()` once in `DatabaseManager.init`. Document `SNAPSHOT_TTL_DAYS` wherever the server's env variables are documented (README or `.env` example).
- [ ] **Step 4: Run** → PASS; build → no errors.
- [ ] **Step 5: Commit** — `git commit -m "Store expiring calculation snapshots"`

---

## Part B: Client foundation

### Task 5: Scaffold the new client

**Files:**
- Delete: everything in `client/` except what is moved below (CRA `public/`, `src/`, `react-app-env.d.ts`, `setupTests.ts`, `reportWebVitals.ts`, Exo fonts, `background.jpg`, `icons/header.png`). Keep `client/src/icons/mods/*.png` by moving them to `client/public/icons/mods/`.
- Create: `client/package.json` (name stays `droidppboard-client`; `"type": "module"`), `client/index.html`, `client/vite.config.ts`, `client/vitest.config.mts`, `client/tsconfig.json`, `client/tsconfig.app.json`, `client/tsconfig.node.json`, `client/tsconfig.test.json`, `client/.oxlintrc.json`, `client/.oxfmtrc.json`, `client/src/main.tsx`, `client/src/App.tsx`, `client/src/styles/global.css`, `client/public/fonts/Torus-*.otf` (all six from `~/Projects/osu-droid-streaming-client/public/fonts/`), `client/public/favicon.ico` (keep the old one), `client/tests/setup.ts`, `client/tests/App.test.tsx`
- Copy missing mod icons from `~/Projects/osu-droid-streaming-client/public/icons/` into `client/public/icons/mods/`.
- Modify: `server/src/index.ts` and `Util.getFrontendPath()` callers: serve `client/dist` instead of `client/build` (static and the `*` fallback).
- Modify: root `package.json` `format-code-client` → `pnpm --filter droidppboard-client format`.

**Interfaces:**
- Produces: scripts in `client/package.json`: `dev` (`vite`), `build` (`tsc -b && vite build`), `preview`, `typecheck` (`tsc -b`), `typecheck:tests` (`tsc -p tsconfig.test.json`), `lint` (`oxlint`), `format` (`oxfmt`), `format:check` (`oxfmt --check`), `test` (`vitest run --no-file-parallelism --maxWorkers=1`), `test:e2e` (`playwright test --workers=1`, added in Task 20). Vite dev server proxies `/api` → `http://localhost:3001`. Env: `VITE_TURNSTILE_SITE_KEY` (was `REACT_APP_TURNSTILE_SITE_KEY`).
- `App` renders a placeholder shell `<main>` with the text "PP Board" until Task 8.

- [ ] **Step 1:** Remove the CRA client files and move the mod icons as listed. Copy configs from the streaming client and adapt: no `base` path; React Compiler via `@rolldown/plugin-babel` + `reactCompilerPreset()` as its `vite.config.ts`; TypeScript 7 (`typescript@^7`); vitest `environment: "jsdom"`, `setupFiles: ["./tests/setup.ts"]`, `include: ["tests/**/*.{test,spec}.{ts,tsx}"]`, **no** `maxWorkers: "25%"` (the script sets one worker); `tests/setup.ts` imports `@testing-library/jest-dom/vitest`.
- [ ] **Step 2:** Write `src/styles/global.css` with the Global Constraints tokens, Torus `@font-face` rules (paths `/fonts/...`), box-sizing and form-font resets from the streaming client's `index.css`, `body { background: var(--bg); color: var(--text); font-family: Torus, sans-serif; }`, and `@media (pointer: coarse)` minimum heights via a `--touch-target: 44px` token.
- [ ] **Step 3: Write `tests/App.test.tsx`**: `it("renders")` — `render(<App />)`; `expect(screen.getByText("PP Board")).toBeInTheDocument()`.
- [ ] **Step 4:** `pnpm install` at the root, then run `pnpm --filter droidppboard-client test` → PASS; `pnpm --filter droidppboard-client build` → `client/dist/index.html` exists; `pnpm --filter droidppboard-client lint` and `format:check` → clean; `pnpm --filter droidppboard-server build` → no errors.
- [ ] **Step 5: Commit** — `git commit -m "Scaffold the Vite client"`

### Task 6: Shared UI primitives

**Files:**
- Create in `client/src/components/`: `Button.tsx`, `IconButton.tsx`, `TextField.tsx`, `Select.tsx`, `Checkbox.tsx`, `Dialog.tsx`, `Menu.tsx`, `Tabs.tsx`, `SegmentedControl.tsx`, `Tooltip.tsx`, `DataTable.tsx`, `Pill.tsx`, `ProgressBar.tsx`, `Markdown.tsx`, `EmptyState.tsx`, `ErrorMessage.tsx`, `CopyButton.tsx`, each with a `.module.css`
- Create: `client/src/hooks/useBreakpoint.ts`, `client/src/hooks/useLocalStorage.ts`
- Test: `client/tests/components/*.test.tsx`, `client/tests/hooks/*.test.ts`

**Interfaces:**
- Produces:
  - `Button({ variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "small" | "normal"; ...button props })`.
  - `Dialog({ title: string; isOpen: boolean; onClose: () => void; children })` — native `<dialog>` with Escape to close, focus trapped, body scroll inside, max size fits the viewport.
  - `Menu({ trigger: ReactNode; items: { label: string; icon?: ReactNode; tone?: "danger"; onSelect: () => void }[] })` — opens on click/tap, closes on outside press and Escape.
  - `Tabs({ tabs: { id: string; label: string; icon?: ReactNode; to: string }[]; activeId: string })` — links, horizontally scrollable on small widths.
  - `Tooltip({ content: string; children })` — shows on hover **and** on tap/focus.
  - `DataTable<Row>({ columns: Column<Row>[]; rows: Row[]; rowKey: (row: Row) => string; sort?: SortState; onSortChange?: (sort: SortState) => void; pinnedColumnIds?: string[]; onRowClick?: (row: Row) => void; emptyText: string })` with `Column<Row> = { id: string; header: string; render: (row: Row) => ReactNode; isSortable?: boolean; align?: "left" | "right" }`, `SortState = { columnId: string; direction: "ascending" | "descending" }`. Pinned columns use `position: sticky`; the table scrolls horizontally inside its wrapper.
  - `Markdown({ source: string })` — `react-markdown` with `skipHtml`, links open in a new tab with `rel="noopener noreferrer"`.
  - `useBreakpoint(): "phone" | "tablet" | "desktop"` (from `matchMedia` with the Global Constraints widths).
  - `useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]` — every read and write in try/catch; falls back to memory.

- [ ] **Step 1: Write failing tests**: `Dialog` closes on Escape and calls `onClose`; `Menu` opens on click, closes on outside press, calls `onSelect`; `Tooltip` shows its content after a tap (fire `pointerdown`/`click`, not just hover); `DataTable` calls `onSortChange` with the toggled direction when a sortable header is clicked, renders `emptyText` with no rows; `Markdown` renders `**bold**` as `<strong>` and `<script>alert(1)</script>` / `<img src=x onerror=alert(1)>` produce no `script`/`img` elements; `useBreakpoint` returns `"tablet"` when `matchMedia` reports 768px; `useLocalStorage` survives a throwing `localStorage`.
- [ ] **Step 2: Run** `pnpm --filter droidppboard-client test` → FAIL.
- [ ] **Step 3: Implement** the primitives (icons from one icon library; Font Awesome as the streaming client, or another — one only).
- [ ] **Step 4: Run** → PASS; lint clean.
- [ ] **Step 5: Commit** — `git commit -m "Add the client's UI primitives"`

### Task 7: API layer, auth, and mocks

**Files:**
- Create: `client/src/api/http.ts`, `client/src/api/queryClient.ts`, `client/src/api/queryKeys.ts`, `client/src/api/auth.ts`, `client/src/api/variants.ts`
- Create: `client/tests/mocks/fixtures.ts`, `client/tests/mocks/handlers.ts`, `client/tests/mocks/server.ts`, `client/tests/utils/renderWithProviders.tsx`
- Modify: `client/tests/setup.ts` (start/reset/stop MSW), `client/src/main.tsx` (QueryClientProvider)
- Test: `client/tests/api/http.test.ts`, `client/tests/api/auth.test.tsx`

**Interfaces:**
- Produces:
  - `requestJson<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown | FormData): Promise<T>` — throws `ApiError { status: number; message: string; retryAfterSeconds?: number }` (message from the JSON `message`, or "Could not reach the server" for status 0; reads `Retry-After` on 429). Port the error wording from `client/src/utils/manageApi.ts` and `recalcApi.ts` (old files, deleted in Task 5 — read them from `git show master:client/src/utils/...`).
  - `queryKeys` — one factory object (`queryKeys.me()`, `queryKeys.variants()`, `queryKeys.leaderboard(variant, page, search)`, …); later tasks add entries here.
  - `useMe(): UseQueryResult<Me | null>` with `Me { uid: number; username: string; role: "admin" | "manager" | null; grants: string[] }` (`GET /api/auth/me`; 401 → `null`).
  - `useLogin()` mutation (`POST /api/auth/login` `{ username, password, turnstileToken }`), `useLogout()` mutation (`POST /api/auth/logout`). **On success both call `queryClient.clear()` then refetch `me`**, so nothing seen as one person survives as another.
  - `useVariants(): UseQueryResult<PPVariant[]>` (`GET /api/ppboard/variants`).
  - `fixtures`: `droidRebalance`, `flowaim` (private, `builtAt` older), `readingVariant`, `adminMe`, `managerMe` (grant `flowaim`), `plainMe`, plus builders used by later tasks; `handlers` cover every endpoint used by later tasks, added as they come.
  - `renderWithProviders(ui, { route?: string; me?: Me | null })` — fresh `QueryClient` (no retries), `MemoryRouter` at `route`, MSW `me` override.

- [ ] **Step 1: Write failing tests**: `requestJson` maps a 429 with `Retry-After: 12` to `retryAfterSeconds: 12`; a network failure to status 0 with "Could not reach the server". `auth.test.tsx` — `it("drops private data on logout")`: render a probe component that shows `useVariants()` names as `managerMe` (handler returns `flowaim` only when logged in), log out via `useLogout`, assert `flowaim` disappears **without** ever being shown after logout resolves (handler for variants after logout returns only public ones).
- [ ] **Step 2: Run** `pnpm --filter droidppboard-client test` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the client's API layer and test mocks"`

### Task 8: Shell, routes, and legacy redirects

**Files:**
- Create: `client/src/shell/AppLayout.tsx`, `TopBar.tsx`, `AccountMenu.tsx`, `Sidebar.tsx`, `VariantList.tsx`, `sortVariants.ts` (+ `.module.css`)
- Create: `client/src/routing/routes.tsx`, `client/src/routing/paths.ts`, `client/src/routing/legacyRedirects.ts`, `client/src/pages/NotFoundPage.tsx`
- Modify: `client/src/App.tsx`
- Test: `client/tests/shell/*.test.tsx`, `client/tests/routing/legacyRedirects.test.ts`, `client/tests/shell/sortVariants.test.ts`

**Interfaces:**
- Produces:
  - `paths` helpers: `getVariantPath(variant: string, tab: VariantTab = "leaderboard")`, `getProfilePath(variant: string, uid: number)`, `getSnapshotPath(scope: CalculationScope, variant: string, id: string)`; `type VariantTab = "info" | "leaderboard" | "top-plays" | "queue" | "calculator" | "admin"`. Routes per the spec's table: `/v/:variant/:tab`, `/v/:variant/players/:uid`, `/v/:variant/calculator/s/:id`, `/calculate`, `/calculate/s/:id`, `/whitelist`, `/score-multiplier`, `/about`, `/login`, `/admin/keys`, `/admin/roles`, `/admin/variants`, `/admin/variants/:name`, `/skin/list`, `/skin/:discordid/:name`, `/match_history/:matchid`; `/` → `/v/droid-rebalance/leaderboard`.
  - `mapLegacyPath(pathname: string): string | null` — `/prototype/:type` and `/prototype/leaderboard/:type` → leaderboard; `/prototype/top-plays/:type` → top plays; `/prototype/profile/:uid/:type` → profile; `/prototype/queue` → `droid-rebalance` queue; `/prototype/calculate` → `droid-rebalance` calculator; `/manage` and `/manage/users` → `/admin/roles`; `/manage/keys` → `/admin/keys`; `/manage/variants/:name` → `/admin/variants/:name`; anything else `null`. A catch-all route applies it with `<Navigate replace>`; segments are decoded and re-encoded.
  - `sortVariants(variants: PPVariant[]): PPVariant[]` — `droid-rebalance` first, then newest `builtAt` first, `null` last, ties by name.
  - `AppLayout` — top bar + sidebar + `<Outlet>`; sidebar state: open by default on desktop, closed on tablet/phone; on tablet it overlays at its normal width, on phone at full width below the bar; picking a variant closes it on tablet/phone. Toggle button shows ✕ when open and ☰ when closed (accessible names "Close menu" / "Open menu").
  - `Sidebar` — per the spec's "Shell → Sidebar": version line (`import.meta.env` version from `package.json` via Vite `define`) and Issue tracker link `https://github.com/Rian8337/droidppboard/issues`; "Search variants" filter (title or name, case-insensitive); entries with dot, title-or-name, "<name> | Last updated: <relative time>" (omit the time when `builtAt` is null), pin icon for `droid-rebalance`, globe icon with `Tooltip` "Private variant" when `public` is false; Tools (Beatmap calculator, Whitelist, Score multiplier sample); Donate <3 → `/about`; "osu!droid PP Project Site · © <year> Rian8337".
  - `TopBar` — title per spec; Discord button (link from the old `components/DiscordServer.tsx`, read via `git show master:client/src/components/DiscordServer.tsx`); `AccountMenu`: avatar `https://osudroid.moe/user/avatar?id=<uid>` + username (username hidden on phone) + chevron, `Menu` items Admin (admins only, → `/admin/keys`) and Log out (`tone: "danger"`), logout error shown in the menu; logged out → "Log in" button linking to `/login` with `state.from` = current path + search.

- [ ] **Step 1: Write failing tests**: `legacyRedirects.test.ts` — a table test over every mapping above (`it.each`) plus `null` for `/v/x/leaderboard`; `sortVariants.test.ts` — pinned first, then by `builtAt` desc, nulls last; `Sidebar.test.tsx` — search filters by title and name, private variant shows the globe with "Private variant" tooltip on tap, choosing a variant on a phone width closes the drawer (mock `useBreakpoint`); `TopBar.test.tsx` — logged out shows "Log in" whose link state carries the current path; admin sees Admin in the menu, manager does not; Log out calls the logout endpoint.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**; variant pages render a placeholder until Task 9.
- [ ] **Step 4: Run** → PASS; build and lint clean.
- [ ] **Step 5: Commit** — `git commit -m "Add the shell, routes, and legacy redirects"`

---

## Part C: Variant pages

### Task 9: Variant page, description, tabs, Info tab

**Files:**
- Create: `client/src/variant/VariantPage.tsx`, `VariantDescription.tsx`, `VariantTabs.tsx`, `InfoTab.tsx`, `permissions.ts`, `useCurrentVariant.ts` (+ CSS)
- Test: `client/tests/variant/*.test.tsx`, `client/tests/variant/permissions.test.ts`

**Interfaces:**
- Consumes: `useVariants`, `useMe`, `paths`.
- Produces:
  - `useCurrentVariant(): { variant: PPVariant | undefined; isLoading: boolean }` — from the `:variant` param, matched by name or alias against `useVariants()`. Unknown/invisible → `VariantPage` renders `NotFoundPage` with "Variant not found".
  - `canManageVariant(me: Me | null, variantName: string): boolean` — admin, or manager whose `grants` include the name. `isAdmin(me: Me | null): boolean`.
  - `VariantDescription({ description: string | null })` — Markdown; collapsed to the first block (first paragraph or heading plus following paragraph, whichever the builder finds reads best; it must match the Admin editor's preview, so export `getCollapsedDescription(source: string): string`); "Show more" / "Show less" expands in place; no button when collapsed equals full.
  - `VariantTabs` — order Info, Leaderboard, Top plays, Queue, Calculator, Admin on desktop; on phone Leaderboard first and Info last; Admin only when `canManageVariant`.
  - `InfoTab` — internal name, aliases, last updated (absolute UTC, `YYYY-MM-DD HH:mm UTC`), calculator version (omitted when null), availability; then the fixed help block (copy per spec "Info tab"; links to this variant's Leaderboard and Queue tabs; Discord link).

- [ ] **Step 1: Write failing tests**: `permissions.test.ts` — admin anywhere; manager only on granted; grant without role → false; `null` → false. `VariantDescription` — Show more reveals the rest and Show less hides it; raw HTML in the description renders as nothing executable (Review Focus 5: assert no `img`/`script` element and no `onerror` attribute in the DOM). `VariantPage` — unknown variant shows "Variant not found"; Admin tab visible for `managerMe` on `flowaim`, not on `droid-rebalance`; phone tab order starts with Leaderboard. `InfoTab` — shows `builtAt` as `2026-10-11 13:16 UTC` for `2026-10-11T13:16:00.000Z`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the variant page, description, and Info tab"`

### Task 10: Leaderboard tab

**Files:**
- Create: `client/src/api/leaderboard.ts`, `client/src/leaderboard/LeaderboardTab.tsx`, `LeaderboardRows.tsx` (+ CSS)
- Create: `client/src/components/Paging.tsx`, `client/src/components/CountryFlag.tsx`
- Test: `client/tests/leaderboard/LeaderboardTab.test.tsx`

**Interfaces:**
- Consumes: `GET /api/ppboard/prototype/getleaderboard?type=<variant>&page=<n>&query=<search>` → `PrototypeLeaderboardResponse<IPrototypePP[]>` (unchanged server route; 50 rows per page).
- Produces: `useLeaderboard(variant: string, page: number, search: string)`; `LeaderboardTab` — toolbar "Search player" (debounced 300ms) and "Open my profile" (logged in; → `getProfilePath(variant, me.uid)`); table columns Rank, Player (flag + name), Live pp, Local pp (bold), Difference (green/red, signed, one decimal), Master pp only when variant ≠ `droid-rebalance` and the row has it; **no rank change, no sortable headers**; rank = `(page - 1) * 50 + index + 1`; phone renders `LeaderboardRows` (stacked: rank, player, local pp large right; live pp and difference beneath); tablet/desktop render `DataTable`; row click → profile; `Paging` below.

- [ ] **Step 1: Write failing tests**: renders rows from the fixture with signed coloured differences; rank on page 2 starts at 51; Master pp column only for a non-`droid-rebalance` variant; typing a search triggers a request with `query`; phone width renders stacked rows; clicking a row navigates to the profile path; no header is a sort button.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the leaderboard tab"`

### Task 11: Score table logic

**Files:**
- Create: `client/src/scores/scoreColumns.tsx`, `scoreSorting.ts`, `rankChanges.ts`, `modFilter.ts`, `scoreCsv.ts`, `ScoreTable.tsx`, `ScoreToolbar.tsx`, `ColumnPicker.tsx` (+ CSS)
- Test: `client/tests/scores/*.test.ts(x)`

**Interfaces:**
- Consumes: `PrototypePPEntry` (`live`, `local`, optional `master`: each `{ difficulty, performance }`; plus `hit300/100/50`, `miss`, `combo`, `maxCombo`, `accuracy`, `mods`, `title`, `circleSize`, `approachRate`, `overallDifficulty`, …; read `modules/app-structures/src/structures/PrototypePPEntry.ts`, `PPEntry.ts`, `ScorePrototypeState.ts` for exact names), `DataTable`, `ModPicker` (Task 13; until then the toolbar's mod filter slot renders nothing, and Task 13 wires it).
- Produces:
  - `scoreColumns: ScoreColumn[]` with `ScoreColumn = Column<ScoreRow> & { isDefaultVisible: boolean; csvValue: (row: ScoreRow) => string | number }`, ids and order: `rank`, `player` (only when `showPlayer`), `map`, `live`, `local`, `difference`, `relativeDifference`, `starRating`, `starRatingDifference`, `mods`, `accuracy`, `combo`, `n100`, `n50`, `miss`, `cs`, `ar`, `od`, then the per-skill difficulty and pp, hit window, unstable-rate, speed note count, and tap-penalty values the old `components/PlayList.tsx` shows (`git show master:client/src/components/PlayList.tsx`). Default-visible: `rank` through `od`.
  - `ScoreRow = PrototypePPEntry & { rankChange: number; username?: string; uid?: number }`.
  - `addRankChanges(scores: PrototypePPEntry[]): ScoreRow[]` — position by live pp vs by local pp (1-based); `rankChange = livePosition - localPosition` (positive = moved up).
  - `sortScores(rows: ScoreRow[], sort: SortState): ScoreRow[]` — stable; default `{ columnId: "local", direction: "descending" }`.
  - `filterScores(rows: ScoreRow[], filter: { search: string; modAcronyms: string[] }): ScoreRow[]` — map title contains search (case-insensitive); a score matches when it has **every** selected acronym, ignoring mod settings.
  - `buildScoresCsv(rows: ScoreRow[], columns: ScoreColumn[]): string` — header row of column headers, RFC 4180 quoting; `downloadScoresCsv(rows, columns, fileName)`.
  - `ScoreTable({ scores: PrototypePPEntry[] | ScoreRow[]; showPlayer?: boolean; storageKey: string })` — toolbar (Search map, mod filter, Columns, Export to CSV), `DataTable` with every column sortable and `rank` + `map` pinned; column visibility via `useLocalStorage(storageKey)`; full combo highlighted green, non-zero misses red, positive/negative differences green/red.

- [ ] **Step 1: Write failing tests**: `addRankChanges` on three scores whose live order differs from local order gives the expected signed changes; `sortScores` ascending/descending on `difference` and stability on ties; `filterScores` — `["HD","DT"]` matches a `HDDT` score and a `HDDTHR` score but not `HD`; a Custom Speed score matches `["CS"]` regardless of its rate; `buildScoresCsv` quotes a title containing a comma and a quote; `ScoreTable` hides a column after unticking it in Columns and remembers it across remounts (same `storageKey`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the shared score table"`

### Task 12: Player profile and Top plays tab

**Files:**
- Create: `client/src/api/profile.ts`, `client/src/api/topPlays.ts`, `client/src/profile/ProfilePage.tsx`, `ProfileHeader.tsx`, `client/src/topPlays/TopPlaysTab.tsx` (+ CSS)
- Test: `client/tests/profile/ProfilePage.test.tsx`, `client/tests/topPlays/TopPlaysTab.test.tsx`

**Interfaces:**
- Consumes: `GET /api/ppboard/prototype/getuserprofile?uid=<uid>&type=<variant>` (`PrototypeProfileResponse`-style body; read the route), `GET /api/ppboard/prototype/gettopplays?type=<variant>&mods=<acronyms>` (mods as the server parses them with `ModUtil.pcStringToMods`), `ScoreTable`, `useQueuePlayer` (Task 16; until then "Add to queue" is rendered disabled and Task 16 wires it — or implement Task 16 before this one).
- Produces: `ProfilePage` per the spec's "Player profile": header strip (avatar, name, country; Local pp, Live pp, Difference first; aim, tap, accuracy, flashlight, reading pp, hit accuracy; Master pp only when variant ≠ `droid-rebalance`); actions Back (→ leaderboard) and Add to queue (logged in); `ScoreTable` with `storageKey: "profile-columns"`; 404 → "Player not found". `TopPlaysTab` — `ScoreTable` with `showPlayer` and `storageKey: "top-plays-columns"`; its mod filter is sent to the server as acronyms (server already filters "contains these mods").

- [ ] **Step 1: Write failing tests**: header shows Local/Live/Difference first; Master pp hidden on `droid-rebalance`; unknown player shows "Player not found"; Top plays sends `mods=HDDT` after picking HD and DT and shows the Player column.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the player profile and Top plays tab"`

### Task 13: Mod picker

**Files:**
- Create: `client/src/mods/ModPicker.tsx`, `ModPicker.module.css`, `droidMods.ts`, `modSearch.ts`, `useFavoriteMods.ts`, `favoriteModsStorage.ts`
- Modify: `client/src/scores/ScoreToolbar.tsx` (wire the mod filter)
- Test: `client/tests/mods/*.test.ts(x)` (port the streaming client's tests for these files from `~/Projects/osu-droid-streaming-client/tests/`)

**Interfaces:**
- Produces: `ModPicker({ mods: readonly SerializedMod[]; onChange: (mods: readonly SerializedMod[]) => void; hasSettings?: boolean })` — a port of `~/Projects/osu-droid-streaming-client/src/components/controls/ModPicker.tsx` (search, categories, icons from `/icons/mods/<acronym>.png`, favourites in `localStorage` through `useLocalStorage`, auto-deselect incompatible mods, inline settings when `hasSettings` is not `false`). The score filters pass `hasSettings={false}`. The panel fits the viewport on tablet and scrolls inside itself; rows are 44px under `pointer: coarse`.
- `getSelectedAcronyms(mods: readonly SerializedMod[]): string[]` exported from `droidMods.ts` for the filters.

- [ ] **Step 1: Port the tests**, adjusting imports; add `it("hides settings when hasSettings is false")` and `it("selecting DT deselects HT")`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Port the implementation** to this codebase's naming and CSS tokens. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the mod picker"`

### Task 14: Calculator form and result panel

**Files:**
- Create: `client/src/api/calculator.ts`, `client/src/calculator/CalculatorView.tsx`, `CalculatorForm.tsx`, `ResultPanel.tsx`, `resultFields.ts`, `calculatorForm.ts`, `RawResponseDialog.tsx`, `ExportImageMenu.tsx`, `StrainGraph.tsx` (+ CSS)
- Create: `client/src/variant/CalculatorTab.tsx`
- Test: `client/tests/calculator/*.test.ts(x)`

**Interfaces:**
- Consumes: `POST /api/ppboard/calculate` (Task 2's fields), `CalculationResponse`, `ModPicker`.
- Produces:
  - `useCalculation()` mutation taking `CalculatorFormValues` and returning `CalculationResponse`.
  - `CalculatorFormValues { beatmap: string; beatmapFile: File | null; mods: SerializedMod[]; combo: string; accuracy: string; totalScore: string; n100: string; n50: string; nmiss: string; sliderTicksMissed: string; sliderEndsDropped: string }`; `buildCalculationFormData(scope: CalculationScope, variant: string, values: CalculatorFormValues): FormData`; `getFormValuesFromResult(response: CalculationResponse): CalculatorFormValues` (for Load data from result; `beatmap` = the beatmap id).
  - `getResultSections(response: CalculationResponse): ResultSection[]` with `ResultSection = { title: string; fields: { label: string; value: string; tone?: "up" | "down" }[] }` — header; map, mods, accuracy, combo `x / max`; Total pp, Live pp, Difference (only when `baselineResult`); per-skill pp (droid: Aim, Tap, Accuracy, Flashlight, Reading; osu!: Aim, Speed, Accuracy, Flashlight); performance details (droid: effective miss count, tap penalty, deviation, tap deviation, slider cheese penalty); difficulty (star rating, then the variant's per-skill difficulties); stats after mods CS/AR/OD/HP. Field keys come from the attribute objects (`difficulty.starRating`, `performance.tap`, …); unknown keys are ignored. Numbers: pp and difficulty to 3 decimals as the reference, counts as integers.
  - `CalculatorView({ scope: CalculationScope; variant: string; variantPicker?: ReactNode })` — desktop two columns (form left, result right), tablet/phone one column with the result below (scrolls into view after calculating); sections "Calculate an imaginary score" (fields per spec, the precise-fields note copy, Calculate / Reset / Load data from result) and the result panel (read-only text, `StrainGraph` from the base64 PNG, actions Show raw response, Export as image; Generate link and "Calculate my score" slots filled in Task 15).
  - `RawResponseDialog` — pretty-printed JSON with `CopyButton` "Copy to clipboard"; strain chart strings shortened to `"<base64 PNG, N bytes>"` for display only.
  - `ExportImageMenu` — Copy to clipboard (PNG via `navigator.clipboard.write`; hide the item when unsupported) and Download PNG (`<variant>-<beatmap id or title>.png`), capturing the result panel element with the chosen DOM-to-image library.
  - `CalculatorTab` = `CalculatorView` with `scope: "variant"` and the current variant.

- [ ] **Step 1: Write failing tests**: `buildCalculationFormData` sends `mods` as JSON and omits empty fields; `getFormValuesFromResult` round-trips a fixture response; `getResultSections` uses "Tap pp" for droid and "Speed pp" for osu!, omits Live pp/Difference without a baseline, colours a negative difference `down`; `CalculatorView` — submitting an ID shows Total pp, Live pp and Difference; Load data from result refills the form; uploading a `.osu` file sends `beatmapfile`; Show raw response opens a dialog with the JSON; Export as image's Download triggers the library (mocked).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the calculator"`

### Task 15: My score, snapshots, and the Beatmap calculator tool

**Files:**
- Create: `client/src/api/snapshots.ts`, `client/src/calculator/MyScoreForm.tsx`, `GenerateLinkButton.tsx`, `SnapshotPage.tsx`, `client/src/pages/BeatmapCalculatorPage.tsx` (+ CSS)
- Modify: `client/src/calculator/CalculatorView.tsx`, `client/src/routing/routes.tsx`
- Test: `client/tests/calculator/snapshots.test.tsx`, `client/tests/calculator/MyScoreForm.test.tsx`, `client/tests/pages/BeatmapCalculatorPage.test.tsx`

**Interfaces:**
- Consumes: Tasks 3 and 4 endpoints; `CalculatorView`, `getFormValuesFromResult`.
- Produces:
  - `useMyScoreCalculation()`, `useCreateSnapshot()` (sends the **last submitted form values** again, including the file, plus `source: "my-score"` when the result came from My score), `useSnapshot(id: string)`.
  - `MyScoreForm` — "Calculate my score on this beatmap": beatmap field (link/ID) and button; shown only when logged in and the variant is an osu!droid one; "You have no score on this beatmap" shown from the 404.
  - `GenerateLinkButton` — logged in only; after creation shows the URL (`getSnapshotPath`) with `CopyButton` and "Expires <date>".
  - `SnapshotPage({ scope })` — loads by id; renders the read-only result panel with "Snapshot taken <date> on <variant>"; Load data from result navigates to the calculator with the values **only when** `calculation.parameters.beatmap` has an `id` (disabled with "Not available for uploaded beatmaps" otherwise); 404 → "Snapshot not found"; 410 → "This snapshot has expired" with a link to the calculator.
  - `BeatmapCalculatorPage` (`/calculate`) — `CalculatorView` with `scope: "tool"` and a `Select` variant picker over `toolVariantNames` (labels: "osu!droid live", "osu!droid rebalance", "osu!standard live", "osu!standard rebalance"; default `droid-live`); shows `ignoredMods` as "Ignored for osu!standard: …"; My score only for the droid two.

- [ ] **Step 1: Write failing tests**: Generate link hidden when logged out; creating a link posts the form again and shows the copyable URL and expiry; snapshot of an uploaded file disables Load data from result; 410 shows the expired message; a 404 for a snapshot looks identical to an unknown id (Review Focus 1); My score shows the no-score message; Beatmap calculator defaults to `droid-live`, shows no Difference for it, shows "Speed pp" for `osu-live`, hides My score for osu! variants, and sends `scope=tool`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add my score, snapshots, and the Beatmap calculator"`

### Task 16: Queue tab

**Files:**
- Create: `client/src/api/recalc.ts`, `client/src/queue/QueueTab.tsx`, `QueueAddBar.tsx`, `FullRunStrip.tsx`, `QueueList.tsx`, `RecentList.tsx`, `queueFormatting.ts` (+ CSS)
- Test: `client/tests/queue/*.test.ts(x)`

**Interfaces:**
- Consumes: `GET /api/recalc/queue?variant=<name>` (omit for the global queue) → `RecalcQueueView`; `POST /api/recalc/queue` (read `server/src/routes/api/recalc/recalc.ts` for the body), `DELETE /api/recalc/queue/:id`, `POST /api/recalc/full-runs/:variant/start` `{ restart: boolean }`, `POST /api/recalc/full-runs/:variant/stop`. Port polling interval and the formatters (`formatEstimatedWait`, `formatCooldown`, `formatAge`) from `git show master:client/src/utils/recalcApi.ts` and `hooks/useRecalcQueue.ts`.
- Produces: `useRecalcQueue(variant: string | null)` (TanStack `refetchInterval` = the old poll interval), `useQueuePlayer()`, `useRemoveQueueEntry()`, `useStartFullRun()`, `useStopFullRun()`; `QueueTab` per the spec's "Queue tab": add bar (logged out → "Log in to queue players"), "You can queue N more players" from `allowance` (`maxActive - active`) and the cooldown text; `FullRunStrip` only while this variant's run is `running` or `paused` ("Recalculating all players", progress bar, "<done> of <total> players done", failures, starter and age, paused text; Stop for `canManageFullRuns`); `QueueList` with Running then Waiting entries only and a "Show all variants" toggle (global queue, variant tag per entry); `RecentList` as its own section; phone: `SegmentedControl` "Queue (n)" / "Recently finished". Copy exactly as the spec.

- [ ] **Step 1: Write failing tests**: recently finished entries never appear in the queue list; the strip shows "1,240 of 8,912 players done" for a running fixture and is absent when no run; Stop only for `canManageFullRuns`; queueing a player refetches and the slot text drops by one; visitors see "Log in to queue players"; the toggle requests the global queue; phone shows the segmented switch.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; wire Profile's Add to queue (Task 12) to `useQueuePlayer`. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the queue tab"`

### Task 17: Variant Admin tab

**Files:**
- Create: `client/src/api/manage.ts`, `client/src/admin/VariantAdminTab.tsx`, `VariantSettingsDialog.tsx`, `DescriptionEditor.tsx`, `AccessTable.tsx`, `GrantUserDialog.tsx`, `GrantKeyDialog.tsx`, `FullRunControls.tsx`, `accessRules.ts` (+ CSS)
- Test: `client/tests/admin/*.test.ts(x)`

**Interfaces:**
- Consumes: `/api/manage/*` (forwards to the broker's `/admin/*`; read `git show master:client/src/utils/manageApi.ts` and `pages/manage/*.tsx` for paths, bodies, `maxVariantTitleLength = 100`, `maxVariantDescriptionLength = 4000`, and `GET /api/manage/usernames?uids=`), `canManageVariant`, `isAdmin`, `getCollapsedDescription`, `Markdown`, full-run hooks from Task 16.
- Produces:
  - `canRemoveGrant(me: Me, target: { uid: number; role: "admin" | "manager" | null }): boolean` and `canGrantTo(me: Me, targetRole: "admin" | "manager" | null): boolean` — admins always; managers only for targets with no role and never themselves (mirrors the broker).
  - `VariantAdminTab` — buttons Edit settings, Grant access to user, Grant access to key (admins), and `FullRunControls` (admins: Start or Continue — Continue when the run view shows previous progress — and Restart from the beginning with a confirmation `Dialog`, descriptions per spec); `AccessTable` (granted users with uid, username, role, remove button only where `canRemoveGrant`; for admins, keys granted this variant with remove, and all-variants keys as "Inherited" without remove, from `GET /api/manage/keys` filtered client-side).
  - `VariantSettingsDialog` — title (counter to 100), `DescriptionEditor`, available, aliases add/remove, visibility (admins only).
  - `DescriptionEditor({ value: string; onChange: (value: string) => void })` — textarea with counter to 4000; phone/tablet `SegmentedControl` Write/Preview, desktop side by side; preview shows "Before Show more" (`getCollapsedDescription`) and "Full description", both via `Markdown`; "Markdown supported" links to `https://commonmark.org/help/`.

- [ ] **Step 1: Write failing tests**: `accessRules.test.ts` — the rule table (admin removes anyone; manager removes a no-role person; manager cannot remove a manager, an admin, or themselves; manager cannot grant to a manager); `VariantAdminTab` — a manager sees no remove button on another manager's row or their own, and no key section; an admin sees inherited keys without remove; Restart from the beginning asks for confirmation before posting `{ restart: true }`; `DescriptionEditor` preview matches the variant page's collapsed text for the same source; the title counter stops at 100.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the variant Admin tab"`

### Task 18: Admin area

**Files:**
- Create: `client/src/admin/AdminLayout.tsx`, `KeysPage.tsx`, `KeyEditor.tsx`, `CreatedKeyDialog.tsx`, `RolesPage.tsx`, `AllVariantsPage.tsx`, `AdminVariantPage.tsx` (+ CSS)
- Test: `client/tests/admin/KeysPage.test.tsx`, `RolesPage.test.tsx`, `AllVariantsPage.test.tsx`

**Interfaces:**
- Consumes: `/api/manage/keys` (list, create, `PATCH /keys/:name`, `PUT/DELETE /keys/:name/grants/:variant`, `POST /keys/:name/revoke`), `/api/manage/users`, `PUT /api/manage/users/:uid/role`, `/api/manage/variants` (all variants for admins, including `droid-live` and osu!), Task 17's `VariantSettingsDialog` and `AccessTable`.
- Produces: admin-only routes (non-admins → "You need the admin role to see this page"); `AdminLayout` with tabs API keys / Roles / All variants; `KeysPage` — compact list (name, rate limit or "Unlimited", scope "All variants" or "N variants", can act for users, created, Active/Revoked), search box, paging at 25 per page; selecting a key opens `KeyEditor` in a side panel on desktop and a full page on phone/tablet; Create key opens the same editor; `CreatedKeyDialog` shows the raw key once with `CopyButton` and "This key will not be shown again"; revoke asks for confirmation. `RolesPage` — people with a role, set/remove a role by uid. `AllVariantsPage` — every variant, opening `AdminVariantPage` with the settings dialog and access table.

- [ ] **Step 1: Write failing tests**: a manager opening `/admin/keys` sees the admin-role message; the keys list shows one row per key and no edit forms until a key is selected; the created key's raw value appears once and is gone after closing; revoke requires confirmation; All variants lists `droid-live` and `osu-live`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add the admin area"`

### Task 19: Remaining pages

**Files:**
- Create: `client/src/pages/WhitelistPage.tsx`, `ScoreMultiplierPage.tsx`, `AboutPage.tsx`, `LoginPage.tsx`, `SkinListPage.tsx`, `SkinPreviewPage.tsx`, `MatchHistoryPage.tsx`, `client/src/api/whitelist.ts`, `scoreMultiplier.ts`, `skins.ts`, `matchHistory.ts`, `client/src/hooks/useTurnstile.ts` (+ CSS)
- Test: `client/tests/pages/*.test.tsx`

**Interfaces:**
- Consumes the unchanged endpoints the old pages use (read each from `master`): `GET /api/ppboard/getwhitelist?page&query`, `GET /api/ppboard/score-multiplier-sample?beatmapId&mods`, `/api/skins/search`, `/api/skins/get?discordid&name`, the match history URL in `pages/MatchHistory.tsx`, `POST /api/auth/login`. Port `useTurnstile` with `VITE_TURNSTILE_SITE_KEY`.
- Produces: pages per the spec's "Other pages": Whitelist (table with search and sorting; "How to filter" collapsible built from the old `WhitelistBeatmapFilter.tsx` content); Score multiplier (beatmap field + `ModPicker hasSettings={false}`, old-vs-new table); About (old home content from `pages/Home.tsx`, tidied); Login (centred card, username, password, Turnstile; on success `navigate(state.from ?? "/")`; shows throttle wait from `retryAfterSeconds`); skins and match history in the shell with the new table/text styles.

- [ ] **Step 1: Write failing tests**: login returns to `state.from`; login shows "Invalid username or password" from a 401; whitelist search sends `query`; score multiplier sends `mods` as acronyms; About lists the donor list heading.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `pnpm --filter droidppboard-client build` → no errors; grep the repo for `REACT_APP_` and `client/build` and update any docs or `.env` examples still naming them.
- [ ] **Step 5: Commit** — `git commit -m "Add the remaining pages"`

---

## Part D: End-to-end, CI, shipping

### Task 20: Playwright and CI

**Files:**
- Create: `client/playwright.config.ts`, `client/e2e/mockApi.ts`, `client/e2e/*.spec.ts`
- Modify: `client/package.json` (`test:e2e`), `.github/workflows/ci.yml`, `client/tsconfig.test.json` (include `e2e`)

**Interfaces:**
- Consumes: `client/tests/mocks/fixtures.ts` (shared with Vitest).
- Produces: `mockApi(page: Page, options?: { me?: Me | null })` — `page.route("**/api/**", …)` fulfilling from the fixtures; Playwright `webServer` runs `vite preview` on the production build; projects `desktop` (1280×800), `tablet` (768×1024, `hasTouch: true`), `phone` (390×844, `hasTouch: true`); `--workers=1`.

- [ ] **Step 1: Write the specs**: `landing.spec.ts` — `/` lands on droid-rebalance's leaderboard; `variants.spec.ts` — switch variant via the sidebar (desktop) and the drawer (tablet, phone; drawer closes after picking); `profile.spec.ts` — open a profile from the leaderboard; `login.spec.ts` — log in and return to the previous page; `queue.spec.ts` — queue a player and see it waiting; `calculator.spec.ts` — calculate by beatmap ID and see Difference; `redirects.spec.ts` — `/prototype/leaderboard/droid-rebalance` ends at `/v/droid-rebalance/leaderboard`. Use role-based locators.
- [ ] **Step 2: Run** `pnpm --filter droidppboard-client build && pnpm --filter droidppboard-client test:e2e` → PASS on all three projects (install browsers first with `pnpm --filter droidppboard-client exec playwright install chromium`).
- [ ] **Step 3: Extend CI** (`.github/workflows/ci.yml`), keeping the server job: job `client` — install, `typecheck`, `typecheck:tests`, `lint`, `format:check`, `test`, `build`; job `e2e` — install, `build`, `playwright install --with-deps chromium`, `test:e2e`, upload the Playwright report on failure. Node 22 as the existing job.
- [ ] **Step 4: Run every check locally once** (one at a time): server `test` and `build`; client `typecheck`, `typecheck:tests`, `lint`, `format:check`, `test`, `build`, `test:e2e` → all pass.
- [ ] **Step 5: Commit** — `git commit -m "Add end-to-end tests and client CI"`

### Task 21: Pull request and rollout runbook

- [ ] **Step 1:** Push `client-redesign` and open a PR against `master` (summary of server and client changes; note it depends on the broker PR deploying first; end with the Claude Code attribution line).
- [ ] **Step 2: Draft the runbook** at `~/runbooks/client-redesign-rollout.md` in the format of `~/runbooks/variant-management-rollout.md`: project/PR table (dpp-processor-backend broker PR, droidppboard PR), why the order matters (broker first: managers limited, `public`/`builtAt` present — the new sidebar needs `public`), status checklist, and lettered sections: A. Prepare (`SNAPSHOT_TTL_DAYS` if not 30; `VITE_TURNSTILE_SITE_KEY` replaces `REACT_APP_TURNSTILE_SITE_KEY` at client build time), B. Broker deploy and check (`curl` `/variants` shows `public` and `builtAt`, reading the key from a file as the old runbook does), C. Board deploy (`pnpm install`, client `build` producing `client/dist`, server `build`, restart; the server now serves `client/dist`), D. Verify (sidebar lists no `droid-live`; old URLs redirect; a manager without a grant cannot edit a variant; a snapshot link opens; the snapshot TTL index exists in `calculationsnapshots`), E. Clean up (remove the old `client/build` directory on the server). Fill PR numbers once known. It must stand alone for a fresh session.
