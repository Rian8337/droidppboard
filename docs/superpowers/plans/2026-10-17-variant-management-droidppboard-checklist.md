# Variant management manual checklist (droidppboard)

Manual checks for the variant-based prototype pages, login, and the management pages. Run these against a staging deployment before release. Each step lists the exact action and the result to expect.

## Prerequisites

- Server environment:
    - `NODE_ENV=production`. The session cookie (`ppboard_session`) is only marked `Secure` when this is set, so run the server this way for the login checks below.
    - `DPP_BROKER_URL` pointing at the running broker.
    - `DPP_BROKER_KEY`, the board's broker key. It must have `can_act_for_users` and must have no grants and no all-variants access of its own. Otherwise visitors would see private variants through the board's own key.
    - `TURNSTILE_SECRET_KEY`.
- Client build environment:
    - `REACT_APP_TURNSTILE_SITE_KEY`, set at client build time (not at runtime).
- Data:
    - At least one public variant and one private variant.
    - Test accounts, each with an osu!droid account: one with no role, one with a grant on the private variant, one manager, one admin.
    - One banned account.
- Broker must be running for all steps except the broker-stopped step.

## Steps

1. **Visitor sees only public variants.**
   - Action: Open the board in a private browser window (no session). Open the prototype selector.
   - Expected: Public variants are listed. The private variant is not listed.

2. **Each kind of user logs in and sees their variants.**
   - Action: For each test account (no role, granted, manager, admin), go to `/login`, log in with its osu!droid username and password, and open the prototype selector.
   - Expected: Login succeeds and the header shows Logout. The no-role account sees only public variants. The granted account also sees the private variant it was granted. The manager and admin accounts see all variants they are allowed to manage.

3. **Wrong password four times shows the delay.**
   - Action: On `/login`, enter a valid username with a wrong password. Submit it four times in a row.
   - Expected: The first three attempts show "Invalid username or password". The fourth attempt shows "Too many login attempts. Please try again later." followed by "Try again in N seconds." (N is about 2 for the first lockout). Submitting before the countdown ends is refused with the same message.

4. **A banned account is refused.**
   - Action: On `/login`, log in with the banned account's correct password.
   - Expected: The page shows "Invalid username or password". The account is not logged in and the header does not show Logout.

5. **Logout hides the private variants.**
   - Action: Log in as the granted account. Open the private variant. Click Logout in the header.
   - Expected: After logout the private variant is hidden right away, without a page reload. The prototype selector no longer lists it. Opening its URL directly shows "Variant not found".

6. **Logout while viewing a private variant hides it immediately.**
   - Action: Log in as the granted account and stay on a page for the private variant. Click Logout while that page is open.
   - Expected: The private variant's content disappears from the page immediately. The page no longer shows its data and falls back to the public variants.

7. **A manager edits a title and a multi-line description and sees it in Mahiru within 60 seconds.**
   - Action: Log in as the manager. Open `/manage`, select a variant, change its title, and enter a description with at least three lines. Save.
   - Expected: The save succeeds. Within 60 seconds the new title and every line of the description appear in Mahiru.

8. **A manager cannot toggle visibility.**
   - Action: Log in as the manager. Open the variant's management page.
   - Expected: No visibility toggle is shown. If the request is sent directly to the API, the server refuses it.

9. **An admin creates a key and sees the raw key once.**
   - Action: Log in as the admin. Open `/manage/keys`, create a key with a name, and copy the raw key shown.
   - Expected: The raw key is shown once, right after creation. Reloading the page or opening the keys list again does not show the raw key; only the key's name and metadata appear.

10. **An admin cannot revoke the board's own key.**
    - Action: Log in as the admin. Open `/manage/keys` and try to revoke the board's own broker key.
    - Expected: The revoke is refused with HTTP 409 and the key stays active.

11. **A cross-site POST is refused.**
    - Action: From another origin not in the server's CORS origin list, send a POST to `/api/manage` or `/api/auth` (for example, with `curl -H "Origin: https://example.invalid"`) while logged in.
    - Expected: The response is HTTP 403. No change is made.

12. **Broker stopped shows the unavailable message.**
    - Action: Stop the broker. Open a prototype page (leaderboard, profile, or top plays) for any variant.
    - Expected: The page shows "The variant list is unavailable". Start the broker again and reload; the variants load normally.

13. **Not-logged-in management access is refused.**
    - Action: In a private window with no session, open `/manage`.
    - Expected: The page does not show management content. A direct request to `/api/auth/me` answers "Not logged in" with HTTP 401.
