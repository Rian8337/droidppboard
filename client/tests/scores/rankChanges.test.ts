import { addRankChanges } from "../../src/scores/rankChanges";
import { buildScore, buildScoreState } from "../mocks/fixtures";

describe("addRankChanges", () => {
    it("signs the move from the live position to the local one, positive when the score moved up", () => {
        const scores = [
            buildScore({ hash: "a", live: buildScoreState(100), local: buildScoreState(90) }),
            buildScore({ hash: "b", live: buildScoreState(80), local: buildScoreState(95) }),
            buildScore({ hash: "c", live: buildScoreState(60), local: buildScoreState(70) }),
        ];

        const rows = addRankChanges(scores);

        expect(rows.map((row) => [row.hash, row.rankChange])).toEqual([
            ["a", -1],
            ["b", 1],
            ["c", 0],
        ]);
    });

    it("ranks each score by its local position and keeps the input order", () => {
        const rows = addRankChanges([
            buildScore({ hash: "a", local: buildScoreState(90) }),
            buildScore({ hash: "b", local: buildScoreState(95) }),
        ]);

        expect(rows.map((row) => [row.hash, row.rank])).toEqual([
            ["a", 2],
            ["b", 1],
        ]);
    });

    it("keeps tied scores in their input order", () => {
        const rows = addRankChanges([
            buildScore({ hash: "a", live: buildScoreState(50), local: buildScoreState(50) }),
            buildScore({ hash: "b", live: buildScoreState(50), local: buildScoreState(50) }),
        ]);

        expect(rows.map((row) => [row.rank, row.rankChange])).toEqual([
            [1, 0],
            [2, 0],
        ]);
    });

    it("keeps the other fields of the score", () => {
        const [row] = addRankChanges([buildScore({ title: "Keep me" })]);

        expect(row.title).toBe("Keep me");
    });
});
