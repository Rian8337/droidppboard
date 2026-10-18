# Client Redesign Design

Date: 2026-10-18
Status: Draft, pending author review

## Context

droidppboard's client (`client/`) was built while its author was learning React. It works, but it grew page by page:

- **Stack:** Create React App (`react-scripts` 5), TypeScript 4.9, React 18, React Router 6, framer-motion 6 page
  fades, about 800 lines of global CSS in 14 files, bundled Exo fonts. Every page calls `fetch` itself; state lives in
  hand-written context "navigators" under `client/src/hooks/`. **There are no tests**, and CI (`.github/workflows/ci.yml`)
  builds and tests only the server.
- **Layout:** a banner header (`components/Header.tsx`) with the login/logout link inside it, a flat row of nine nav
  buttons (`components/menu/Menu.tsx`), then the page.
- **Variants are the core of the site,** but they are picked through a "Current Variant" dropdown repeated on the
  leaderboard, top plays, and profile pages (the variant is the last URL segment), and through a separate picker on
  the recalculation queue page.
- **Weak spots the author called out:** the login placement; the plain manage pages; the API keys page renders every
  key as a full edit form, stacked, at a width that suits neither phone nor desktop; the queue page mixes recently
  finished entries into the queue and does not explain what a "full run" or "start over" does; overall the design
  feels bland.

The site is used on desktop, phones, and tablets, **mobile first**.

The new design follows a reference site the author uses (an osu! pp rework board): a slim pink top bar, a collapsible
sidebar listing the reworks, and tabs inside each rework. Screenshots of it were shared during brainstorming; the
relevant details are written out below so this document stands alone. Mockups made during brainstorming are in
`.superpowers/brainstorm/321859-1792298844/content/` (`layout.html`, `style-v2.html`; git-ignored). `style-v2.html` was
approved as the look.

## Intent

Refresh the client's design and its tech stack in one go, so it is pleasant on a phone, looks like the reference, is
organised around variants, and is maintainable and tested. Along the way, add a few features the reference has that
the board lacks (a real per-variant calculator against live, calculation snapshots, per-variant admin), and the small
backend changes they need.

## Goals

- Variant-first navigation: a sidebar of variants; each variant has tabs for its pages.
- The reference's look (colours, density, Torus font), dark only.
- Works well at phone width; desktop uses the extra room.
- Modern stack: Vite 8, React 19 with the React Compiler, TypeScript 7, current libraries.
- Unit and component integration tests; end-to-end tests where viable; CI runs all of them.
- Per-variant administration: a manager manages only the variants they have access to.
- Replaces the old client in a **single switch-over** deploy.

## Non-goals

- Modernising the server's own stack (Express setup, build, database layer). Only the endpoints this project needs
  change, and they get tests in the server's existing Vitest setup.
- A light theme.
- osu! (standard) mode anywhere on the site **except the Beatmap calculator tool** (see "Beatmap calculator"). The
  board is otherwise strictly for osu!droid variants.
- Reworking skin pages or match history beyond moving them into the new shell (see "Other pages").
- Changing what a recalculation computes or the shape of `prototypepp` documents.

## Anti-goals

- **Leaking private variants.** A variant a person cannot see never appears to them anywhere: sidebar, tabs, queue,
  calculator, links, snapshots. This holds today and must keep holding.
- **Showing `droid-live` or osu! variants as something to pick.** `droid-live` is what is deployed in the game, so
  there is nothing to test on it. It stays the baseline every comparison is made against.
- **Hand-rolling solved problems,** such as Markdown parsing or screenshotting a DOM node. Use established libraries.
- **Losing the phone experience** to a desktop-first layout. Every screen is designed at 390px wide first.
- **Hover-only interactions.** Tablets get the desktop layout without a mouse.

## Backend changes (part of this project)

The redesign depends on these. They ship as part of this project.

### Broker (`~/Projects/dpp-processor-backend/apps/broker`)

1. **Per-variant managers.** Today every variant-scoped admin endpoint only calls `requireRole(..., "manager")`
   (`src/controllers/AdminController.ts`), so any manager can edit any variant. Change it so that:
   - **admin:** manages every variant, plus roles and API keys (unchanged);
   - **manager:** manages a variant **only if they have a grant on it** (the existing `user_variants` grant). This
     covers `PATCH /admin/variants/:name`, the alias routes for that variant, and
     `GET/PUT/DELETE /admin/variants/:name/grants/...`;
   - changing a variant's visibility (`public`) stays admin-only, as today;
   - `GET /admin/variants` for a manager lists only the variants they have a grant on;
   - a grant alone, without the manager role, still only means "can see and use this private variant";
   - **granting and removing access** (decided after review): a manager may only grant or remove access for people
     with **no role**. Only admins grant or remove access for managers (that is what makes someone a manager of a
     variant) or admins. A manager can never remove their own access. The broker enforces this; the Admin tab hides
     the remove button where it would be refused.
   For aliases, the variant the alias points to (or will point to) is the one checked. Exact handling of moving an
   alias between two variants is left to the builder, but a manager must have a grant on every variant involved.
2. **Last updated time.** Each processor's manifest records `builtAt` (`apps/processor/src/manifest/manifest.ts`). The
   broker **already returns `builtAt` and `calculatorVersion` on variant summaries**
   (`apps/broker/src/controllers/variantSummary.ts`), read from a single `lastInfo` per variant. The change is to make
   `builtAt` the newest across the variant's healthy instances (`null` when it has none), and to make sure the admin
   variant list carries it too. `calculatorVersion` is a 16-character hex hash, not a counter, so the calculator's
   result header shows the hash (shortened is fine).
3. Tests for both, in the broker's existing Vitest setup. Both changes are backward compatible with the current
   board, so the broker can deploy first.

### droidppboard server (`server/`)

1. **Variant lists for the site exclude `droid-live` and non-droid variants.** `server/src/utils/visibleVariant.ts`
   already keeps only droid variants (`mode` droid or `null`); it must also drop `droid-live` from anything the
   sidebar or tabs use. The builder checks every route that returns variants to the client. `droid-live` stays usable
   internally as the baseline (for example `server/src/recalculation/ProfileCalculator.ts`). Requests naming
   `droid-live` (or an osu! variant) on public routes answer as if the variant does not exist.
2. **The calculator becomes per variant and compares against live.** Today
   `server/src/routes/api/ppboard/calculate-beatmap.ts` always calculates `droid-rebalance` (or `droid-live` for the
   non-prototype page) **and** an osu! calculation. The new endpoint takes a variant, calculates the score in that
   variant and in `droid-live`, and returns both (difficulty, performance, strain chart for each, plus the beatmap's
   title and its stats after mods). No osu! calculation. Visibility is checked for the acting person, as other variant
   routes do. Mods arrive serialized with their settings (see "Mod picker"); custom speed and difficulty adjust come
   through the mods, not separate fields. Beatmap input is a link or ID, or an uploaded `.osu` file.
3. **"Calculate my score on this beatmap."** For a logged-in person, find their own best score on a given beatmap and
   calculate it in the variant and in `droid-live`. This is already possible:
   `ScoreServiceClient.getOnlineScore(uid, hash, variant, actingUid)` with `best=true` fetches the stored best score
   and calculates it with any variant (`server/src/recalculation/ScoreServiceClient.ts`). If they have no score on
   the map, say so.
   **"Best" means best by pp, not by total score** (the game stores these separately). `best=true` is the right
   lookup: the score service's `OnlineScoreService` then reads the best-pp table ordered by pp
   (`OfficialScoreRepository.findBestScores`), while without it it reads the leaderboard score (`findScore`, best by
   total score). The builder makes sure `best=true` is what gets sent.
4. **Calculation snapshots ("Generate link").** Store a snapshot of a finished calculation: the parameters and the
   full result for both variant and live (including the strain charts and beatmap title), the variant name, its
   calculator version if known, and when it was made. Return a short ID. A public read route returns it. Store in
   MongoDB alongside the board's other data (collection name and ID format are the builder's call). The variant's
   visibility is checked on read: a snapshot of a private variant is only readable by people who can see that variant.
   Snapshots work for uploaded `.osu` files too, because they store the result, not the file.
   - **Only logged-in people can create snapshots**; anyone (who can see the variant) can open one.
   - **Snapshots expire** (decided after review: the author does not want them kept forever). Default **30 days**
     after creation (my call), configurable by an environment variable; a MongoDB TTL index removes them. An expired
     link shows "This snapshot has expired" with a link to the calculator.
   - Rate limit creation per person (my call: the board's existing rate-limit helper, a few per minute).
5. **The Beatmap calculator tool uses the same calculator route** as the variant Calculator tab (item 2), which must
   therefore also accept `droid-live`, `osu-live`, and `osu-rebalance` when called for this tool (live variants:
   no comparison; `osu-rebalance`: compared against `osu-live`). Everywhere else, `droid-live` and osu! variants stay
   hidden (item 1). How the route tells the two uses apart is the builder's call. Today's
   `calculate-beatmap.ts` (which always calculates a droid and an osu! variant together) is replaced.
6. **The server serves Vite's output** (`client/dist`) instead of CRA's `client/build` (`server/src/index.ts` and
   `Util.getFrontendPath()`).
7. Tests for each changed route in the server's existing Vitest setup.

## Site structure

### Shell

- **Top bar** (pink, as the reference):
  - Left: a square button that toggles the sidebar. It shows ✕ while the sidebar is open and a drawer (☰) icon while
    it is closed.
  - Title: "PP Board · <variant title or name>" on variant pages; the page name elsewhere. Truncates on a phone.
  - Right: a Discord button linking to the server's Discord (as `components/DiscordServer.tsx` today), and the account
    button: the person's avatar (`https://osudroid.moe/user/avatar?id=<uid>`, used as a plain image; it redirects
    properly, so no special handling) and username with a chevron. It opens a small **dropdown menu** below it, as the
    reference: an icon and label per item, **Admin** (admins only, see "Admin area") and **Log out** in red at the
    bottom. The reference's "Settings" item is left out, since there are no account settings (my call). Logout errors
    show in the menu, as today. Logged out, the menu is replaced by a "Log in" button that goes to `/login` and returns to the
    current page afterwards, as today. On a phone the username is hidden and only the avatar shows.
- **Sidebar:**
  - Top line: site version and an **Issue tracker** link (the GitHub repository's issues), as the reference. No
    changelog link: changelogs belong to variants and are written in their descriptions.
  - "Search variants" box filtering the list by title or name.
  - **One flat list of variants**, with `droid-rebalance` pinned first (pin icon). The rest are ordered by last
    updated, newest first (my call). Each entry: a radio-style dot (filled for the current variant), the title (or
    name if no title), and a second line "<name> | Last updated: <relative time>" from `builtAt`. Private variants
    show the reference's globe icon on the right. Variants with no healthy instance are still listed (pages say the
    variant is unavailable where it matters, as today).
  - A **Tools** section near the bottom: Beatmap calculator, Whitelist, Score multiplier sample.
  - A **Donate <3** entry near the bottom with "Support the website", linking to the About page.
  - At the very bottom, small text: "osu!droid PP Project Site · © <current year> Rian8337" (moved from the old
    footer).
  - Desktop: open by default, pushing content over. Tablet and phone: closed by default and sliding over the page (see
    "Screen sizes and touch"); on a phone it covers the page at full width below the top bar. Picking a variant closes
    it on tablet and phone. Whether the open/closed state is remembered on desktop
    is the builder's call.
- **No footer** beyond what the sidebar holds (my call).

### Routes

The builder picks exact paths; these are suggestions. Old URLs that people may have shared must keep working by
redirecting to their new equivalents:

| Page | Suggested path | Old path(s) to redirect |
|---|---|---|
| Variant leaderboard (home) | `/` → `/v/droid-rebalance/leaderboard` | `/prototype/:type`, `/prototype/leaderboard/:type` |
| Variant tabs | `/v/:variant/{info,leaderboard,top-plays,queue,calculator,admin}` | `/prototype/top-plays/:type`, `/prototype/queue`, `/prototype/calculate` |
| Player profile | `/v/:variant/players/:uid` | `/prototype/profile/:uid/:type` |
| Calculation snapshot | `/v/:variant/calculator/s/:id` (or similar) | – |
| Beatmap calculator | `/calculate` (keeps its current path); its snapshots under `/calculate/s/:id` | – |
| Whitelist | `/whitelist` | – |
| Score multiplier sample | `/score-multiplier` | – |
| About / donate | `/about` | – |
| Login | `/login` | – |
| Admin area | `/admin/...` | `/manage`, `/manage/users`, `/manage/keys` → admin area; `/manage/variants/:name` → that variant's Admin tab (or the admin area's variant settings for variants not in the sidebar) |
| Skin list / preview | `/skin/list`, `/skin/:discordid/:name` (unchanged) | – |
| Match history | `/match_history/:matchid` (unchanged) | – |

`/` opens `droid-rebalance`'s leaderboard (the old home page content moves to About). An unknown or invisible variant
shows a not-found state in the shell.

### Variant view

Above the tabs:

- The variant's **description**, rendered as **Markdown** (use `react-markdown`, raw HTML disabled; GitHub-flavoured
  extras such as tables are the builder's call). Shown collapsed (roughly the first block); **Show more expands the
  whole description in place**; Show less collapses it. Descriptions are written with this in mind, for example a
  red warning line and a changelog link, as the reference. How the red warning is expressed in Markdown is the
  builder's call (a heading style is fine).

Tabs, in order: **Info, Leaderboard, Top plays, Queue, Calculator, Admin**. Admin shows only to people who can manage
the variant (admin, or manager with a grant). Each tab has an icon, as the reference. On a phone the tab row scrolls
sideways, and Leaderboard comes first (Info last) since it is what people open most (my call).

#### Info tab

- The variant's details that exist: internal name, aliases, last updated (absolute date and time, UTC), calculator
  version (if the broker exposes it; otherwise omitted), availability.
- A fixed help block, **the same for every variant**, written into the client: check the Leaderboard tab for your
  recalculated data; add yourself on the Queue tab if your data is outdated or you are missing; most values shown are
  estimates; where to report bugs (Discord). Links go to this variant's tabs.

#### Leaderboard tab

- Toolbar: "Search player" and **Open my profile** (logged in only).
- Table: Rank, Player (country flag and name), Live pp, Local pp (bold), Difference (green/red), and Master pp when
  the variant is not `droid-rebalance` (as today). Sorted by local pp and paged on the server, as today.
- **No rank change and no column sorting** on the leaderboard (decided after review): live rank across the variant is
  not stored anywhere, and per-page values would mislead. Rank change stays on the profile's score table only.
- Phone: stacked rows: rank, player, local pp large on the right; live pp and the difference beneath.
- Clicking a player opens their profile in this variant.

#### Player profile

Follows the reference's player details page.

- **Header strip:** avatar, name, country; then stat blocks: **Local pp, Live pp, Difference** first, then aim, tap,
  accuracy, flashlight and reading pp, and hit accuracy. Master pp only when the variant is not `droid-rebalance`.
  On a phone the stats wrap into a grid.
- **Actions:** Back (to the leaderboard), **Add to queue** (queues this player for this variant; same rules and slot
  count as the Queue tab; logged in only).
- **Toolbar:** Search map, a mod filter (the calculator's mod picker), **Columns** (show or hide less-used columns,
  remembered per browser), **Export to CSV** (the visible rows and columns).
- **Score table:** every column the current profile has, restyled: Rank (with change between live and local
  position, green/red), Map, Live, Local, Difference, Relative difference, SR, SR difference, Mods, Accuracy, Combo
  (highlight full combos, as the reference), 100, 50, Miss (highlight non-zero in red, as the reference), CS, AR, OD,
  plus the difficulty, per-skill pp, hit window, unstable-rate and tap-penalty values shown today. Every column
  sortable; default sort local pp descending. All of this comes from the data the profile already returns (each
  score has `live`, `local`, and optional `master` difficulty and performance).
- **Phone:** stays a real table that scrolls sideways, with Rank and Map pinned on the left. This is accepted; the
  table is too wide to do otherwise.
- The reference's other score lists (pinned, manual, flashlight scores) are not included.

#### Top plays tab

The profile's score table across all players, with a Player column added. Same toolbar minus Add to queue.

**Mod filter rule (my call), for both profile and top plays:** a score matches when it has every selected mod,
ignoring mod settings (Custom Speed rate, Difficulty Adjust values). This matches how top plays filters today
(`ModUtil.pcStringToMods` and the `ModMap`-keyed cache in `Util.getTopPrototypePP`), so the top plays endpoint and its
cache keep working; the client converts the picker's selection to the acronym form the endpoint takes. The profile
filters client-side with the same rule.

#### Queue tab

The existing recalculation queue (see `docs/superpowers/specs/2026-10-18-recalculation-queue-design.md`), restyled.
Behaviour and limits do not change. Layout (approved in `style-v2.html`):

- **No variant picker:** the tab belongs to the current variant.
- **Add bar** on top: "Player name or ID", **Add to queue**, and "You can queue N more players". Visitors see "Log in
  to queue players" instead.
- **Recalculating all players** strip, shown only while a full run is going for this variant: a progress bar, "1,240
  of 8,912 players done", failures in this run if any, who started it and when, and a paused state when the variant
  is unavailable. Admins get **Stop** on the strip.
- **Queue** section: Running and Waiting entries only (#, player, queued, queued by, status). A **Show all variants**
  toggle in the section header switches to the global queue (as the current "Show global queue").
- **Recently finished** is its own section below, never mixed into the queue (Done / Failed with reason).
- Phone: the add bar and strip stack; a **Queue / Recently finished** switch picks which list shows; rows stack.
- **Wording for full runs** (the old "Full run", "Start", "Start over" confused people). The builder confirms the exact
  behaviour against `server/src/recalculation/` and adjusts the text if it differs:
  - Title: **Recalculate all players**, with: "Recalculates every player who has a profile in this variant. If you
    stop and start again, players already done are skipped."
  - **Start** / **Continue** (Continue when previous progress exists): picks up where the last run stopped.
  - **Restart from the beginning** (was "Start over"): "Clears the progress of the previous run, so every player is
    recalculated again." Asks for confirmation.
  - Starting controls live in the **Admin tab** (admins only); the strip on the Queue tab shows progress to everyone
    and Stop to admins.

#### Calculator tab

Follows the reference's score calculator, adapted to osu!droid. Desktop: inputs on the left, result on the right.
Phone: the result appears below the form (scroll to it after calculating).

- **Calculate an imaginary score** (main form):
  - Beatmap: link or ID, **or** an uploaded `.osu` file.
  - **Mods:** the mod picker (see below). Custom speed and force CS/AR/OD are mod settings, not separate fields.
  - Max combo (defaults to the beatmap's max), Accuracy.
  - **Legacy total score** (`totalScore`).
  - "If you include any of the fields below, the accuracy field will be ignored, but the result will be more
    precise": 100 count, 50 count, Miss count, **Large tick misses** (`sliderTicksMissed`), **Slider tail misses**
    (`sliderEndsDropped`). The broker's performance request already accepts all of these
    (`dpp-processor-backend/packages/shared/src/schemas.ts`); the board's server passes them through.
  - **Calculate**, **Reset**, and **Load data from result** (puts the last result's values back into the form; not
    available for a snapshot of an uploaded file, since there is no beatmap to recalculate against).
- **Calculate my score on this beatmap** (logged in only; replaces the reference's "Recalculate an existing score"):
  a beatmap field and a button. The result shows in the same result panel.
- No gamemode field.
- **Result panel**, read-only text (not input-looking boxes):
  - Header: variant title/name and calculator version and date if known (as the reference's "Rework: master
    (version 118 – date)").
  - Map title, Mods, Accuracy, Combo (x / max).
  - **Total pp, Live pp, Difference.**
  - Per-skill pp: Aim, **Tap**, Accuracy, Flashlight, Reading (osu!droid says Tap, not Speed).
  - Performance details the droid calculators expose: effective miss count, tap penalty, deviation, tap deviation,
    slider cheese penalty. (They do **not** expose slider-break estimates, so those are not shown.)
  - Difficulty: star rating; aim, tap, rhythm, reading, flashlight difficulty, and the other droid difficulty values
    worth showing (builder's call from the response).
  - Beatmap stats after mods: CS, AR, OD (and HP if available).
  - The **strain graph** (kept from today's calculator).
  - Actions: **Show raw response** (a dialog with the raw JSON and Copy to clipboard), **Generate link** (logged in
    only; creates a snapshot, shows the link with a copy button and when it expires), **Export as image** (captures the result panel; menu: Copy to
    clipboard, Download PNG; use an established DOM-to-image library).
- **Snapshot view** (opening a generated link): the same result panel, read-only, with "Snapshot taken <date>" and the
  variant it was taken on. Load data from result works when the snapshot's beatmap came from a link or ID.

#### Mod picker

Reuse the design of the streaming client's mod picker
(`~/Projects/osu-droid-streaming-client/src/components/controls/ModPicker.tsx`, with `utils/droidMods.ts`,
`utils/modSearch.ts`, `hooks/useFavoriteMods.ts`): a "Select mods" dropdown with a search box, droid mods grouped by
the game's mod-menu categories with icons, favourites pinned in their own section (remembered per browser), incompatible
mods deselected automatically, and inline settings for each selected mod (Custom Speed's rate, Difficulty Adjust's
CS/AR/OD/HP, and so on). Port it to this codebase's conventions; copying the code is fine. Mods travel as serialized
mods (`ModUtil.serializeMods`). Mod icons: the client already has some under `client/src/icons/mods/`; any missing ones are copied from the
streaming client (`~/Projects/osu-droid-streaming-client/public/icons/`).

#### Admin tab

For people who can manage this variant (admin, or manager with a grant on it). Follows the reference's Admin tab:

- Buttons: **Edit settings**, **Grant access to user** (managers: people with no role only; admins: anyone), **Grant access to key** (admins only), and for admins,
  **Recalculate all players** controls (Start/Continue, Restart from the beginning, with the wording above).
- **Edit settings** (dialog or panel): title, description, available, aliases (add/remove), and visibility
  (public/private; admins only).
- **Description editor, redesigned for Markdown:** a text area with a **Write / Preview** switch on phone and tablet,
  and side by side (write left, preview right) on desktop. The preview renders exactly as the variant page does,
  with the same Markdown setup, and shows both the collapsed view (what shows before Show more) and the full text.
  A short "Markdown supported" hint links to a basic syntax reference. The length limit counter stays
  (`maxVariantDescriptionLength`). Changelog links and warnings are written here.
- **Access table:** who and what can use this variant:
  - granted users: uid, username, role, remove button (shown only where the viewer may remove: admins for anyone;
    managers only for people with no role, never themselves);
  - for admins, API keys with a grant on this variant (remove button) and keys with "all variants" (shown as
    inherited, no remove). The broker has no per-variant key query; filter the full key list (`GET /admin/keys`),
    which includes each key's grants.
- Limits and validation as today's manage pages (`client/src/utils/manageApi.ts`: title and description lengths).

### Admin area

Opened from the account menu, **admins only**. Not in the sidebar.

- **API keys:** a compact list (name, rate limit, scope: all variants or N variants, can act for users, created,
  status active/revoked), with a search box and paging if long. Selecting a key opens its editor in a panel or page:
  rate limit, all variants, act for users, per-variant grants, revoke (with confirmation). **Create key** opens the
  same editor; the raw key is shown once after creation, with a copy button and a warning that it will not be shown
  again (as today). This fixes the old page showing every key's full form at once.
- **Roles:** the site-wide roles (admin, manager): a list of people with a role, set or remove a role by uid.
- **All variants:** every variant including `droid-live` and osu! variants (which have no sidebar entry), with the
  same settings and access controls as the Admin tab. This is the only place those variants appear (my call).

### Beatmap calculator

A tool in the sidebar's Tools section, for a different job than testing a variant: people give a beatmap link or ID,
or upload their own custom beatmap (`.osu` file), to see **star rating and performance values**, mostly on live. Many
people used the old live calculator for this.

**It is the variant Calculator tab (see "Calculator tab"), with a variant picker limited to four variants:**
`droid-live` (the default), `droid-rebalance`, `osu-live`, and `osu-rebalance`. These always exist and are never
removed. No other variant appears here, and the picker is the only difference in how it is built: same inputs, same
result panel, same actions.

- **Comparison against live** (my call): `droid-rebalance` compares against `droid-live`, and `osu-rebalance` against
  `osu-live`, exactly as a variant's Calculator tab does. For the two live variants there is nothing to compare, so
  the result shows the values alone (no Live pp or Difference).
- **osu!standard variants** show osu!standard's own values and names (Speed, not Tap; osu!standard's performance and
  difficulty attributes). Mods come from the same osu!droid mod picker; if a selected mod or setting does not exist in
  osu!standard, the result says which were ignored (conversion is the builder's call, using `@rian8337/osu-base`).
- **Calculate my score on this beatmap** is offered for the osu!droid variants only, since the scores are osu!droid
  scores.
- **Generate link, Load data from result, Show raw response, Export as image:** as in the Calculator tab. Snapshots
  of these four variants follow the same rules (logged-in to create, expire).
- Visitors who are not logged in can calculate, as today.

### Other pages

- **Whitelist:** the same table style, with search and sorting as today. The filter-syntax help table becomes a
  collapsible "How to filter" section.
- **Score multiplier sample:** beatmap field plus the mod picker, then the restyled old-vs-new multiplier table.
- **About:** the old home page content (about, donation links, donor list), tidied up.
- **Login:** a centred card at `/login` in the new style: username, password, Turnstile, as today. Returns to the
  previous page after logging in.
- **Skin list / preview, match history:** still used (Mahiru's `/skin` command links to skins; match history is used
  for tournaments) but not part of the site's purpose. They keep their URLs, move into the new shell, and get the new
  table and text styles. No other work, and they stay out of the navigation.

### Removed

- The prototype calculator page (`/prototype/calculate`); it becomes each variant's Calculator tab (redirect to
  `droid-rebalance`'s).
- The old home page as a landing page (its content moves to About).
- framer-motion page fades (my call).

## Screen sizes and touch

Three layouts (widths are my call; the builder may adjust them slightly):

- **Phone, under 640px:** as described per page (drawer at full width, stacked leaderboard rows, one-column
  calculator, profile stats in a grid).
- **Tablet, 640–1023px** (most tablets in portrait): the sidebar is a drawer, closed by default, sliding over the page
  at its normal width (not full width). Tables show their real columns (the leaderboard is a table, not stacked rows).
  The calculator stays one column with the result below. The profile's stat strip fits on one or two rows.
- **Desktop, 1024px and up** (including landscape tablets such as an iPad): sidebar open by default and pushing the
  content; two-column calculator.

Touch (tablets get the desktop layout without a mouse):

- Nothing depends on hover. Tooltips (table headers, the private-variant globe) also open on tap; remove buttons are
  always visible.
- On touch devices (`pointer: coarse`, not screen width), buttons, tabs, sidebar entries, and clickable table rows are
  at least 44px tall. With a mouse, the layout stays as dense as the reference.
- Sideways-scrolling tables scroll smoothly by finger, with pinned columns staying put.
- The mod picker's dropdown and every dialog (raw response, edit settings, key editor) fit within the screen and
  scroll inside themselves.

## Look and feel

Match the reference (approved mockup `style-v2.html`). Values from the mockup, for the builder to refine:

- Top bar `#f06c9b`; page background `#2b2b2b`; sidebar `#252525`; panels `#313131`; inputs `#363636`; lines
  `#3b3b3b`.
- Accent (active tab, active variant, links in the sidebar) `#ff6ba0`; primary buttons `#d8336d`; secondary buttons
  `#5a2a3a` with pink text.
- Positive differences `#6fd36a`; negative `#ff4d5e`; warnings `#ff3b4a`.
- **Font: Torus**, replacing Exo. Font files: `~/Projects/osu-droid-streaming-client/public/fonts/` (Thin, Light,
  Regular, SemiBold, Bold, Heavy `.otf`); `@font-face` rules: `~/Projects/osu-droid-streaming-client/src/index.css`.
  Copy both. Remove the Exo fonts.
- Dense tables, bold headers, as the reference. Icons for tabs and sidebar items from an icon library (the builder
  picks one; the streaming client uses Font Awesome).
- `color-scheme: dark`, as the streaming client.
- Background image and banner (`public/background.jpg`, `icons/header.png`) go away.

## Tech stack

Use the streaming client (`~/Projects/osu-droid-streaming-client`) as the template for setup and conventions.

- **Vite 8**, **React 19** with the **React Compiler** (as the streaming client: `@vitejs/plugin-react` with
  `babel-plugin-react-compiler` through `@rolldown/plugin-babel`), **TypeScript 7** (the streaming client is on 6;
  use 7 here).
- **React Router**, current major.
- **TanStack Query** for all server data: caching, loading and error states, refetching after login/logout (what
  people can see depends on who they are; nothing is kept across a login or logout, as today), and polling the queue.
  It replaces the context "navigators" in `client/src/hooks/` and the per-page `fetch` calls.
- **CSS modules** plus one global stylesheet for tokens (colours, fonts) and resets.
- **oxlint** and **oxfmt**, as the streaming client. The root `format-code*` scripts switch to oxfmt for the client.
- `react-markdown` for descriptions; an established DOM-to-image library for Export as image.
- Current versions of everything else (`@rian8337/osu-base` stays on the version the rest of the workspace uses).
- `app-structures` (`modules/app-structures`) stays the shared types package.
- `react-helmet-async` is no longer needed: React 19 renders `<title>` and `<meta>` directly.
- Turnstile keeps working as today (`hooks/useTurnstile.ts`), with its site key read through Vite env variables
  (`VITE_...`) instead of `REACT_APP_...`. The builder updates any docs or `.env` examples that name the old variable.
- The dev server proxies `/api` to `http://localhost:3001`, as CRA's `proxy` does today.

## Testing

- **Unit tests (Vitest):** pure logic: sorting, rank changes and differences, mod-picker selection rules, beatmap link
  and ID parsing, URL and redirect mapping, CSV export, snapshot handling, variant list ordering.
- **Component integration tests (Vitest, Testing Library, jsdom, MSW for the API):** whole pages rendered against a
  mocked API, testing what a person does. At least:
  - picking a variant shows its leaderboard; the sidebar never lists `droid-live`, osu! variants, or variants the
    person cannot see;
  - Show more expands the description; Markdown renders and raw HTML does not;
  - queueing a player updates the queue and the slot count; recently finished stays separate;
  - calculating shows variant, live and difference; Load data from result fills the form; Generate link opens a
    snapshot view;
  - the Beatmap calculator offers exactly the four variants, compares rebalance against live, shows osu!standard's
    own names for osu! variants, and accepts a link, an ID, or an uploaded `.osu` file;
  - the Admin tab shows only for admins and for managers with a grant on that variant; key controls only for admins;
    a manager sees no remove button for managers, admins, or themselves;
  - Generate link shows only when logged in; an expired snapshot shows the expired state;
  - the API keys list opens one key's editor; a created key's raw value is shown once;
  - login returns to the previous page; logout clears what was loaded.
- **End-to-end (Playwright):** against the production build, **with the same mocked API** (no real server, MongoDB or
  broker), at desktop, tablet portrait (about 768×1024), and phone viewport sizes. A few key flows: open the site and land on `droid-rebalance`'s
  leaderboard; switch variants through the sidebar and the phone drawer; open a profile; log in; queue a player;
  calculate a score. If a real-server setup turns out viable later, it can be added; it is not required.
- **Server and broker:** tests for every changed route, in their existing Vitest setups.
- **Run tests with a single worker** on the author's machine (WSL2 runs out of resources otherwise), for example
  Vitest `--no-file-parallelism --maxWorkers=1` and Playwright `--workers=1`. Put the flags in the package scripts so
  they apply by default, and tell anyone (including subagents) running tests.

## CI

`.github/workflows/ci.yml` gains, beside the existing server job:

- **Client:** install, typecheck, oxlint, oxfmt check, Vitest, production build.
- **End-to-end:** build the client, install Playwright's browsers, run Playwright.

The broker repo's CI (`~/Projects/dpp-processor-backend/.github/workflows/ci.yml`) runs the new broker tests (it
likely already runs all tests; the builder checks).

## Shipping

- Built on a branch; the new client replaces `client/` in place.
- **Order:** the broker change first (backward compatible with the current board), then the server and client
  together in one switch-over deploy.
- After merge, write a **runbook** at `~/runbooks/client-redesign-rollout.md` in the format of
  `~/runbooks/variant-management-rollout.md`: a table of projects and PRs, why the order matters, a status checklist,
  and lettered sections with exact commands and checks (including that the server now serves `client/dist`, any
  renamed env variables such as the Turnstile site key, and checking the old URLs redirect). It is used in a separate
  session to deploy, so it must stand alone.

## Left to the builder

- Exact route paths (within the redirect requirement), component structure, file layout.
- Snapshot ID format and collection name.
- How the broker gets `builtAt` from processors.
- Exact columns hidden by default on the profile, and the default page size of tables.
- Icon library; exact spacing and sizes, within the approved look.
- Whether the desktop sidebar state is remembered.
