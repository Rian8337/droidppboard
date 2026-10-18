import { addRankChanges } from "../../src/scores/rankChanges";
import { defaultScoreSort, sortScores } from "../../src/scores/scoreSorting";
import { buildScore, buildScoreState } from "../mocks/fixtures";

/** Scores whose local-minus-live differences are, in input order, +5, -3 and +1. */
const rows = addRankChanges([
    buildScore({ hash: "a", live: buildScoreState(100), local: buildScoreState(105) }),
    buildScore({ hash: "b", live: buildScoreState(100), local: buildScoreState(97) }),
    buildScore({ hash: "c", live: buildScoreState(100), local: buildScoreState(101) }),
]);

function getHashes(sorted: typeof rows): string[] {
    return sorted.map((row) => row.hash);
}

describe("sortScores", () => {
    it("sorts by difference descending and ascending", () => {
        expect(
            getHashes(sortScores(rows, { columnId: "difference", direction: "descending" })),
        ).toEqual(["a", "c", "b"]);
        expect(
            getHashes(sortScores(rows, { columnId: "difference", direction: "ascending" })),
        ).toEqual(["b", "c", "a"]);
    });

    it("measures the difference against master when the score has one", () => {
        const withMaster = addRankChanges([
            buildScore({ hash: "x", live: buildScoreState(100), local: buildScoreState(110) }),
            buildScore({
                hash: "y",
                live: buildScoreState(100),
                local: buildScoreState(110),
                master: buildScoreState(130),
            }),
        ]);

        expect(
            getHashes(sortScores(withMaster, { columnId: "difference", direction: "descending" })),
        ).toEqual(["x", "y"]);
    });

    it("keeps tied rows in their input order in both directions", () => {
        const tied = addRankChanges([
            buildScore({ hash: "a", miss: 1 }),
            buildScore({ hash: "b", miss: 1 }),
            buildScore({ hash: "c", miss: 0 }),
        ]);

        expect(getHashes(sortScores(tied, { columnId: "miss", direction: "descending" }))).toEqual([
            "a",
            "b",
            "c",
        ]);
        expect(getHashes(sortScores(tied, { columnId: "miss", direction: "ascending" }))).toEqual([
            "c",
            "a",
            "b",
        ]);
    });

    it("sorts text columns alphabetically", () => {
        const titled = addRankChanges([
            buildScore({ hash: "a", title: "Bravo" }),
            buildScore({ hash: "b", title: "alpha" }),
            buildScore({ hash: "c", title: "Charlie" }),
        ]);

        expect(getHashes(sortScores(titled, { columnId: "map", direction: "ascending" }))).toEqual([
            "b",
            "a",
            "c",
        ]);
    });

    it("sorts by rank, where the first rank is the best local score", () => {
        expect(getHashes(sortScores(rows, { columnId: "rank", direction: "ascending" }))).toEqual([
            "a",
            "c",
            "b",
        ]);
    });

    it("does not change the rows it is given", () => {
        const before = getHashes(rows);

        sortScores(rows, { columnId: "difference", direction: "ascending" });

        expect(getHashes(rows)).toEqual(before);
    });

    it("leaves the order alone for a column it does not know", () => {
        expect(
            getHashes(sortScores(rows, { columnId: "nothing", direction: "ascending" })),
        ).toEqual(["a", "b", "c"]);
    });

    it("defaults to local pp, highest first", () => {
        expect(defaultScoreSort).toEqual({ columnId: "local", direction: "descending" });
        expect(getHashes(sortScores(rows, defaultScoreSort))).toEqual(["a", "c", "b"]);
    });
});
