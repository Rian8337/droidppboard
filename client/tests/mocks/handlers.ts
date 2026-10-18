import { http, HttpResponse, type RequestHandler } from "msw";
import type { IPrototypePP, PrototypeLeaderboardResponse } from "app-structures";
import { droidRebalance, leaderboardPlayers, plainMe, readingVariant } from "./fixtures";

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
    http.get("/api/ppboard/prototype/getleaderboard", ({ request }) => {
        const type = new URL(request.url).searchParams.get("type");
        const currentVariant = type === readingVariant.name ? readingVariant : droidRebalance;
        const body: PrototypeLeaderboardResponse<IPrototypePP[]> = {
            variants: [droidRebalance, readingVariant],
            currentVariant,
            data: leaderboardPlayers,
        };

        return HttpResponse.json(body);
    }),
];
