import { matchesModSearch } from "../../src/mods/modSearch";

const doubleTime = { acronym: "DT", name: "Double Time" };

describe("matchesModSearch", () => {
    it("matches a substring of the acronym, case-insensitively", () => {
        expect(matchesModSearch(doubleTime, "dt")).toBe(true);
        expect(matchesModSearch(doubleTime, "DT")).toBe(true);
    });

    it("matches a substring of the name, case-insensitively", () => {
        expect(matchesModSearch(doubleTime, "double")).toBe(true);
        expect(matchesModSearch(doubleTime, "TIME")).toBe(true);
    });

    it("does not match unrelated text", () => {
        expect(matchesModSearch(doubleTime, "hidden")).toBe(false);
    });

    it("matches everything for a blank or whitespace-only query", () => {
        expect(matchesModSearch(doubleTime, "")).toBe(true);
        expect(matchesModSearch(doubleTime, "   ")).toBe(true);
    });
});
