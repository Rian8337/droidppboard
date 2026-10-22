import { DroidHitWindow, PreciseDroidHitWindow } from "@rian8337/osu-base";
import { addRankChanges } from "../../src/scores/rankChanges";
import { getHitWindows, scoreColumns } from "../../src/scores/scoreColumns";
import { buildScore, buildScoreState } from "../mocks/fixtures";

function getColumn(id: string) {
    return scoreColumns.find((column) => column.id === id)!;
}

describe("scoreColumns", () => {
    it("lists the columns in the specified order", () => {
        expect(scoreColumns.slice(0, 19).map((column) => column.id)).toEqual([
            "rank",
            "player",
            "map",
            "live",
            "master",
            "local",
            "difference",
            "relativeDifference",
            "starRating",
            "starRatingDifference",
            "mods",
            "accuracy",
            "combo",
            "n100",
            "n50",
            "miss",
            "cs",
            "ar",
            "od",
        ]);
    });

    it("shows the columns from rank to OD by default and hides the rest", () => {
        const ids = scoreColumns.map((column) => column.id);
        const lastDefault = ids.indexOf("od");

        expect(
            scoreColumns.every((column, index) => column.isDefaultVisible === index <= lastDefault),
        ).toBe(true);
    });

    it("has a unique id per column and every column sortable", () => {
        expect(new Set(scoreColumns.map((column) => column.id)).size).toBe(scoreColumns.length);
        expect(scoreColumns.every((column) => column.isSortable)).toBe(true);
    });

    it("writes the relative difference as a percentage of what the score is compared with", () => {
        const [row] = addRankChanges([
            buildScore({ live: buildScoreState(100), local: buildScoreState(110) }),
        ]);

        expect(getColumn("relativeDifference").csvValue(row)).toBe(10);
    });

    it("leaves the relative difference empty when there is nothing to compare with", () => {
        const [row] = addRankChanges([
            buildScore({ live: buildScoreState(0), local: buildScoreState(10) }),
        ]);

        expect(getColumn("relativeDifference").csvValue(row)).toBe("");
    });

    it("compares with master when the score has one, for every pair of values", () => {
        const [row] = addRankChanges([
            buildScore({
                live: buildScoreState(100),
                local: buildScoreState(110),
                master: buildScoreState(105),
            }),
        ]);

        expect(getColumn("difference").csvValue(row)).toBe(5);
        expect(getColumn("aimPp").csvValue(row)).toBe(44);
    });

    it("writes the master pp, or nothing for a score without a master state", () => {
        const [withMaster, withoutMaster] = addRankChanges([
            buildScore({ local: buildScoreState(110), master: buildScoreState(105.456) }),
            buildScore({ local: buildScoreState(100) }),
        ]);

        expect(getColumn("master").csvValue(withMaster)).toBe(105.46);
        expect(getColumn("master").csvValue(withoutMaster)).toBe("");
    });

    it("writes mods in order separated by commas, or NM for none", () => {
        const rows = addRankChanges([
            buildScore({ mods: [{ acronym: "DT" }, { acronym: "HD" }] }),
            buildScore({
                mods: [{ acronym: "CS", settings: { rateMultiplier: 1.25 } }, { acronym: "HD" }],
            }),
            buildScore({ mods: [] }),
        ]);

        expect(rows.map((row) => getColumn("mods").csvValue(row))).toEqual([
            "HD, DT",
            "HD, CS (1.25x)",
            "NM",
        ]);
    });

    it("reads the hit windows from the OD, narrower for Precise", () => {
        const normal = getHitWindows(buildScore({ overallDifficulty: 8 }));
        const precise = getHitWindows(
            buildScore({ overallDifficulty: 8, mods: [{ acronym: "PR" }] }),
        );

        expect(normal.great).toBe(new DroidHitWindow(8).greatWindow);
        expect(precise.great).toBe(new PreciseDroidHitWindow(8).greatWindow);
        expect(precise.great).toBeLessThan(normal.great);
    });
});
