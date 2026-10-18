# Recalculation queue manual checklist (droidppboard)

Manual checks for the recalculation queue page (`/prototype/queue`) and the `/api/recalc` routes behind it. Run these against a staging deployment before release. Each step lists the exact action and the result to expect.

## Prerequisites

- Deploy order: the broker change must be deployed first (dpp-processor-backend, branch `recalculation-queue`). The board reads each variant's healthy instance count from it, and the broker enforces access on the calculations themselves. Without it the queue cannot tell how many players a variant may calculate at once.
- Server environment, on top of the variable management settings in `2026-10-17-variant-management-droidppboard-checklist.md`:
    - `DPP_SCORE_SERVICE_URL`, the base URL of the score service that answers `GET /online-scores`.
    - `DPP_SCORE_SERVICE_KEY`, the board's key for the score service. The board sends the person who queued an entry (or the admin who started a full run) as `X-Acting-Uid`, so the key must be allowed to act for users.
    - `RECALC_MAX_ACTIVE_PER_PERSON`: how many waiting or calculating entries one person may have across all variants. Default 5. The steps below assume it is lowered to 2 in staging so the limit is quick to reach.
    - `RECALC_ADD_COOLDOWN_SECONDS`: the wait between two adds by the same person. Default 10. The steps below assume 10.
    - `RECALC_FINISHED_RETENTION_MINUTES`: how long finished and failed entries stay under "Recently finished". Default 60. Lower it (for example to 2) to see entries leave the list.
- Beatmap service key: the board's `DROID_SERVER_INTERNAL_KEY` must have no per-minute rate limit, or one high enough for a full run. One player needs about 100 beatmap lookups per calculator, and a variant runs as many players at once as it has healthy instances. If the limit is lower, the beatmap service answers `429` and players fail with an upstream error.
- Data:
    - One public droid variant with at least two healthy instances (calculators), and one private droid variant with at least one.
    - A variant with no healthy instance, or one whose instances can be stopped, for the unavailable steps.
    - A variant with a few thousand `prototypepp` profiles at most for the full-run steps (a full run of the live variant takes a long time), or a copy of a small dataset.
    - Test accounts, each with an osu!droid account: two with no role (call them A and B), one with a grant on the private variant (C), one admin. A third no-role account that has no grant stands in for "cannot see the private variant" (A or B).
    - A handful of players to queue, each with a few top scores. One archived player and one uid that does not exist.
- Rate limits: the board answers at most 30 requests per 10 seconds per IP on `/api/recalc`, and the page polls every 3 seconds while its tab is visible. A few tabs are fine; many tabs from one IP will start to answer `429`.
- Broker and score service must be running for all steps except the ones that stop them.

## Steps

1. **A visitor sees the queue but gets a login link instead of the form.**
   - Action: Open `/prototype/queue` in a private browser window (no session).
   - Expected: The page lists the queue and "Recently finished" for the public variants. The left panel shows "Log in to add players to the queue." with a link to `/login`, and no form. There are no Remove buttons and no full-run controls. Only public variants appear in the "Show global queue" view.

2. **The menu links to the page.**
   - Action: Look at the menu on any page, and click "Recalculation Queue".
   - Expected: The link opens `/prototype/queue`.

3. **Logged in people get the form and the allowance line.**
   - Action: Log in as A and open `/prototype/queue`.
   - Expected: The form shows a variant picker (each variant by its title, or its name if it has none), a player box, a "Me" button and "Add to queue". The line below reads "You have 0 of 2 players waiting (all variants) · you can add now". The picker lists only variants A can see.

4. **Queueing by uid, by username and with "Me".**
   - Action: As A, queue a player by typing their uid. Wait for the cooldown. Queue another by username. Wait. Click "Me" and queue yourself.
   - Expected: Each add shows "Added <name> to the queue." and the row appears within about 3 seconds (right away after the add). A row shows its position, player, how long ago it was added, who queued it, and its status. "Me" fills in A's uid. A's own rows are highlighted; rows queued by B are not.

5. **Progress and the result of a calculation.**
   - Action: Queue a player and watch the row without reloading.
   - Expected: The status goes from "Waiting" to "Calculating: N/total scores" with a bar that grows, then to "Done: <live>pp → <local>pp" with a "Profile" link. The link opens `/prototype/profile/<uid>/<variant>` and shows the new totals. The row then sits under "Recently finished" (and leaves the queue list). The header shows the number of calculators and an estimated wait such as "under a minute" or "~2 min" (or "unknown" when the queue cannot tell).

6. **The per-person limit counts all variants together.**
   - Action: As A with a limit of 2, queue a player in one variant and another player in a second variant (waiting out the cooldown between adds), while both are still waiting or calculating. Then try a third.
   - Expected: The third is refused with "You can have at most 2 players waiting or calculating". The allowance line reads "You have 2 of 2 players waiting (all variants)". Once an entry is done or failed it stops counting, and a new add works.

7. **The cooldown.**
   - Action: As A, queue a player and immediately queue another.
   - Expected: The second is refused with "Wait N seconds before adding another player" (N is at most 10). The allowance line counts down ("next add in 0:08") without reloading, and reads "you can add now" at zero. Another account (B) is not held up by A's cooldown.

8. **Duplicates.**
   - Action: As A, queue a player. While it is waiting or calculating, queue the same player for the same variant again (as A, then as B). Then queue the same player for a different variant.
   - Expected: The repeats for the same variant are refused with "This player is already queued for this variant", and they do not start a cooldown. The different variant is accepted. After the first entry has finished, queueing the same player again works.

9. **Players that cannot be queued.**
   - Action: As A, queue the archived player, then a uid that does not exist, then a username that does not exist.
   - Expected: "This player is archived" for the archived one and "Player not found" for the other two. A variant with no healthy instance is refused with "This variant is unavailable".

10. **A private variant stays private between two accounts.**
    - Action: As C, open `/prototype/queue`, pick the private variant and queue a player. Leave the entry in place (or keep it calculating). Then, in a second browser as A (no grant), open the page and tick "Show global queue".
    - Expected: A does not see the private variant in the picker, the entry in the global queue, a variant tag for it, or a private variant's full run. Opening `/prototype/queue` as A and removing C's entry through the API (`DELETE /api/recalc/queue/<id>`) answers 404 "Entry not found", not 403. After C logs out, the page no longer shows the private variant to C either.

11. **Global queue.**
    - Action: As A with entries in two variants, tick "Show global queue".
    - Expected: One list shows entries of every variant A can see, each with a variant tag. Calculators is the total, and no estimated wait is shown. Unticking returns to the selected variant, without tags.

12. **A failing player.**
    - Action: Queue a player. While it is calculating, stop one of the variant's processors (or the score service).
    - Expected: The row becomes "Failed: <reason>" (for example "Failed to fetch top scores") and moves to "Recently finished". Nothing is written to that player's `prototypepp` profile. It is not retried by itself. Start the processor again and queue the player again: it calculates normally. Also queue a player with no top scores: it fails with a reason.

13. **Removing entries.**
    - Action: With a variant of one calculator, queue a long player and then two more as A (raise the limit if needed). Click Remove on a waiting row. Then, as B, look at A's rows. Then, as the admin, look at them.
    - Expected: A can remove A's own waiting rows, and the row disappears within a moment. A calculating row has no Remove button. B sees no Remove button on A's rows. The admin sees a Remove button on every waiting row, and removing someone else's works. If a row starts calculating just before the click, the page shows "Only waiting entries can be removed" and refreshes.

14. **Queued entries are calculated before a full run.**
    - Action: As the admin, start a full run (step 15), then queue a player as A in the same variant.
    - Expected: A's player is picked up within seconds, not after the full run. Full-run progress keeps moving afterwards.

15. **A full run: start, pause and resume.**
    - Action: As the admin, select the variant and click Start in the "Full run" panel. Then, while it runs, stop the variant's instances (or take it unavailable in the broker), wait a minute, and bring them back.
    - Expected: The line reads "Full run in progress: N of total players. Started by <admin> just now." with a bar. The count grows. While the variant is unavailable it reads "Full run paused (variant unavailable)", and it goes back to "in progress" by itself when an instance is healthy again. Players in flight when it went down count as failed in the line (", N failed").

16. **A full run: stop and continue.**
    - Action: Click Stop. Then click Start again.
    - Expected: Stop changes the line to "Full run stopped" and the count stops. Start continues from where it was: the done count does not go back to zero, and finished profiles are not calculated again. Restarting the server while a run is going leaves it stopped, and Start continues it.

17. **A full run: start over.**
    - Action: Click "Start over" and cancel the confirmation, then click it again and confirm. (Start over is shown only while no run is going.)
    - Expected: Cancelling does nothing. Confirming resets the variant's profiles to unscanned: the done count starts at 0 and the run begins again. For a variant with no `prototypepp` profiles, Start first clones those of `droid-rebalance`.

18. **Everyone sees a full run, only admins control it.**
    - Action: While a run is going, open the page as A, as a visitor, and as C (for a private variant's run).
    - Expected: A and the visitor see the line, the progress and who started it, with no Start, Stop or Start over. C sees the private variant's run, and A does not. In the global queue every visible variant's run is listed, each with its variant tag. In a selected variant's view, only that variant's run is shown. A direct `POST /api/recalc/full-runs/<variant>/start` as A answers 403 "Only admins can manage full runs".

19. **A second run and a stopped run.**
    - Action: As the admin, click Start for a variant whose run is already going (in two tabs), and Stop for a variant with no run.
    - Expected: "A full run of this variant is already running" and "No full run of this variant is running". Two variants can have a full run at once, each limited by its own calculators.

20. **The variant never runs more players than it has calculators.**
    - Action: With a variant of two healthy instances, start a full run and queue several players.
    - Expected: At most two players of that variant show as calculating at the same time (queued entries plus the full run together). The header's calculators shows 2.

21. **The page survives a stopped broker.**
    - Action: Stop the broker and look at the page for a few polls, then start it again.
    - Expected: The page shows "The variant service is unavailable" above the last list it had. It recovers by itself when the broker is back. Queueing while it is down shows the same message.

22. **Polling stops in a background tab.**
    - Action: Open the page, switch to another tab for a minute, and watch the network log (or the server log) of the board.
    - Expected: No `/api/recalc/queue` requests are sent while the tab is hidden. When you come back, the list refreshes right away.

23. **Cross-site writes are refused.**
    - Action: While logged in, send a state-changing request from a foreign origin, for example:
      `curl -i -X POST -H "Origin: https://example.invalid" -H "Cookie: ppboard_session=<session token>" -H "Content-Type: application/json" -d '{"variant":"droid-rebalance","uid":1}' https://<board host>/api/recalc/queue`
    - Expected: The response is HTTP 403 with the body `{"message":"Forbidden"}`, and nothing is queued.

24. **Finished entries leave the list.**
    - Action: With `RECALC_FINISHED_RETENTION_MINUTES` set low, wait that long after an entry finishes.
    - Expected: The entry disappears from "Recently finished" after about that many minutes.
