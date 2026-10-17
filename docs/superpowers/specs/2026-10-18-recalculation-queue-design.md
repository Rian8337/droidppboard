# Recalculation Queue Design

Date: 2026-10-18
Status: Draft, pending review

## Context

Prototype profiles (`prototypepp` in MongoDB, one document per player per variant, keyed by `uid` and `reworkType`) are
recalculated today only by Mahiru's `/recalc` Discord command (`~/Projects/Mahiru`):

- `/recalc calculate` queues one player for a variant. The queue is in memory and works one player at a time.
- `/recalc calculateall` (bot owner) loops over every unscanned player of a variant (`scanDone: false`) in its own
  loop, beside the `calculate` queue, hitting the same processors at the same time. It can reset progress first, and
  clones `droid-rebalance` profiles into a variant that has none.
- `/recalc queue` lists the waiting uids.

Mahiru's variant management work (Mahiru PR #15, merged) already made `/recalc` variant-aware:
`PrototypeRecalculationManager.calculatePlayer(uid, variant, actingUid?)` on Mahiru's `master` calculates each top
score through the score service's `GET /online-scores` three times:

- **live:** `droid-live`;
- **local:** the chosen variant;
- **master:** `droid-rebalance`, only when the chosen variant is not `droid-rebalance`.

It then writes the profile with totals and `scanDone: true`. One player takes a few seconds.

The variant management spec (`~/Projects/dpp-processor-backend/docs/superpowers/specs/2026-10-17-variant-management-design.md`)
listed droidppboard's profile "calculation" page as a non-goal and built login so it could sit behind it later. **This
queue page is that page.**

## Intent

Recalculation moves from Discord to droidppboard. A logged-in person picks a variant they can see, queues any player
for it, and watches a live queue with each player's status. Admins start full runs of a variant from the same page.
Mahiru's `/recalc` is retired completely.

## Goals

- Anyone logged in can queue any osu!droid player for any droid variant the broker lets them see.
- A per-person limit stops anyone flooding the queue.
- A live queue page, laid out side by side: add form on the left, queue on the right (decided with mockups; see
  "Queue page").
- The queue is per variant, with a "Show global queue" option across every variant the viewer can see.
- Each variant calculates as many players at once as it has healthy processor instances.
- Admins can start, stop, and restart from scratch a full run of a variant from the board. Everyone on the queue page
  sees a full run's progress.
- Mahiru's `/recalc` command is removed.

## Non-goals

- Managers starting full runs. Admin only for now, because only the owner deploys variant changes. The permission
  check must be one place that is easy to widen to managers later.
- Donor priority, or anything else from the reference screenshot beyond the layout idea of a form beside a live list.
- Notifications outside the page (Discord pings, email).
- Changing what a recalculation computes or the shape of `prototypepp` documents.
- Recalculating live dpp (Mahiru's support ticket "recalc" preset is about live dpp and is unrelated; leave it).

## Anti-goals

- Leaking private variants. A variant a person cannot see never appears to them: not in the picker, not in the
  global queue, not as a tag on someone else's entry, not in full-run progress. Asking for it answers as if it does
  not exist, as on the rest of the board.
- Overloading processors. Queue and full run together never run more players of a variant at once than it has
  healthy instances (the problem with Mahiru's two parallel loops).
- Permission checks duplicated against the broker. Variant visibility and roles come from the broker for the acting
  uid; the board only applies them.

## Decided

### Who can queue

- **Login required** to queue. Visitors can view the queue page and see the queue, but get a login prompt instead of
  the form (my call).
- Any player can be queued by anyone, for a variant visible to the queuer: resolved through the broker with the
  queuer's uid as acting uid, as `resolveVisibleVariant` does today. Only droid variants (`mode` droid), as the
  prototype selector shows.
- **Limits per person**, both in server config (environment variables) so they can change without a code change:
  - at most **5** of their entries waiting or calculating at once, **counted across all variants together**;
  - a **cooldown of about 10 seconds** between adds.
  Finished and failed entries do not count. Refusals say which limit was hit and, for the cooldown, how long to wait.
- **Rejected when queuing** (my call):
  - player not found or archived, matching Mahiru;
  - variant not visible or not found;
  - variant currently unavailable (no healthy instance);
  - the same player already waiting or calculating for the same variant. This is not counted against the cooldown.
- The person who queued an entry can remove it while it is still waiting. Admins can remove any waiting entry (my
  call).

### How a player is calculated

- Same as Mahiru's `master` `calculatePlayer` (port it): top scores, beatmap info, and the live, local, and master
  calculations through the score service's `GET /online-scores`. The result is written to `prototypepp` in the same
  shape Mahiru writes, including `scanDone: true`.
- **One change to the port: upstream errors fail the player** (decided after review). Mahiru skips any score whose
  live, local, or master call returns nothing and saves the rest. On the board, the calculation must tell apart:
  - **real skips:** the score is skipped and the profile saved without it, as today. For example, the beatmap
    cannot be found, or the score service answers that the score cannot be calculated.
  - **upstream errors:** the whole player fails and nothing is written. For example, the score service, broker,
    processor, or beatmap service cannot be reached, times out, or answers with a server error.

  Which score service and beatmap service answers count as which is for the builder to pin down from those services'
  error responses. A player with no top scores fails, as in Mahiru.
- A queued entry that fails is shown as **Failed** with the reason. It is not retried automatically; the person can
  queue it again. This includes an entry whose variant becomes unavailable mid-calculation.
- The acting uid sent to the score service (`X-Acting-Uid`) is the person who queued the entry, or the admin who
  started a full run. The broker then enforces access on the calculation itself as well.
- **Calculators per variant:** a variant processes as many players at once as it has healthy instances. The live and
  master variants (`droid-live`, `droid-rebalance`) are shared by every queue. Bounding their load beyond this is
  left to the builder (see "Left to the builder").

### Full run

- **Admins only** (broker `GET /me` role `admin`), checked in one place.
- One background job per variant, **not** thousands of queue entries.
- **Priority:** when a calculator in a variant frees up, a waiting single request gets it first. The full run only
  uses calculators no queued player is waiting for. Single requests still finish within seconds during a full run.
- **Resumable:** progress is the existing `scanDone` flag per profile, so a stop or a server restart loses nothing.
  After a restart the run is stopped; an admin presses Start again to continue (my call). Mahiru did not auto-resume
  either.
- **Start over** resets `scanDone` to `false` for that variant's profiles first, as Mahiru's `resetprogress` did.
- If a variant has no `prototypepp` documents yet, starting a full run first clones `droid-rebalance`'s, as the
  variant management spec specifies for Mahiru today.
- **Failures in a full run** (decided after review). Unlike Mahiru, a failed player is never marked `scanDone`.
  - It stays unscanned and is retried later in the same run, up to **3 attempts** in total.
  - After that, the run moves on and the player stays unscanned, so the next Start picks them up again.
  - Attempt counts live in memory (the `prototypepp` shape does not change) and reset on restart. That is fine,
    because they only bound retries within one run.
  - The progress line shows how many players failed in this run, alongside done of total.
- **Variant unavailable mid-run:** the run pauses (shown as paused on the page) and resumes by itself when the variant
  has a healthy instance again. Players in flight when it went down count as failed attempts.
- More than one variant can have a full run going at once (my call). Each is limited by its own variant's
  calculators.
- Everyone on the queue page sees, for variants they can see: that a full run is going, players done of total, and
  who started it (my call). Admins also see Start, Stop, and Start over.

### Queue page

The page lives behind the board's existing navigation. Route and menu placement are left to the builder; suggestion:
`/prototype/queue`, linked from the prototype pages. Layout, decided with mockups (side by side, like the reference
screenshot but in the board's own style):

- **Left: add form.**
  - Variant picker, showing `title ?? name` like the prototype selector.
  - One of: uid or username.
  - A "Me" button that fills in the logged-in person's uid.
  - "Add to queue".
  - Below the form, the person's allowance: "You have 2 of 5 players waiting (all variants) · next add in 0:08".
- **Right: live queue for the selected variant.** The variant picker drives both the form and the list.
  - Header: queue length, calculators (healthy instances), estimated wait, and a "Show global queue" checkbox.
  - Full-run progress line when one is going, plus admin controls for admins.
  - One row per entry: position, player name, when it was added, who queued it, and status:
    - **Waiting**: waiting for a calculator;
    - **Calculating**: with a score count, for example "62/100 scores", and a progress bar;
    - **Done**: live pp total to the variant's new total (`livePPTotal` → `localPPTotal`, as the profile page compares them; my call, since a first calculation has no previous total) and a link to the profile (`/prototype/profile/:uid/:variant`);
    - **Failed**: with the reason (for example "Failed to fetch top scores").
  - The viewer's own entries are highlighted.
  - A "Recently finished" section keeps finished and failed entries visible for a while (builder picks how long,
    suggestion: 1 hour).
- **"Show global queue" ticked:** one list across every variant the viewer can see, each row tagged with its variant.

The page updates live without a reload. Polling every few seconds is fine (my call); a server push is acceptable if
the builder prefers it.

### Retiring Mahiru's `/recalc`

Remove from Mahiru (`master`):

- the `/recalc` command, its subcommands, and its autocomplete;
- `RecalculationQueue`;
- `PrototypeRecalculationManager`;
- the localization used only by those.

Keep anything still used elsewhere, such as `PrototypePPCollectionManager` methods that `/pp prototype` and
`/leaderboard` use. Deploy the board's queue before, or together with, the Mahiru removal, so there is no gap
without recalculation.

## Constraints

- **Repositories.**
  - droidppboard (`~/Projects/droidppboard`): most of the work.
  - dpp-processor-backend (`~/Projects/dpp-processor-backend`): the broker needs to expose each variant's healthy
    instance count to the board, which today only the manager-only `GET /admin/variants` (`instanceCount`) shows.
    Suggestion: add a healthy-instance count to the variant summary from `GET /variants` and `GET /variants/:name`.
  - Mahiru (`~/Projects/Mahiru`): the removal.
- **The board server is one process** (the login throttle already relies on this), so queue state can live in
  memory. Waiting entries are lost on restart (my call, matching Mahiru); full-run progress is not, because it lives
  in `scanDone`.
- **Existing board pieces to build on:**
  - sessions and `res.locals.uid` (`sessionMiddleware`);
  - `requireAllowedOrigin` on state-changing routes;
  - `BrokerClient` (`getVariants`, `getMe`) and `resolveVisibleVariant`;
  - the official database pool (`server/src/database/official`) for top scores and player lookup, as Mahiru queries
    it;
  - `OsuDroidAccounts` for username lookups;
  - the beatmap service at `localhost:3017` (`Util.getBeatmap` uses its `getbeatmap` route by id; Mahiru's
    `BeatmapProcessorRESTManager` uses the same service by hash).
- **New configuration:** score service URL and key (the score service's single `API_KEY`, as Mahiru's
  `DPP_SCORE_SERVICE_KEY`), and the two limit numbers.
- **Style:** existing board conventions (Express routers under `server/src/routes/api/...`, shared types in
  `modules/app-structures`, Vitest on the server, 4-space indentation).
- **Logs:** never log session tokens or keys. Logging uid, variant, and outcome per calculation is fine.

## Left to the builder

- Route names and response shapes for queuing, removing, listing the queue, and full-run controls (all mutating
  routes behind a session and `requireAllowedOrigin`).
- Whether the score count shown while calculating counts scores attempted or scores finished.
- The estimated wait formula (suggestion: waiting entries ÷ calculators × recent average time per player).
- How long finished entries stay visible.
- How the worker learns about instance count changes (re-reading variants periodically is fine).
- Whether to put a global cap on concurrent calls to the shared `droid-live` and `droid-rebalance` variants, if many
  variants are busy at once.
- Visual styling, matching the board's existing pages and dark theme.
