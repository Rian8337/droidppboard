import { addRankChanges } from "../../src/scores/rankChanges";
import { filterScores } from "../../src/scores/modFilter";
import { buildScore } from "../mocks/fixtures";

const rows = addRankChanges([
    buildScore({ hash: "hd", title: "Song One", mods: [{ acronym: "HD" }] }),
    buildScore({ hash: "hddt", title: "Song Two", mods: [{ acronym: "HD" }, { acronym: "DT" }] }),
    buildScore({
        hash: "hddthr",
        title: "Another Tune",
        mods: [{ acronym: "HD" }, { acronym: "DT" }, { acronym: "HR" }],
    }),
    buildScore({
        hash: "cs",
        title: "Slow One",
        mods: [{ acronym: "CS", settings: { trackRateMultiplier: 0.75 } }],
    }),
    buildScore({ hash: "nm", title: "Plain Song", mods: [] }),
]);

function getHashes(filtered: typeof rows): string[] {
    return filtered.map((row) => row.hash);
}

describe("filterScores", () => {
    it("matches a score that has every selected mod, extra mods allowed", () => {
        expect(getHashes(filterScores(rows, { search: "", modAcronyms: ["HD", "DT"] }))).toEqual([
            "hddt",
            "hddthr",
        ]);
    });

    it("ignores mod settings, so Custom Speed matches at any rate", () => {
        expect(getHashes(filterScores(rows, { search: "", modAcronyms: ["CS"] }))).toEqual(["cs"]);
    });

    it("keeps every score when no mod is selected", () => {
        expect(filterScores(rows, { search: "", modAcronyms: [] })).toHaveLength(5);
    });

    it("searches the map title ignoring case", () => {
        expect(getHashes(filterScores(rows, { search: "SONG", modAcronyms: [] }))).toEqual([
            "hd",
            "hddt",
            "nm",
        ]);
    });

    it("applies the search and the mods together", () => {
        expect(getHashes(filterScores(rows, { search: "two", modAcronyms: ["HD"] }))).toEqual([
            "hddt",
        ]);
    });
});
