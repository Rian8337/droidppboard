import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import type { MultiplayerRoomHistory } from "../../src/matchHistory/types";
import { MatchHistoryPage } from "../../src/pages/MatchHistoryPage";
import { server } from "../mocks/server";
import { renderWithProviders } from "../utils/renderWithProviders";

const historyUrl = "https://droidpp.osudroid.moe/api/tournament/getrooms_history";

const history: MultiplayerRoomHistory = {
    name: "Finals room",
    sessions: [
        {
            id: 1,
            mapName: "Artist - Map One [Hard]",
            startTime: "2026-10-01T10:00:00.000Z",
            winCondition: 3,
            teamMode: 0,
            removeSliderLock: false,
            scores: [
                {
                    userId: 10,
                    userName: "Alpha",
                    score: 1_200_000,
                    accuracy: 0.98,
                    hit300: 300,
                    hit100: 5,
                    hit50: 1,
                    hit0: 0,
                    maxCombo: 450,
                    isAlive: true,
                    playMod: [{ acronym: "HD" }],
                },
                {
                    userId: 11,
                    userName: "Bravo",
                    score: 800_000,
                    accuracy: 0.9,
                    hit300: 280,
                    hit100: 20,
                    hit50: 3,
                    hit0: 2,
                    maxCombo: 300,
                    isAlive: false,
                    playMod: [],
                },
            ],
        },
    ],
};

function renderMatch() {
    return renderWithProviders(
        <Routes>
            <Route path="/match_history/:matchid" element={<MatchHistoryPage />} />
        </Routes>,
        { route: "/match_history/77" },
    );
}

describe("MatchHistoryPage", () => {
    it("asks for the room in the address and shows its name and sessions", async () => {
        const requests: URL[] = [];

        server.use(
            http.get(historyUrl, ({ request }) => {
                requests.push(new URL(request.url));

                return HttpResponse.json(history);
            }),
        );
        renderMatch();

        expect(await screen.findByRole("heading", { name: "Finals room" })).toBeVisible();
        expect(requests[0].searchParams.get("id")).toBe("77");
        expect(screen.getByText("1. Artist - Map One [Hard]")).toBeVisible();
        expect(screen.getByText(/Win condition: Score V2/)).toBeVisible();
        expect(screen.getByText("1,200,000")).toBeVisible();
        expect(screen.getByText("Bravo (FAILED)")).toBeVisible();
    });

    it("ranks players by match cost", async () => {
        server.use(http.get(historyUrl, () => HttpResponse.json(history)));
        renderMatch();

        const region = await screen.findByRole("region", { name: "Match cost" });
        const rows = within(region).getAllByRole("row").slice(1);

        expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual([
            "Alpha",
            "Bravo",
        ]);
        // Alpha: 2 / (1 + 2) * (1.2 / 1.0) = 0.8
        expect(within(rows[0]).getByText("0.80")).toBeVisible();
    });

    it("says so when the room cannot be loaded", async () => {
        server.use(http.get(historyUrl, () => new HttpResponse(null, { status: 500 })));
        renderMatch();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Unable to load the match history of this room.",
        );
    });
});
