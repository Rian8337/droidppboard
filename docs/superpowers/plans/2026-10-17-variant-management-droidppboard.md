# Variant Management, Step 3 (droidppboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- droidppboard reads variants from the broker instead of the `prototypepptype` collection.
- Anyone with an osu!droid account can log in (Turnstile plus brute-force limits), and logged-in people see their
  private variants.
- Managers and admins manage variants, access, roles, and API keys from the board.

**Architecture:**
- **Server.** The Express server gains:
  - a broker client that always acts for the session's uid (or nobody);
  - an osu!droid password verifier against the official database;
  - an in-memory login throttle;
  - Mongo-backed sessions;
  - `/api/auth/*` and `/api/manage/*` routes. The `/api/manage/*` routes forward to the broker's `/admin/*` routes,
    so the broker stays the only place that enforces roles.
- **Public pages.** The prototype routes gate every variant through the broker list for the current person.
- **Client.** The React client gets an auth context, a login page, and management pages.

**Tech Stack:** Express 4, MongoDB, mysql2 (official database), React 18 with create-react-app and react-router 6,
Cloudflare Turnstile, Vitest (new, server only).

**Spec:** `~/Projects/dpp-processor-backend/docs/superpowers/specs/2026-10-17-variant-management-design.md`, section
"3. droidppboard". The broker API is in that repo's `apps/broker/README.md` and `packages/shared/src/types.ts`.

## Global Constraints

- **Branch and commits.** Work in a git worktree of `~/Projects/droidppboard` on branch `variant-management`. Commit
  after every task.
- **Default variant.** It is `droid-rebalance`, replacing `overall` everywhere.
- **Login access.** Anyone with an osu!droid account can log in. Banned and archived accounts are refused.
- **Login errors.** Every failure answers `Invalid username or password`. Turnstile failures may answer
  `Captcha verification failed`.
- **Brute-force limits.** Kept in memory:
  - per username: after 3 failures, attempts are refused for 2, 4, 8 … seconds, capped at 15 minutes; this resets
    after an hour without failures or on success;
  - per IP: 10 attempts per 15 minutes;
  - globally: more than 100 failures in 5 minutes refuses all logins for 5 minutes;
  - every failure is logged with the IP and username, never the password.
- **Sessions.**
  - A random 32-byte token in an `HttpOnly`, `SameSite=Strict` cookie that is `Secure` in production.
  - MongoDB stores only its SHA-256 hash, with the uid, `createdAt`, and `expiresAt` (TTL index).
  - A session expires after 1 day without use, and use pushes `expiresAt` to now + 1 day, but never past
    `createdAt` + 7 days. To limit writes, the push happens only when `expiresAt` would move by more than 5 minutes
    (my call).
  - Logout deletes the session.
  - Banned and archived status is re-checked on every authenticated request.
- **Mutating requests.** Every state-changing request (not GET or HEAD) under `/api/auth` and `/api/manage` must carry
  an `Origin` from the server's existing CORS origin list, otherwise it gets `403`.
- **Logs.** Raw API keys, passwords, session tokens, descriptions, and titles are never logged.
- **Broker calls.** The server's broker key acts for the logged-in uid (`X-Acting-Uid`), or sends no acting uid for
  visitors. A variant the person cannot see is answered as if it does not exist (`404`).
- **Official site code.** The password formulas come from the deployed official site's `user/login.php` (a private
  repository). Never copy them into comments, docs, or commit messages beyond what the code needs.
- **Style.** Follow existing conventions: 4-space indentation, Express routers in `server/src/routes/...`, shared
  types in `modules/app-structures`.

## Decisions This Plan Adds to the Spec

- **Generic management proxy.** `/api/manage/<path>` forwards to the broker's `/admin/<path>` with the same method and
  JSON body. The broker enforces roles, so the board keeps no per-route role table.
- **Usernames for display.** `GET /api/manage/usernames?uids=1,2` returns usernames from the official database, so
  grants and roles show names.
- **Server-only Vitest and a CI workflow** (`server` build plus tests on pushes to `master` and on pull requests),
  matching Mahiru.
- **Turnstile site key at build time.** The client gets it from `REACT_APP_TURNSTILE_SITE_KEY`.
- **The beatmap calculator is unchanged** (spec non-goal).

## Review Focus

1. **A visitor requesting a private variant's leaderboard, profile, or top plays must get `404`**, including top plays
   served from the precomputed cache. Test (Task 4): `answers private variants as not found for visitors`.
2. **A password check against an account whose stored hash is in the legacy form must still succeed**, and a wrong
   password must fail for both forms. Test (Task 2): `accepts current and legacy hashes`.
3. **One username being brute-forced must not lock out a different username from the same NAT'd IP before the IP
   limit.** Test (Task 2): `limits usernames independently`.
4. **A session used continuously for 8 days must end at day 7.** Test (Task 3): `never extends past seven days`.
5. **A management write without an allowed `Origin` must not reach the broker.** Test (Task 5):
   `rejects state-changing requests from other origins`.

---

### Task 1: Server test setup, CI, broker client, variant types

**Files:**
- Create: `server/vitest.config.mts`, `server/src/clients/BrokerClient.ts`,
  `server/src/clients/BrokerClient.test.ts`, `modules/app-structures/src/structures/PPVariant.ts`,
  `.github/workflows/ci.yml`
- Modify: `server/package.json` (devDependency `vitest` pinned exactly, script `"test": "vitest run"`),
  `server/tsconfig.json` (exclude `**/*.test.ts`), `modules/app-structures/src/index.ts`

**Interfaces:**
- **`PPVariant`.** `interface PPVariant { name: string; title: string | null; aliases: string[]; description: string | null; available: boolean; mode: "droid" | "osu" | null; algorithm: "live" | "rebalance" | null }`,
  exported from `app-structures` (the broker's `VariantSummary` minus build info).
- **Broker client.** `BrokerClient` (static methods; base URL `DPP_BROKER_URL`, key `DPP_BROKER_KEY`, both already
  used by `calculate-beatmap.ts`):
  - `getVariants(actingUid?: number): Promise<PPVariant[] | null>` (`GET /variants`; `null` on failure);
  - `getMe(actingUid: number): Promise<{ uid: number; role: "admin" | "manager" | null; grants: string[] } | null>`
    (`GET /me`);
  - `forwardAdmin(method: string, path: string, actingUid: number, body?: unknown): Promise<{ status: number; body: unknown }>`.
    It sends `/admin${path}` and passes the broker's status and JSON body through. If the broker can't be reached, it
    returns `{ status: 502, body: { error: { code: "BROKER_UNAVAILABLE", message: "The variant service is unavailable" } } }`.
  - It sends `X-Acting-Uid` only when an acting uid is given.
- **CI** (`.github/workflows/ci.yml`):
  - Triggers: `push` on `master`, and `pull_request`.
  - Concurrency group: `${{ github.workflow }}-${{ github.ref }}`.
  - One job: checkout, pnpm (version from `packageManager`), Node 22 with pnpm cache, `pnpm install`, then
    `pnpm --filter droidppboard-server build` and `pnpm --filter droidppboard-server test`.
  - No `${{ }}` in `run:` lines.

- [ ] **Step 1: Set up Vitest** in `server`. Confirm `pnpm --filter droidppboard-server test` runs.
- [ ] **Step 2: Write the failing tests** in `BrokerClient.test.ts`, stubbing `globalThis.fetch`:
  - `sends X-Acting-Uid only when acting for a person`;
  - `returns null when the variant list cannot be fetched`;
  - `forwards admin requests with method, path, and body`;
  - `answers 502 when the broker is unreachable`.
- [ ] **Step 3: Run them.** Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** the server tests and `pnpm --filter droidppboard-server build`. Expected: PASS.
- [ ] **Step 6: Commit.** `Add a broker client, server tests, and CI`

### Task 2: Login building blocks

**Files:**
- Create: `server/src/auth/OsuDroidAccounts.ts`, `server/src/auth/passwordHash.ts`,
  `server/src/auth/LoginThrottle.ts`, `server/src/auth/Turnstile.ts`, plus a `.test.ts` beside each of the last
  three

**Interfaces:**
- `passwordMatches(password: string, storedHash: string): boolean` in `passwordHash.ts`. It accepts the stored hash
  in either the current or the legacy formula of the deployed official site's `user/login.php`, including that
  file's trimming. It uses `crypto.timingSafeEqual` on equal-length hex.
- `OsuDroidAccounts.findForLogin(username: string): Promise<{ id: number; username: string; password: string; banned: boolean; archived: boolean } | null>`
  and `OsuDroidAccounts.isActive(uid: number): Promise<boolean>` (not banned and not archived). Both query the
  official database's user table (`bbl_user`) through the existing `officialDb` pool with placeholders.
  `OsuDroidAccounts.getUsernames(uids: number[]): Promise<Map<number, string>>` serves Task 5.
- `class LoginThrottle`, constructed with `now: () => number`. All values are the Global Constraints numbers.
  - `check(ip: string, username: string): { allowed: true } | { allowed: false; retryAfterSeconds: number }`. It also
    counts the attempt against the IP.
  - `recordFailure(ip: string, username: string): void`.
  - `recordSuccess(username: string): void`.
  - Usernames are compared case-insensitively.
- `verifyTurnstile(token: string, ip: string): Promise<boolean>`. It POSTs to
  `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` (`TURNSTILE_SECRET_KEY`), `response`,
  and `remoteip`. Network errors return `false`.

- [ ] **Step 1: Write the failing tests:**
  - `passwordHash`: `accepts current and legacy hashes`. Build each expected hash in the test with the same formula
    as the code, so the test file holds no copied production hashes. Cover a password with `'`, `"`, `\`, `&`, `<`,
    `>`, and surrounding spaces. A wrong password fails for both forms.
  - `LoginThrottle` (fake `now`):
    - `delays a username after three failures` (2 s, then 4 s, capped at 900 s);
    - `resets a username after an hour without failures and on success`;
    - `limits an IP to ten attempts in fifteen minutes`;
    - `limits usernames independently`;
    - `refuses all logins for five minutes after a hundred failures in five minutes`.
  - `Turnstile`: `accepts a successful verification` and `rejects on failure or network error`, stubbing `fetch`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Read the formulas in `/var/www/html/osudroid/user/login.php`.
  - The site runs PHP 8.4, so mirror PHP 8.4's default behavior of the functions it uses. That means
    `htmlspecialchars` with its 8.1+ default flags, which convert `'` as well.
  - Match what the site computes today, not what older PHP versions computed.
  - Leave the database module untested; it is a thin query layer.
- [ ] **Step 4: Run** the server tests and build. Expected: PASS.
- [ ] **Step 5: Commit.** `Add osu!droid login checks, a login throttle, and Turnstile verification`

### Task 3: Sessions and auth routes

**Files:**
- Create:
  - `server/src/auth/SessionStore.ts` and its `.test.ts`
  - `server/src/auth/sessionMiddleware.ts`
  - `server/src/auth/originCheck.ts` and its `.test.ts`
  - `server/src/routes/api/auth/login.ts`, `logout.ts`, `me.ts`
- Modify: `server/src/index.ts` (mount `/api/auth`, `cookie-parser` or a manual cookie parse, and `express.json`
  before the routes, as today), `server/src/database/managers/AliceDBCollection.ts` (session collection
  `ppboardsession`), `server/package.json`

**Interfaces:**
- **Session store.** `class SessionStore`, constructed with a Mongo collection and `now`. Tokens are 32 random bytes
  as base64url; only the SHA-256 hex is stored. A TTL index on `expiresAt` uses `expireAfterSeconds: 0`.
  - `create(uid: number): Promise<string>` returns the raw token.
  - `get(token: string): Promise<{ uid: number } | null>`. It applies the sliding expiry and the seven-day cap.
  - `delete(token: string): Promise<void>`.
- **Session middleware.** `sessionMiddleware` reads the `ppboard_session` cookie and, for a valid session whose
  account `OsuDroidAccounts.isActive`, sets `res.locals.uid`. Otherwise it clears the cookie and leaves
  `res.locals.uid` undefined. It never rejects.
- **Origin check.** `requireAllowedOrigin(allowed: string[])` is middleware that rejects mutating methods without an
  allowed `Origin` (`403`).
- **Routes:**
  - `POST /api/auth/login` takes `{ username, password, turnstileToken }`.
    1. Run the throttle check (`429` with `Retry-After` when refused).
    2. Verify Turnstile.
    3. Run `findForLogin` and `passwordMatches`, and refuse banned or archived accounts.
    4. Then create the session, set the cookie, and respond `{ uid, username }`.

    All credential failures give `401 Invalid username or password` and record a failure.
  - `POST /api/auth/logout` gives `204`.
  - `GET /api/auth/me` gives `401` without a session. Otherwise it returns `{ uid, username, role, grants }`, using
    `BrokerClient.getMe` and the username from `OsuDroidAccounts.getUsernames`. If the broker fails, `role` is `null`
    and `grants` is `[]`.

- [ ] **Step 1: Write the failing tests:**
  - `SessionStore` (in-memory fake collection or `mongodb-memory-server`, pinned exactly):
    - `stores only the token hash`;
    - `slides expiry by a day on use`;
    - `never extends past seven days`;
    - `forgets deleted and expired sessions`.
  - `originCheck`: `allows reads from anywhere` and `rejects state-changing requests from other origins`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** the store, middleware, origin check, and routes. Add `TURNSTILE_SECRET_KEY` to any env
  example the repo has.
- [ ] **Step 4: Run** the server tests and build. Expected: PASS.
- [ ] **Step 5: Commit.** `Add osu!droid login sessions`

### Task 4: Public prototype pages by variant

**Files:**
- Modify:
  - `server/src/routes/api/ppboard/get-leaderboard.ts`, `get-user-profile.ts`, `get-top-plays.ts`
  - `server/src/index.ts` (apply `sessionMiddleware` to `/api/ppboard`)
  - `modules/app-structures/src/structures/PrototypeLeaderboardResponse.ts`
- Create: `server/src/utils/visibleVariant.ts` and its `.test.ts`

**Interfaces:**
- **Visible variant.** `resolveVisibleVariant(name: string | undefined, actingUid?: number): Promise<{ variants: PPVariant[]; current: PPVariant } | "notFound" | "unavailable">`.
  - The name defaults to `droid-rebalance` and matches a name or alias.
  - Only droid-mode variants (or `mode === null`) are offered.
  - A failed list fetch gives `"unavailable"`.
- **Response type.** `PrototypeLeaderboardResponse<T>` becomes `{ variants: PPVariant[]; currentVariant: PPVariant; data: T }`.
  `variants` is the droid prototype list the person can see.
- **Routes.** Each route resolves first. It answers `404 { message: "Variant not found" }` or
  `503 { message: "The variant list is unavailable" }`, then reads `prototypepp` by the canonical name. Top plays
  read `Util.getTopPrototypePP(current.name, …)` only after the gate.

- [ ] **Step 1: Write the failing tests** for `resolveVisibleVariant`, stubbing `BrokerClient.getVariants`:
  - `defaults to droid-rebalance`;
  - `resolves aliases to the canonical name`;
  - `answers private variants as not found for visitors`;
  - `reports an unavailable list`;
  - `offers only droid variants`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** the helper and the three routes.
- [ ] **Step 4: Run** the server tests and build. Expected: PASS. The client build may fail until Task 6, which is
  expected.
- [ ] **Step 5: Commit.** `Serve prototype pages by broker variant`

### Task 5: Management API

**Files:**
- Create: `server/src/routes/api/manage/manage.ts` and its `.test.ts`
- Modify: `server/src/index.ts` (mount `/api/manage` with `sessionMiddleware` and `requireAllowedOrigin`)

**Interfaces:**
- Every `/api/manage` route answers `401` without a session.
- `GET /api/manage/usernames?uids=1,2,3` (at most 100 uids, positive integers) returns `{ [uid]: username }`.
- Every other path (`GET`, `PUT`, `PATCH`, `POST`, `DELETE`) is forwarded with `BrokerClient.forwardAdmin(method, path, uid, body)`.
  - Status and body pass through unchanged.
  - JSON bodies are limited to 64 KB.
  - Logs carry no bodies.

- [ ] **Step 1: Write the failing tests** with supertest (pinned exactly), stubbing `BrokerClient` and setting
  `res.locals.uid` through a test middleware:
  - `requires a session`;
  - `forwards admin requests as the logged-in person`;
  - `rejects state-changing requests from other origins` (the broker stub is not called);
  - `limits usernames lookups to 100 positive uids`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the server tests and build. Expected: PASS.
- [ ] **Step 5: Commit.** `Add the management API`

### Task 6: Client auth and public pages

**Files:**
- Create: `client/src/hooks/AuthContext.tsx`, `client/src/pages/Login.tsx`
- Modify:
  - `client/src/App.tsx` (route `/login`), `client/src/hooks/Providers.tsx`
  - `client/src/components/Header.tsx` (login or logout plus username), `client/src/components/menu/Menu.tsx`
  - `client/src/hooks/PrototypeSelectorNavigator.tsx`, `client/src/components/PrototypeSelector.tsx`,
    `client/src/components/PrototypeDescription.tsx`
  - `client/src/components/leaderboard/LeaderboardTable.tsx`, `client/src/components/leaderboard/LeaderboardItem.tsx`
  - `client/src/components/PlayerProfile.tsx`, `client/src/components/TopPlays.tsx`

**Interfaces:**
- **Auth context.** `AuthContext` provides `{ user: { uid; username; role; grants } | null; refresh(): Promise<void>; logout(): Promise<void> }`,
  loaded from `GET /api/auth/me` on start.
- **Login page.** Username, password, and an explicitly rendered Turnstile widget (script
  `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, site key
  `process.env.REACT_APP_TURNSTILE_SITE_KEY`). The page shows the server's message on failure and `Retry-After` on
  `429`, then navigates back on success.
- **Selector.**
  - It uses `variants` and `currentVariant` and shows `title ?? name`, with values as the canonical names.
  - The default type is `droid-rebalance` everywhere `overall` was used: the menu, the navigator default, and route
    fallbacks.
  - `PrototypeDescription` renders `currentVariant.description`.
  - A `404` or `503` from the API shows its message.
- **Data fetching.** After login or logout, the variant list and current page refetch, so private variants appear or
  disappear.

- [ ] **Step 1: Implement** (no client tests; checked in Task 8's checklist).
- [ ] **Step 2: Run** `pnpm --filter droidppboard-client build`. Expected: success with no new type errors.
- [ ] **Step 3: Commit.** `Add login and variant-based prototype pages to the client`

### Task 7: Client management pages

**Files:**
- Create: `client/src/pages/manage/ManageVariants.tsx`, `ManageVariant.tsx`, `ManageUsers.tsx`, `ManageKeys.tsx`, and
  `client/src/utils/manageApi.ts` (thin `fetch` wrappers for `/api/manage/*` that return `{ ok, status, body }`)
- Modify: `client/src/App.tsx` (routes `/manage`, `/manage/variants/:name`, `/manage/users`, `/manage/keys`),
  `client/src/components/menu/Menu.tsx` (a "Manage" link for managers and admins)

**Interfaces:**
- **Visibility.** Pages show according to `AuthContext.user.role`. Managers see variants only; admins also see users
  and keys. The broker enforces this regardless, and a `403` shows its message.
- **Variants list.** `GET /api/manage/variants`. Each row shows the name, title, public or private, availability,
  instance count, and aliases.
- **Variant page:**
  - Title (≤ 100 characters) and a multi-line description (≤ 4000 characters, with a live counter), saved by
    `PATCH`.
  - A public toggle for admins only, sent as a separate `PATCH { public }`.
  - Aliases: list, add (`PUT /aliases/:alias { variant }`), and remove.
  - Grants: list with usernames (`/usernames`), add by uid, and remove.
- **Users page (admin).** Roles with usernames; set admin, manager, or none.
- **Keys page (admin).** List keys. Create a key: the raw key is shown once with a copy button and is never stored.
  Update the limit, all-variants, and act-for-users; grant and ungrant variants; revoke. Revoke and disable confirm
  first.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** the client build. Expected: success.
- [ ] **Step 3: Commit.** `Add variant, access, role, and key management pages`

### Task 8: Remove rework types and verify

**Files:**
- Delete: `server/src/database/managers/aliceDb/PrototypePPTypeCollectionManager.ts`,
  `modules/app-structures/src/aliceDb/IPrototypePPType.ts`
- Modify: `server/src/database/managers/AliceDBCollection.ts`, `modules/app-structures/src/index.ts`,
  `server/src/database/managers/aliceDb/PrototypePPCollectionManager.ts` (default `reworkType` becomes
  `droid-rebalance`), `server/src/utils/Util.ts` (comments and defaults that say "rework type")
- Create: `docs/superpowers/plans/2026-10-17-variant-management-droidppboard-checklist.md`

- [ ] **Step 1: Remove.** `grep -rn "prototypePPType\|IPrototypePPType\|\"overall\"" server/src client/src modules`
  returns nothing related to prototypes.
- [ ] **Step 2: Write the manual checklist.**
  - Prerequisites: the env vars `DPP_BROKER_URL`, `DPP_BROKER_KEY` (`can_act_for_users`, no own grants),
    `TURNSTILE_SECRET_KEY`, and `REACT_APP_TURNSTILE_SITE_KEY` at client build time; a private variant; and users
    with no role, with a grant, as a manager, and as an admin.
  - Steps:
    - a visitor sees only public variants;
    - each kind of user logs in and sees their variants;
    - a wrong password four times shows the delay;
    - a banned account is refused;
    - logout hides the private variants;
    - a manager edits a title and a multi-line description and sees it in Mahiru within 60 seconds;
    - a manager cannot toggle visibility;
    - an admin creates a key and sees the raw key once;
    - an admin cannot revoke the board's own key (409);
    - a cross-site POST is refused.
- [ ] **Step 3: Run** `pnpm --filter droidppboard-server test`, `pnpm --filter droidppboard-server build`, and
  `pnpm --filter droidppboard-client build`. Expected: all succeed.
- [ ] **Step 4: Commit.** `Remove prototype rework types`
