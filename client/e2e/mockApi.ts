import type { Page, Route } from "@playwright/test";
import type { RecalcEntryView } from "app-structures";
import type { Me } from "../src/api/auth";
import {
    alphaProfile,
    buildQueueEntry,
    buildQueueView,
    droidCalculation,
    droidRebalance,
    leaderboardPlayers,
    plainMe,
    readingVariant,
    topPlays,
} from "../tests/mocks/fixtures";

export interface MockApiOptions {
    /** Who `GET /api/auth/me` answers with before anybody logs in. `null` (the default) is a visitor. */
    me?: Me | null;
}

const variants = [droidRebalance, readingVariant];

/** Stands in for Cloudflare's Turnstile script: solves the challenge as soon as the widget is drawn. */
const turnstileScript = `
window.turnstile = {
    render(container, options) {
        container.textContent = "Captcha solved";
        setTimeout(() => options.callback("e2e-token"), 0);
        return "e2e-widget";
    },
    reset() {},
    remove() {},
};
`;

/** A 1px picture, for the avatars and other images that the site loads from osudroid.moe. */
const placeholderImage =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#555"/></svg>';

function fulfillJson(route: Route, body: unknown, status = 200) {
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

/**
 * Answers every request to `/api/**` of the page from the fixtures the component tests use, the
 * Turnstile script and the images of osudroid.moe, so a test needs neither a server nor the
 * internet. The state a flow changes lives here: logging in changes who `GET /api/auth/me`
 * answers with, and queuing a player puts them in the queue the next `GET /api/recalc/queue`
 * answers with.
 */
export async function mockApi(page: Page, options: MockApiOptions = {}): Promise<void> {
    let me: Me | null = options.me ?? null;
    const queue: RecalcEntryView[] = [];

    await page.route("https://challenges.cloudflare.com/**", (route) =>
        route.fulfill({ contentType: "application/javascript", body: turnstileScript }),
    );

    await page.route("https://osudroid.moe/**", (route) =>
        route.fulfill({ contentType: "image/svg+xml", body: placeholderImage }),
    );

    await page.route("**/api/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const endpoint = `${request.method()} ${url.pathname}`;

        switch (endpoint) {
            case "GET /api/auth/me":
                return me
                    ? fulfillJson(route, me)
                    : fulfillJson(route, { message: "Not logged in" }, 401);
            case "POST /api/auth/login":
                me = plainMe;

                return fulfillJson(route, { uid: plainMe.uid, username: plainMe.username });
            case "POST /api/auth/logout":
                me = null;

                return route.fulfill({ status: 204 });
            case "GET /api/ppboard/variants":
                return fulfillJson(route, variants);
            case "GET /api/ppboard/prototype/getleaderboard":
                return fulfillJson(route, leaderboardPlayers);
            case "GET /api/ppboard/prototype/getuserprofile":
                return url.searchParams.get("uid") === String(alphaProfile.uid)
                    ? fulfillJson(route, alphaProfile)
                    : fulfillJson(route, { message: "Player not found!" }, 404);
            case "GET /api/ppboard/prototype/gettopplays":
                return fulfillJson(route, topPlays);
            case "GET /api/recalc/queue":
                return fulfillJson(
                    route,
                    buildQueueView({
                        variant: url.searchParams.get("variant"),
                        queue: [...queue],
                        allowance: me
                            ? { active: queue.length, maxActive: 3, cooldownRemainingSeconds: 0 }
                            : null,
                    }),
                );
            case "POST /api/recalc/queue": {
                const body = request.postDataJSON() as { variant: string; username?: string };
                const entry = buildQueueEntry({
                    id: `entry-${queue.length + 1}`,
                    variant: body.variant,
                    username: body.username ?? "Alpha",
                    position: queue.length + 1,
                });

                queue.push(entry);

                return fulfillJson(route, entry, 201);
            }
            case "POST /api/ppboard/calculate":
                return fulfillJson(route, droidCalculation);
            default:
                return fulfillJson(route, { message: `Not mocked: ${endpoint}` }, 501);
        }
    });
}
