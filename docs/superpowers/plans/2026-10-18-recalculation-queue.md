# Recalculation Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recalculate prototype profiles from a live queue page on droidppboard, per variant, with full runs for
admins, and retire Mahiru's `/recalc`.

**Architecture:**
- **Broker (dpp-processor-backend).** The variant summary gains a healthy-instance count, which the board uses as the
  number of calculators per variant.
- **Board server.** A new `server/src/recalculation/` module has three parts:
  - a profile calculator, ported from Mahiru, that tells upstream errors from real skips;
  - an in-memory `RecalculationQueue` that schedules single entries and full runs per variant, within each variant's
    calculator count;
  - an Express router under `/api/recalc`.
- **Board client.** A `/prototype/queue` page polls the queue.
- **Mahiru.** The `/recalc` command and its manager are deleted.

**Tech Stack:** Express 4, MongoDB, mysql2 (official database), React 18 (create-react-app, react-router 6), Vitest
(server; broker).

**Spec:** `docs/superpowers/specs/2026-10-18-recalculation-queue-design.md`. The calculation being ported is Mahiru's
`PrototypeRecalculationManager.calculatePlayer` on `origin/master`. Read it with `git show
origin/master:src/utils/managers/PrototypeRecalculationManager.ts` in `~/Projects/Mahiru`; its local `master` is behind.

## Global Constraints

- **Branches.** droidppboard: branch `recalculation-queue` (already holds the spec). dpp-processor-backend and Mahiru:
  a branch `recalculation-queue` in each, from their up-to-date `master`. Commit after every task.
- **Limits.** At most **5** waiting or calculating entries per person, counted across all variants. A **10 second**
  cooldown between adds. Both come from env (`RECALC_MAX_ACTIVE_PER_PERSON`, `RECALC_ADD_COOLDOWN_SECONDS`).
  Finished and failed entries don't count. A refused duplicate doesn't start the cooldown.
- **Queuing.** Login required. Droid variants only, visible to the queuer through the broker (`resolveVisibleVariant`
  with the queuer's uid).
  - **Refused:** player not found, banned, restricted, or archived; variant not visible or not found; variant
    unavailable (no healthy instance); same player already waiting or calculating for that variant.
- **Removing.** The queuer may remove their own waiting entry; admins may remove any waiting entry.
- **Acting uid.** Score service calls send `X-Acting-Uid`: the queuer, or the admin who started a full run.
- **Calculators.** Never more players of a variant calculating at once (single entries and full run together) than
  its healthy instance count.
- **Upstream errors fail the player** and write nothing:
  - **upstream errors:** unreachable, timeout, 5xx, 429, or any answer not listed as a skip;
  - **real skips:** score service `404` with code `SCORE_NOT_FOUND` or `BEATMAP_NOT_FOUND`, or the beatmap service
    answering "not found". Real skips drop the score and the profile is saved;
  - **other failures:** a player with no top scores fails, and so does one with no calculable scores.
- **Single-entry failures** show the reason and are never retried automatically.
- **Full runs.**
  - Admin only (`role === "admin"` from broker `GET /me`), checked in `canManageFullRuns` alone.
  - One background job per variant, and single entries always take a free calculator first.
  - Progress is `scanDone`. A failed player is never marked scanned; they are retried later in the same run, up to
    **3** attempts in total.
  - The run pauses while its variant has 0 calculators and resumes by itself.
  - Restart ("Start over") resets `scanDone` first. A variant with no profiles gets `droid-rebalance`'s cloned in.
  - After a server restart, runs are stopped.
- **Queue state** lives in memory. Finished and failed entries stay visible for **60 minutes**
  (`RECALC_FINISHED_RETENTION_MINUTES`).
- **Privacy.** A variant the viewer can't see never appears: not in entries, not in tags, not in full runs.
- **Logs.** Never log session tokens or keys. Log uid, variant, and outcome per calculation.
- **Style.** 4-space indentation, Express routers in `server/src/routes/api/...`, shared types in
  `modules/app-structures`, error bodies `{ message: string }` like the auth routes.

## Decisions This Plan Adds to the Spec

- **Score count** while calculating counts scores *processed* (calculated or skipped), of the top-score count.
- **Estimated wait:** for the selected variant, `ceil(waiting ÷ calculators) × average seconds per player`. The
  average is over that variant's last 20 completions, or 5 s with none yet. With 0 calculators it is `null`.
- **Updates:** the client polls `GET /api/recalc/queue` every **3 s**, and stops while the tab is hidden.
- **Calculator counts:** refreshed every **15 s** for variants with work, by `BrokerClient.getVariant` acting for the
  most recent queuer or full-run starter of that variant (the board's own key sees only public variants).
- **Full-run order:** unscanned profiles by `localPPTotal` descending. Retries come only once no fresh unscanned
  player is left. A player already calculating for a variant (from either source) is not started again for it.
- **Full-run total and done:** counted from Mongo at Start (`countProfiles`, `countScanned`); done goes up by one per
  success.
- **Unexpected exceptions** from a calculation count as upstream errors, with reason `"Unexpected error"`.

## Review Focus

1. **Both `uid` and `username`, or neither, sent to queue.** Expect `400`. Test (Task 5):
   `parseQueueRequest rejects both or neither of uid and username`.
2. **A player who is also in the running full run gets queued singly.** Expect them not to calculate twice at once.
   Test (Task 4): `does not start a player already calculating for the variant`.
3. **Instances removed while more players are calculating than the new count.** Expect nothing new to start until
   the in-flight count drops below it. Test (Task 3): `starts nothing new while over a reduced capacity`.
4. **A visitor polls the queue.** Expect the queue for public variants, no allowance, and no full-run controls. Test
   (Task 3): `gives visitors no allowance`.
5. **A score service call that hangs.** Expect it to become an upstream error, so the calculator frees up. Test
   (Task 2): `treats a timeout as an upstream error`.

---

### Task 1: Broker exposes healthy instance counts (dpp-processor-backend)

**Files:**
- Modify: `packages/shared/src/types.ts` (`VariantSummary`), `apps/broker/src/controllers/variantSummary.ts`,
  `apps/broker/README.md` (API table note)
- Test: `apps/broker/tests/unit/controllers/variantSummary.test.ts` (new)

**Interfaces:**
- Produces: `VariantSummary.healthyInstanceCount: number`, the number of the variant's instances for which
  `health.isHealthy(instance)` is true. It appears in `GET /variants`, `GET /variants/:name`, and (through
  `toAdminVariant`) `GET /admin/variants`.

- [ ] **Step 1: Write the failing test** `counts only healthy instances`. Build a `Variant` with three instances and
  a health stub that reports two of them healthy. Assert `toVariantSummary(...).healthyInstanceCount === 2` and
  `available === true`. Add a second case with zero healthy instances: count `0`, `available` `false`.
- [ ] **Step 2: Run** `pnpm --filter @dpp/broker exec vitest run tests/unit/controllers/variantSummary.test.ts`.
  Expected: FAIL.
- [ ] **Step 3: Implement.** Add the field with a doc comment to `VariantSummary`. Compute it in `toVariantSummary`,
  and derive `available` from it.
- [ ] **Step 4: Run** `pnpm --filter @dpp/broker test`, `pnpm --filter @dpp/broker build`, and the shared package
  build. Fix any integration test that asserts an exact summary shape. Expected: PASS.
- [ ] **Step 5: Commit.** `Expose healthy instance counts in variant summaries`

### Task 2: Profile calculator (droidppboard server)

**Files:**
- Create in `server/src/recalculation/`: `ScoreServiceClient.ts`, `BeatmapService.ts`, `OfficialScores.ts`,
  `ProfileCalculator.ts`, `weightedTotal.ts`, plus `.test.ts` for `ScoreServiceClient`, `ProfileCalculator`, and
  `weightedTotal`
- Modify:
  - `server/src/auth/OsuDroidAccounts.ts` (add `findPlayer`)
  - `server/src/database/managers/aliceDb/PrototypePPCollectionManager.ts` (add `saveProfile`)
  - `modules/app-structures/src/structures/PPVariant.ts` (add `healthyInstanceCount: number`)

**Interfaces:**
- **Score service.** `ScoreServiceClient.getOnlineScore(uid: number, hash: string, variant: string, actingUid: number): Promise<OnlineScoreOutcome>`.
  - `type OnlineScoreOutcome = { kind: "ok"; response: OnlineScoreResponse } | { kind: "skip"; reason: string } | { kind: "error"; reason: string }`.
  - It sends `GET {DPP_SCORE_SERVICE_URL}/online-scores?uid&hash(lowercased)&variant&best=true` with `X-Api-Key:
    DPP_SCORE_SERVICE_KEY` and `X-Acting-Uid`, timing out after **60 s**.
  - `OnlineScoreResponse` is `{ score: { mods: SerializedMod[] }; calculation: BrokerPerformanceResponse<...> & { score: ... } }`,
    typed from what Mahiru's `createCalculationAttributes` reads.
- **Beatmaps.** `getBeatmapByHash(hash: string): Promise<{ kind: "ok"; beatmap: OsuAPIResponse } | { kind: "skip" } | { kind: "error"; reason: string }>`.
  - It calls `http://localhost:3017/api/beatmap/getbeatmap?key=DROID_SERVER_INTERNAL_KEY&hash=…`, as `Util.getBeatmap`
    does with `id`.
  - `200` means ok and `404` (`{ error: "Beatmap not found" }`) means skip. Everything else is an error, confirmed in
    `~/Projects/osu-beatmap-processor/src/controllers/BeatmapController.ts`: `503` with `Retry-After` while osu! is
    unavailable, `429` when the key's per-minute limit is hit, `400` for a bad reference, and `500`.
- **Top scores.** `getTopScoreHashes(uid: number, amount = 100): Promise<string[]>` reads `bbl_score_best` ordered by
  `pp DESC`.
- **Player lookup.** `OsuDroidAccounts.findPlayer(uidOrUsername: number | string): Promise<{ id: number; username: string; archived: boolean } | null>`.
  - It looks up by id if given a number, otherwise by trimmed username, where `banned = 0 AND restrict_mode = 0`.
- **Saving.** `PrototypePPCollectionManager.saveProfile(uid: number, reworkType: string, profile: Pick<IPrototypePP, "pp" | "localPPTotal" | "livePPTotal" | "masterPPTotal" | "username">): Promise<void>`.
  - It upserts with `$set` of those fields plus `lastUpdate: Date.now()` and `scanDone: true`, and the same `$unset`
    list of legacy fields as Mahiru.
- **Weighting.** `weightedTotal(values: number[]): number` sums the values sorted descending, each times `0.95^i`.
- **Calculation.** `calculateProfile(uid: number, variant: string, actingUid: number, onProgress: (done: number, total: number) => void, deps?: ProfileCalculatorDeps): Promise<ProfileOutcome>`.
  - `type ProfileOutcome = { ok: true; livePPTotal: number; localPPTotal: number } | { ok: false; reason: string }`.
  - `ProfileCalculatorDeps` has `{ findPlayer, getTopScoreHashes, getBeatmapByHash, getOnlineScore, saveProfile }`,
    with the signatures above, defaulting to the real ones.

- [ ] **Step 1: Write the failing tests.**
  - `weightedTotal`: `weights scores by 0.95 per rank`. `[100, 200]` gives `200 + 100 × 0.95 = 295`. `[]` gives `0`.
  - `ScoreServiceClient` (stub `globalThis.fetch`):
    - `sends the acting uid and api key`;
    - `maps SCORE_NOT_FOUND and BEATMAP_NOT_FOUND to skip`;
    - `maps 5xx, 429, VARIANT_NOT_FOUND, and network errors to error`;
    - `treats a timeout as an upstream error` (a fetch that rejects with an `AbortError`/`TimeoutError`).
  - `ProfileCalculator` (fake deps):
    - `fails when the player is not found`;
    - `fails when there are no top scores`;
    - `skips scores whose beatmap or score is not found and saves the rest`;
    - `fails the player without saving when any call errors`: one `getOnlineScore` returns `kind: "error"` on the
      third score; expect `ok: false`, `saveProfile` not called;
    - `fails when no scores could be calculated` (all skipped);
    - `omits master when recalculating droid-rebalance`: no call with variant `droid-rebalance` beyond local, and
      `masterPPTotal` undefined;
    - `calls live, local, and master for other variants`: variants `droid-live`, `<variant>`, `droid-rebalance`, all
      with the given acting uid;
    - `reports progress per processed score`: `onProgress` is called with `(1, n)` … `(n, n)`, skipped scores
      included.
- [ ] **Step 2: Run** `pnpm --filter droidppboard-server test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Port the entry building, sorting, and totals from Mahiru's `calculatePlayer`: the
  `PrototypePPEntry` fields, beatmap difficulty with mods applied, live, local, and master difficulty and
  performance, and `masterPPTotal` using `master ?? live`. Mods come from the score service response's `score.mods`
  (`ModUtil.deserializeMods`). Log one line per player: uid, variant, outcome.
- [ ] **Step 4: Run** the server tests and `pnpm --filter droidppboard-server build`. Expected: PASS.
- [ ] **Step 5: Commit.** `Add a prototype profile calculator that fails on upstream errors`

### Task 3: Queue core for single entries (droidppboard server)

**Files:**
- Create: `server/src/recalculation/RecalculationQueue.ts`, `server/src/recalculation/RecalculationQueue.test.ts`,
  `server/src/recalculation/limits.ts`, `server/src/recalculation/limits.test.ts`,
  `modules/app-structures/src/structures/RecalcQueue.ts`
- Modify: `modules/app-structures/src/index.ts`

**Interfaces:**
- **Shared types** (`RecalcQueue.ts`):
  ```ts
  type RecalcEntryStatus = "waiting" | "calculating" | "done" | "failed";
  interface RecalcEntryView { id: string; uid: number; username: string; variant: string;
      queuedByUid: number; queuedByUsername: string; queuedAt: number; status: RecalcEntryStatus;
      position: number | null; progress: { done: number; total: number } | null;
      livePPTotal?: number; localPPTotal?: number; failureReason?: string; finishedAt?: number; }
  type FullRunStatus = "running" | "paused" | "stopped" | "finished";
  interface FullRunView { variant: string; status: FullRunStatus; startedByUid: number;
      startedByUsername: string; startedAt: number; done: number; total: number; failed: number; }
  interface RecalcAllowance { active: number; maxActive: number; cooldownRemainingSeconds: number; }
  interface RecalcQueueView { variant: string | null; calculators: number; estimatedWaitSeconds: number | null;
      queue: RecalcEntryView[]; recent: RecalcEntryView[]; fullRuns: FullRunView[];
      allowance: RecalcAllowance | null; canManageFullRuns: boolean; }
  ```
  - `variant: null` means the global view.
  - `queue` holds calculating entries first, then waiting entries in queue order.
  - `recent` holds done and failed entries, newest first.
- **Limits.** `readRecalcLimits(env: NodeJS.ProcessEnv): RecalcLimits`, where
  `RecalcLimits = { maxActivePerPerson: number; addCooldownSeconds: number; finishedRetentionMinutes: number }`.
  Defaults are 5, 10, and 60; a non-positive-integer value falls back to the default.
- **Queue.** `class RecalculationQueue`, constructed with `deps: RecalculationQueueDeps`:
  ```ts
  interface RecalculationQueueDeps { now(): number; newId(): string; limits: RecalcLimits;
      calculate(uid: number, variant: string, actingUid: number,
          onProgress: (done: number, total: number) => void): Promise<ProfileOutcome>;
      getCapacity(variant: string, actingUid: number): Promise<number | null>;
      fullRunStore: FullRunStore; } // FullRunStore is defined in Task 4; pass a stub here
  ```
  - `enqueue(request: { uid: number; username: string; variant: string; capacity: number; queuedByUid: number; queuedByUsername: string }): { ok: true; entry: RecalcEntryView } | { ok: false; reason: "limit" | "cooldown" | "duplicate"; retryAfterSeconds?: number }`.
    `capacity` seeds the variant's calculator count.
  - `remove(id: string, byUid: number, isAdmin: boolean): "removed" | "notFound" | "forbidden" | "notWaiting"`.
  - `allowance(uid: number): RecalcAllowance`.
  - `snapshot(visibleVariants: ReadonlySet<string>, selected: string | null, viewerUid: number | undefined): Omit<RecalcQueueView, "canManageFullRuns">`.
    `allowance` is `null` without a viewer. `calculators` is the selected variant's count, or the sum over visible
    variants for the global view.
  - `refreshCapacities(): Promise<void>`. A `null` from `getCapacity` keeps the last known count.
  - Scheduling runs on every enqueue, completion, and capacity change. In each variant it starts the oldest waiting
    entry while `calculating < capacity`.

- [ ] **Step 1: Write the failing tests.** Use a fake clock, sequential ids, and `calculate` returning promises the
  test resolves.
  - `readRecalcLimits`: `uses defaults for missing or invalid values`.
  - `RecalculationQueue`:
    - `refuses a sixth active entry across variants` (three in A and two in B, then a sixth gives `limit`);
    - `refuses adds within the cooldown and reports the wait` (`retryAfterSeconds` 10 at t=0 and 4 at t=6 s);
    - `refuses a duplicate without starting the cooldown`;
    - `does not count finished entries against the limit`;
    - `runs as many players at once as the variant has calculators` (capacity 2 and three entries means two are
      calculating and one is waiting);
    - `starts nothing new while over a reduced capacity` (capacity 2 with two calculating; refresh to 1; finish one;
      expect the waiting entry still waiting; finish the other; expect it to start);
    - `records done totals and failure reasons`;
    - `fails an entry whose calculation throws and frees its calculator`;
    - `drops finished entries after the retention time` (still there at 59 min, gone at 61);
    - `lets only the queuer or an admin remove a waiting entry`, and `notWaiting` for a calculating one;
    - `leaves out variants the viewer cannot see`, in both the selected and the global view;
    - `gives visitors no allowance`;
    - `estimates the wait from recent completions`.
- [ ] **Step 2: Run** the server tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the server tests and build. Expected: PASS.
- [ ] **Step 5: Commit.** `Add an in-memory recalculation queue`

### Task 4: Full runs in the queue (droidppboard server)

**Files:**
- Modify: `server/src/recalculation/RecalculationQueue.ts`, `RecalculationQueue.test.ts`,
  `server/src/database/managers/aliceDb/PrototypePPCollectionManager.ts`

**Interfaces:**
- **Store.** `interface FullRunStore`, implemented by `PrototypePPCollectionManager`:
  - `countProfiles(reworkType: string): Promise<number>`;
  - `countScanned(reworkType: string): Promise<number>`;
  - `getUnscannedUids(reworkType: string, excludeUids: number[], limit: number): Promise<number[]>`, ordered by
    `localPPTotal` descending;
  - `resetScanDone(reworkType: string): Promise<void>`;
  - `cloneProfiles(source: string, target: string): Promise<void>`. It inserts `{ uid, username, reworkType: target,
    pp: [], localPPTotal: 0, livePPTotal: 0, lastUpdate: now, scanDone: false }` per source profile.
- **Queue methods.**
  - `startFullRun(variant: string, capacity: number, by: { uid: number; username: string }, restart: boolean): Promise<"started" | "alreadyRunning">`.
    In order: clone from `droid-rebalance` if `countProfiles` is 0; `resetScanDone` if `restart`; read the counts;
    status `running`.
  - `stopFullRun(variant: string): "stopped" | "notRunning"`. In-flight players finish; nothing new starts.
- **Scheduling.** Single entries first. Then, while calculators are free, the full run claims fresh unscanned uids
  (excluding every uid it has attempted this run and every uid calculating for the variant). Once there are none, it
  claims retry uids with attempts < 3. With neither left and nothing in flight, the status becomes `finished`.
  Capacity 0 makes a running run `paused`, and capacity > 0 makes it `running` again.

- [ ] **Step 1: Write the failing tests** with an in-memory `FullRunStore` fake:
  - `lets a waiting entry take the next calculator before the full run`;
  - `retries a failed full-run player later, up to three attempts`: one uid always fails; expect exactly 3
    `calculate` calls for it, the others in between, `failed` 1, and status `finished`;
  - `never marks a failed player scanned`: the fake store's scanned set excludes it;
  - `does not start a player already calculating for the variant`;
  - `pauses a full run while the variant has no calculators and resumes when it has`;
  - `start over resets scanned flags first`;
  - `clones droid-rebalance profiles into an empty variant`;
  - `stop lets in-flight players finish and starts nothing new`;
  - `shows full runs only for visible variants` (in `snapshot`).
- [ ] **Step 2: Run** the server tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Attempt counts and the retry list live on the run object, in memory.
- [ ] **Step 4: Run** the server tests and build. Expected: PASS.
- [ ] **Step 5: Commit.** `Add full runs to the recalculation queue`

### Task 5: Recalculation API (droidppboard server)

**Files:**
- Create: `server/src/routes/api/recalc/recalc.ts`, `server/src/recalculation/permissions.ts`,
  `server/src/recalculation/requests.ts`, `server/src/recalculation/requests.test.ts`,
  `server/src/recalculation/permissions.test.ts`, `server/src/recalculation/instance.ts`
- Modify:
  - `server/src/clients/BrokerClient.ts` (add `getVariant`) and `BrokerClient.test.ts`
  - `server/package.json` (`zod`)
  - `server/src/index.ts` (mount `/api/recalc`: `Util.createRateLimit(30)`, `requireAllowedOrigin(allowedOrigins)`,
    `sessionMiddleware`; start the 15 s capacity refresh after `DatabaseManager.init`)

**Interfaces:**
- **Broker.** `BrokerClient.getVariant(name: string, actingUid?: number): Promise<PPVariant | null>` calls
  `GET /variants/:name`, with the name URI-encoded.
- **Permission.** `canManageFullRuns(me: BrokerMe | null): boolean` returns `me?.role === "admin"`. It is the only
  role check for full runs.
- **Request parsing** uses Zod (add `zod` `4.6.5`, pinned exactly, to `server/package.json`; the broker and score
  service use Zod 4 too). `parseQueueRequest(body: unknown): { variant: string; player: number | string } | null`
  wraps a Zod schema's `safeParse`. The full-run start body `{ restart?: boolean }` is parsed with Zod as well.
  - `variant` is a non-empty string.
  - Exactly one of `uid`, a positive integer, or `username`, a string of 2–20 characters after trimming.
- **Wiring.** `instance.ts` exports the process-wide `recalculationQueue`, built with the real deps and
  `readRecalcLimits(process.env)`. Its `getCapacity` is `BrokerClient.getVariant(variant, actingUid)` → `healthyInstanceCount`,
  and routes pass the resolved variant's `healthyInstanceCount` as `capacity`.
- **Routes.** Mutating routes need `res.locals.uid` (`401 { message: "Log in to use the queue" }` otherwise).
  - `GET /api/recalc/queue?variant=<name>` returns `RecalcQueueView`. Without `variant` it is the global view.
    Visible variants come from `BrokerClient.getVariants(viewerUid)`, droid only. An unknown or invisible `variant`
    gets `404`. `canManageFullRuns` comes from `getMe` when logged in.
  - `POST /api/recalc/queue` takes `{ variant, uid? , username? }`:
    - `400` for a malformed request;
    - `404` for a variant or player not found or not visible (archived players too, with
      `{ message: "This player is archived" }`);
    - `409` when the variant is unavailable or the entry is a duplicate;
    - `429` with `Retry-After` for the limit or cooldown, with a message naming which;
    - `201` with the `RecalcEntryView`.
    - The queuer's username comes from `OsuDroidAccounts.getUsernames`.
  - `DELETE /api/recalc/queue/:id` maps `remove`'s results to `204`, `404`, `403`, and `409`.
  - `POST /api/recalc/full-runs/:variant/start` takes `{ restart?: boolean }`, and
    `POST /api/recalc/full-runs/:variant/stop`. Both answer `403` unless `canManageFullRuns`, `404` for an invisible
    variant, and `409` for `alreadyRunning` or `notRunning`.

- [ ] **Step 1: Write the failing tests:**
  - `parseQueueRequest rejects both or neither of uid and username`;
  - `parseQueueRequest trims usernames and rejects bad uids` (`0`, `-1`, `1.5`, `"12"`);
  - `canManageFullRuns allows only admins` (`admin` true; `manager`, `null` role, and `null` me false);
  - `BrokerClient.getVariant encodes the name and acts for the person`.
- [ ] **Step 2: Run** the server tests. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, the router, and the wiring.
- [ ] **Step 4: Run** the server tests and build. Expected: PASS.
- [ ] **Step 5: Commit.** `Add the recalculation API`

### Task 6: Queue page (droidppboard client)

**Files:**
- Create:
  - `client/src/pages/PrototypeRecalcQueue.tsx`
  - `client/src/components/recalc/RecalcAddForm.tsx`, `RecalcQueueList.tsx`, `RecalcFullRunPanel.tsx`
  - `client/src/hooks/useRecalcQueue.ts`, `client/src/utils/recalcApi.ts`, `client/src/styles/recalc.css`
  - `docs/superpowers/plans/2026-10-18-recalculation-queue-checklist.md`
- Modify: `client/src/App.tsx` (route `/prototype/queue`), and the menu or prototype pages (a "Recalculation queue"
  link)

**Interfaces:**
- Consumes: the Task 5 routes and the `app-structures` types from Task 3; `AuthContext` for the logged-in user.
- `useRecalcQueue(variant: string | null): { view: RecalcQueueView | null; error: string | undefined; reload(): void }`
  polls every 3 s while `document.visibilityState === "visible"`.

- [ ] **Step 1: Build the page** with the layout from the spec's "Queue page" section, in the board's existing dark
  style:
  - **Left: the add form.** Variant picker (`title ?? name`), uid or username, a "Me" button, and the allowance line.
    Visitors get a link to `/login` instead of the form.
  - **Right: the queue.** Header with count, calculators, estimated wait, and "Show global queue". A full-run line,
    plus Start, Stop, and Start over (with a confirm) when `canManageFullRuns`. Rows with status, score count and bar,
    pp change, a profile link, and the failure reason. Own entries are highlighted, with a remove button on own
    waiting entries (all waiting entries for admins). Then "Recently finished".
  - **Selection.** The variant picker selects the queue. Global rows show a variant tag.
- [ ] **Step 2: Run** `pnpm --filter droidppboard-client build`. Expected: succeeds without type errors.
- [ ] **Step 3: Write the manual checklist,** in the style of the variant management checklist. Cover:
  - prerequisites: `DPP_SCORE_SERVICE_URL`, `DPP_SCORE_SERVICE_KEY`, and the broker from Task 1 deployed. Also, the
    board's beatmap service key (`DROID_SERVER_INTERNAL_KEY`) must have no per-minute limit, or one high enough for a
    full run (about 100 beatmap lookups per player times the calculators). Otherwise `429`s fail players;
  - the visitor view;
  - the limit and the cooldown;
  - duplicates;
  - private variant isolation between two accounts;
  - a failing player (stop a processor mid-calculation);
  - a full run with pause and resume, stop, and start over;
  - removing entries.
- [ ] **Step 4: Run the app** locally against staging services and walk the checklist's visitor, queue, and full-run
  steps.
- [ ] **Step 5: Commit.** `Add the recalculation queue page`

### Task 7: Retire `/recalc` (Mahiru)

**Files (delete, from `origin/master`):**
- `src/interactions/commands/osu! and osu!droid/recalc/`
- `src/interactions/autocomplete/osu! and osu!droid/recalc/`
- `src/localization/interactions/commands/osu!droid Elaina PP Project/recalc/`
- `src/localization/utils/managers/PrototypeRecalculationManager/`
- `src/structures/pp/RecalculationQueue.ts`
- `src/utils/managers/PrototypeRecalculationManager.ts`
- `src/utils/pp/prototypeVariants.ts` with its `.test.ts`, and `src/utils/pp/profileCalculation.ts` with its
  `.test.ts`. Only the manager uses them.
- `PrototypePPCollectionManager.cloneToVariant` and `getUnscannedPlayers`, if nothing else uses them after the
  deletions.

- [ ] **Step 1: Delete,** then
  `git grep -n "PrototypeRecalculationManager\|RecalculationQueue\|prototypeVariants\|profileCalculation\|RecalcLocalization"`.
  Expected: no hits.
- [ ] **Step 2: Run** Mahiru's build and tests (`npm run build` / `npm test`, or what `package.json` defines).
  Expected: PASS.
- [ ] **Step 3: Note the rollout in the PR description:**
  - deploy after the board's queue is live;
  - then remove the registered `recalc` slash command with Mahiru's undeploy command (see
    `Bot.registerDeployCommands`).
- [ ] **Step 4: Commit.** `Retire /recalc in favor of the droidppboard queue`
