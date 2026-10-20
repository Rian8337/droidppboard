import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    query: vi.fn(),
}));

vi.mock("../database/official", () => ({
    officialDb: { query: mocks.query },
}));

import { getTopScores } from "./OfficialScores";

describe("getTopScores", () => {
    beforeEach(() => {
        mocks.query.mockReset();
    });

    it("gets the best scores in the score service's order", async () => {
        mocks.query.mockResolvedValue([
            [
                { id: 3, hash: "a" },
                { id: 1, hash: "b" },
            ],
        ]);

        await expect(getTopScores(7)).resolves.toEqual([
            { id: 3, hash: "a" },
            { id: 1, hash: "b" },
        ]);
        expect(mocks.query).toHaveBeenCalledWith(
            "SELECT id, hash FROM bbl_score_best WHERE uid = ? ORDER BY pp DESC, id ASC LIMIT ?",
            [7, 100],
        );
    });

    it("keeps only the first score of a beatmap", async () => {
        mocks.query.mockResolvedValue([
            [
                { id: 3, hash: "abc" },
                { id: 4, hash: "def" },
                { id: 5, hash: "ABC" },
            ],
        ]);

        await expect(getTopScores(7)).resolves.toEqual([
            { id: 3, hash: "abc" },
            { id: 4, hash: "def" },
        ]);
    });
});
