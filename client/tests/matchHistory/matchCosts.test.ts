import { calculateMatchCosts, sortTeamScores } from "../../src/matchHistory/matchCosts";
import type { MultiplayerScore, MultiplayerSession } from "../../src/matchHistory/types";

function buildScore(overrides: Partial<MultiplayerScore>): MultiplayerScore {
    return {
        userId: 10,
        userName: "Player",
        score: 1000,
        accuracy: 1,
        hit300: 0,
        hit100: 0,
        hit50: 0,
        hit0: 0,
        maxCombo: 0,
        isAlive: true,
        playMod: [],
        ...overrides,
    };
}

function buildSession(scores: MultiplayerScore[]): MultiplayerSession {
    return {
        id: 1,
        mapName: "Map",
        startTime: "2026-10-01T10:00:00.000Z",
        winCondition: 0,
        teamMode: 0,
        removeSliderLock: false,
        scores,
    };
}

describe("calculateMatchCosts", () => {
    it("weighs each player's score against the session average, favouring those who played more", () => {
        const sessions = [
            buildSession([
                buildScore({ userId: 10, userName: "A", score: 1500 }),
                buildScore({ userId: 11, userName: "B", score: 500 }),
            ]),
            buildSession([buildScore({ userId: 10, userName: "A", score: 1000 })]),
        ];

        const costs = calculateMatchCosts(sessions);

        // A: two sessions, ratios 1.5 and 1 -> 2 / (2 + 2) * 2.5; B: one session, ratio 0.5.
        expect(costs).toEqual([
            ["A", 1.25],
            ["B", (2 / 3) * 0.5],
        ]);
    });

    it("leaves the team rows (user ids 0 and 1) and empty-scoring sessions out", () => {
        const sessions = [
            buildSession([
                buildScore({ userId: 0, userName: "Red", score: 9999 }),
                buildScore({ userId: 1, userName: "Blue", score: 9999 }),
                buildScore({ userId: 10, userName: "A", score: 0 }),
            ]),
        ];

        expect(calculateMatchCosts(sessions)).toEqual([]);
    });
});

describe("sortTeamScores", () => {
    it("puts the blue total, the blue players, the red total and the red players in that order without changing the input", () => {
        const scores = [
            buildScore({ userId: 0, userName: "Red total" }),
            buildScore({ userId: 20, userName: "Red player", team: 0 }),
            buildScore({ userId: 1, userName: "Blue total" }),
            buildScore({ userId: 21, userName: "Blue player", team: 1 }),
        ];

        expect(sortTeamScores(scores).map((score) => score.userName)).toEqual([
            "Blue total",
            "Blue player",
            "Red total",
            "Red player",
        ]);
        expect(scores[0].userName).toBe("Red total");
    });
});
