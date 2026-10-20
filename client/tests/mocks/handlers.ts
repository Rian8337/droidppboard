import { http, HttpResponse, type RequestHandler } from "msw";
import type { PrototypePlayer, PrototypeTopPlay } from "app-structures";
import {
    alphaProfile,
    buildQueueView,
    droidCalculation,
    droidRebalance,
    leaderboardPlayers,
    plainMe,
    readingVariant,
    topPlays,
} from "./fixtures";

/**
 * The server's default answers: nobody is logged in and only public variants exist. Tests change
 * them with `server.use`. Handlers for the endpoints later pages use are added here as they come.
 */
export const handlers: RequestHandler[] = [
    http.get("/api/auth/me", () =>
        HttpResponse.json({ message: "Not logged in" }, { status: 401 }),
    ),
    http.post("/api/auth/login", () =>
        HttpResponse.json({ uid: plainMe.uid, username: plainMe.username }),
    ),
    http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
    http.get("/api/ppboard/variants", () => HttpResponse.json([droidRebalance, readingVariant])),
    http.get("/api/ppboard/prototype/getleaderboard", () => {
        const body: PrototypePlayer[] = leaderboardPlayers;

        return HttpResponse.json(body);
    }),
    http.get("/api/ppboard/prototype/getuserprofile", ({ request }) => {
        const url = new URL(request.url);

        if (url.searchParams.get("uid") !== String(alphaProfile.uid)) {
            return HttpResponse.json({ message: "Player not found!" }, { status: 404 });
        }

        const body: PrototypePlayer = alphaProfile;

        return HttpResponse.json(body);
    }),
    http.get("/api/ppboard/prototype/gettopplays", () => {
        const body: PrototypeTopPlay[] = topPlays;

        return HttpResponse.json(body);
    }),
    http.get("/api/recalc/queue", ({ request }) =>
        HttpResponse.json(
            buildQueueView({ variant: new URL(request.url).searchParams.get("variant") }),
        ),
    ),
    http.post("/api/ppboard/calculate", () => HttpResponse.json(droidCalculation)),
];
