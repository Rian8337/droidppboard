# Variant management manual checklist (droidppboard)

Manual checks for the variant-based prototype pages, login, and the management pages. Run these against a staging deployment before release. Each step lists the exact action and the result to expect.

## Prerequisites

- Server environment:
    - The session cookie (`ppboard_session`) is marked `Secure` by default, so the site must be served over HTTPS: browsers drop `Secure` cookies over plain HTTP, and login would appear to succeed but not stick. Set `NODE_ENV=development` only for local HTTP development (`NODE_ENV=test` also turns `Secure` off); leave it unset or `production` in staging and production.
    - `SESSION_SECRET`, a long random string. It keys the fingerprint of each account's password hash that is stored with its session, so changing the password ends the session. If it is unset the server still starts, but logs a warning at startup and the fingerprints are not keyed. Changing it later ends every session.
    - `DPP_BROKER_URL` pointing at the running broker.
    - `DPP_BROKER_KEY`, the board's broker key. It must have `can_act_for_users` and must have no grants and no all-variants access of its own. Otherwise visitors would see private variants through the board's own key.
    - `TURNSTILE_SECRET_KEY`.
- Broker and data prerequisites:
    - `droid-live`, `droid-rebalance`, `osu-live` and `osu-rebalance` are public in the broker. Step 14 runs the beatmap calculator as a visitor to confirm it.
    - In the `prototypepp` collection, `reworkType` `overall` has been renamed to `droid-rebalance`, and the `fc-time` and `acc-pp-removal` entries have been deleted.
    - The board's broker key has `can_act_for_users` before go-live. Without it, the broker refuses the board's requests on behalf of logged-in people.
    - `req.ip` is the real client IP. Check this once in staging with step 16. If Cloudflare or nginx is in front of the server, configure nginx with `real_ip_header CF-Connecting-IP` and Cloudflare's IP ranges (`set_real_ip_from`), or adjust Express's `trust proxy` setting. Otherwise every visitor shares one IP and the per-IP login limit hits everyone at once.
- Client build environment:
    - `REACT_APP_TURNSTILE_SITE_KEY`, set at client build time (not at runtime).
- Data:
    - At least one public variant and one private variant.
    - Test accounts, each with an osu!droid account: one with no role, one with a grant on the private variant, one manager, one admin.
    - One banned account.
- Rate limits: login allows 10 attempts per IP per 15 minutes, and successful logins count toward that limit. Spread the run out, or reuse sessions instead of logging in again for every step.
- Broker must be running for all steps except the broker-stopped step.

## Steps

1. **Visitor sees only public variants.**
   - Action: Open the board in a private browser window (no session). Open the prototype selector.
   - Expected: Public variants are listed. The private variant is not listed.

2. **Each kind of user logs in and sees their variants.**
   - Action: For each test account (no role, granted, manager, admin), go to `/login`, log in with its osu!droid username and password, and open the prototype selector.
   - Expected: Login succeeds and the header shows Logout. The no-role account sees only public variants. The granted account also sees the private variant it was granted. Managers and admins see every variant, private ones included.

3. **Wrong password triggers the throttle.**
   - Action: On `/login`, enter a valid username with a wrong password and submit three times. Each of the three failures is free and shows "Invalid username or password". Then submit a fourth attempt within 2 seconds of the third failure.
   - Expected: The fourth attempt shows "Too many login attempts. Please try again later." followed by "Try again in N seconds.", where N is at most the current delay (2 seconds after the third failure). If you wait more than 2 seconds, the attempt is no longer throttled and shows "Invalid username or password" instead; each attempt needs a fresh Turnstile token, so repeat the attempt with a new token to see the throttle again.

4. **A banned account is refused.**
   - Action: On `/login`, log in with the banned account's correct password.
   - Expected: The page shows "Invalid username or password". The account is not logged in and the header does not show Logout.

5. **Logout hides the private variants.**
   - Action: Log in as the granted account. Open the private variant. Click Logout in the header, then open the prototype selector.
   - Expected: After logout the prototype selector no longer lists the private variant, without a page reload. Opening its URL directly shows "Variant not found".

6. **Logout in place hides a private variant that is open.**
   - Action: Log in as the granted account and stay on the private variant's page (no reload). Click Logout in the header.
   - Expected: The private variant's title, description, and rows disappear right away. The page refetches the same private name as a visitor and shows "Variant not found" with an empty selector. No private data remains on the page.

7. **A manager edits a title and a multi-line description and sees it in Mahiru within 60 seconds.**
   - Action: Log in as the manager. Open `/manage`, select a variant, change its title, and enter a description with at least three lines. Save.
   - Expected: The save succeeds. Within 60 seconds the new title and every line of the description appear in Mahiru.

8. **A manager cannot toggle visibility.**
   - Action: Log in as the manager. Open the variant's management page.
   - Expected: No visibility toggle is shown. If the request is sent directly to the API, the server refuses it.

9. **An admin creates a key and sees the raw key once.**
   - Action: Log in as the admin. Open `/manage/keys`, create a key with a name, and copy the raw key shown.
   - Expected: The raw key is shown once, right after creation. Reloading the page or opening the keys list again does not show the raw key; only the key's name and metadata appear.
   - Cleanup: Revoke or delete the test key afterwards.

10. **An admin cannot revoke the board's own key.**
    - Action: Log in as the admin. Open `/manage/keys`, find the board's key by the name it was created with, and click Revoke. Confirm the prompt.
    - Expected: The revoke is refused with HTTP 409. The error appears on the page and the key stays active. Turning off "act for users" on that key is also refused.

11. **A cross-site POST is refused.**
    - Action: While logged in, send a state-changing request from a foreign origin, for example:
      `curl -i -X POST -H "Origin: https://example.invalid" -H "Cookie: ppboard_session=<session token>" https://<board host>/api/manage/<any path>`
      The session token is the `ppboard_session` cookie value from your browser.
    - Expected: The response is HTTP 403 with the body `{"message":"Forbidden"}`. No change is made.

12. **Broker stopped shows the unavailable message.**
    - Action: Stop the broker. Open a prototype page (leaderboard, profile, or top plays) for any variant.
    - Expected: The page shows "The variant list is unavailable". Start the broker again and reload; the variants load normally.

13. **Not-logged-in management access is refused.**
    - Action: In a private window with no session, open `/manage`.
    - Expected: The page does not show management content. A direct request to `/api/auth/me` answers "Not logged in" with HTTP 401.

14. **Public variants calculate for a visitor.**
    - Action: In a private browser window (no session), open the beatmap calculator and calculate a beatmap with each of `droid-live`, `droid-rebalance`, `osu-live` and `osu-rebalance`.
    - Expected: All four calculations succeed and show results. None of them answers "Variant not found" or an error about the variant being unavailable.

15. **Changing the osu!droid password ends the board session.**
    - Action: Log in to the board as a test account and keep the tab open. In another browser, change that account's osu!droid password on the official site. Back in the first tab, reload the page or open `/manage`.
    - Expected: The board session ends on the next request: the header shows Login instead of Logout and the session cookie is cleared. Logging in with the new password works. Restore the old password afterwards if the account is shared.

16. **The client IP is the real one.**
    - Action: On `/login`, submit a wrong password for a test account. Read the server log line `Failed login from <ip> for username "<name>"`.
    - Expected: `<ip>` is the address you are connecting from, not `127.0.0.1`, the nginx host or a Cloudflare address. If it is not, fix the proxy configuration as described in the prerequisites before go-live.
