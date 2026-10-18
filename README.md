Leaderboard website for experimental osu!droid performance point

## Server configuration

- `SNAPSHOT_TTL_DAYS`: how many days a stored calculation snapshot can be opened before it expires. Defaults to `30`; a value that is not a positive number is ignored.

## Client configuration

- `VITE_TURNSTILE_SITE_KEY`: the Cloudflare Turnstile site key of the login page. It is read when the client is built, so set it (for example in `client/.env.production.local`) before running `pnpm --filter droidppboard-client build`. The server serves the build output from `client/dist`.
