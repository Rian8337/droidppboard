import { getResultSections } from "../../src/calculator/resultFields";
import { droidCalculation, osuCalculation } from "../mocks/fixtures";

function getField(sections: ReturnType<typeof getResultSections>, label: string) {
    return sections.flatMap((section) => section.fields).find((field) => field.label === label);
}

describe("getResultSections", () => {
    it("describes the score and the beatmap", () => {
        const sections = getResultSections(droidCalculation);

        expect(getField(sections, "Map")?.value).toBe("Alpha Song");
        expect(getField(sections, "Mods")?.value).toBe("HD, DT (speed_change: 1.25)");
        expect(getField(sections, "Accuracy")?.value).toBe("98.50%");
        expect(getField(sections, "Combo")?.value).toBe("480 / 500");
        expect(getField(sections, "Calculator version")?.value).toBe("01234567");
        expect(getField(sections, "Calculated")?.value).toBe("2026-10-11 13:16 UTC");
        expect(getField(sections, "Compared with")?.value).toBe("droid-live");
    });

    it("shows the maximum combo when none was given and full accuracy when none was given", () => {
        const sections = getResultSections({
            ...droidCalculation,
            parameters: { beatmap: { id: 1234 }, mods: [] },
        });

        expect(getField(sections, "Combo")?.value).toBe("500 / 500");
        expect(getField(sections, "Accuracy")?.value).toBe("100.00%");
        expect(getField(sections, "Mods")?.value).toBe("None");
    });

    it("says the accuracy comes from the hit counts when they were given", () => {
        const sections = getResultSections({
            ...droidCalculation,
            parameters: { beatmap: { id: 1234 }, mods: [], n100: 3 },
        });

        expect(getField(sections, "Accuracy")?.value).toBe("From hit counts");
    });

    it("shows Total pp, Live pp and a positive Difference as up", () => {
        const sections = getResultSections(droidCalculation);

        expect(getField(sections, "Total pp")?.value).toBe("321.457");
        expect(getField(sections, "Live pp")?.value).toBe("300.123");
        expect(getField(sections, "Difference")).toEqual({
            label: "Difference",
            value: "+21.333",
            tone: "up",
        });
    });

    it("colours a negative difference down", () => {
        const sections = getResultSections(osuCalculation);

        expect(getField(sections, "Difference")).toEqual({
            label: "Difference",
            value: "-10.000",
            tone: "down",
        });
    });

    it("omits Live pp and Difference without a baseline", () => {
        const sections = getResultSections({
            ...droidCalculation,
            baseline: null,
            baselineResult: null,
        });

        expect(getField(sections, "Total pp")?.value).toBe("321.457");
        expect(getField(sections, "Live pp")).toBeUndefined();
        expect(getField(sections, "Difference")).toBeUndefined();
        expect(getField(sections, "Compared with")).toBeUndefined();
    });

    it("uses Tap for osu!droid", () => {
        const sections = getResultSections(droidCalculation);

        expect(getField(sections, "Aim pp")?.value).toBe("150.000");
        expect(getField(sections, "Tap pp")?.value).toBe("100.000");
        expect(getField(sections, "Reading pp")?.value).toBe("11.457");
        expect(getField(sections, "Speed pp")).toBeUndefined();
        expect(getField(sections, "Tap difficulty")?.value).toBe("2.200");
        expect(getField(sections, "Rhythm difficulty")?.value).toBe("1.100");
    });

    it("uses Speed for osu!standard", () => {
        const sections = getResultSections(osuCalculation);

        expect(getField(sections, "Speed pp")?.value).toBe("120.000");
        expect(getField(sections, "Speed difficulty")?.value).toBe("2.000");
        expect(getField(sections, "Tap pp")).toBeUndefined();
        expect(getField(sections, "Effective miss count")).toBeUndefined();
    });

    it("shows the performance details osu!droid exposes", () => {
        const sections = getResultSections(droidCalculation);

        expect(getField(sections, "Effective miss count")?.value).toBe("2.50");
        expect(getField(sections, "Tap penalty")?.value).toBe("1.020");
        expect(getField(sections, "Deviation")?.value).toBe("7.80");
        expect(getField(sections, "Tap deviation")?.value).toBe("8.10");
        expect(getField(sections, "Slider cheese penalty")?.value).toBe("0.990");
    });

    it("shows the star rating first among the difficulties and the stats after mods", () => {
        const sections = getResultSections(droidCalculation);
        const difficulty = sections.find((section) => section.title === "Difficulty");

        expect(difficulty?.fields[0]).toEqual({ label: "Star rating", value: "6.123" });
        expect(getField(sections, "CS")?.value).toBe("4");
        expect(getField(sections, "AR")?.value).toBe("9.3");
        expect(getField(sections, "OD")?.value).toBe("8");
        expect(getField(sections, "HP")?.value).toBe("5");
    });

    it("ignores attributes it does not know and leaves out the ones that are missing", () => {
        const sections = getResultSections({
            ...droidCalculation,
            result: { ...droidCalculation.result, performance: { total: 10, mystery: 5 } },
        });
        const labels = sections.flatMap((section) => section.fields.map((field) => field.label));

        expect(labels).not.toContain("Tap pp");
        expect(labels).not.toContain("mystery");
        expect(labels).not.toContain("unknownDifficulty");
        expect(getField(sections, "Total pp")?.value).toBe("10.000");
    });

    it("lists the mods that were ignored", () => {
        const sections = getResultSections({ ...osuCalculation, ignoredMods: ["TD", "AP"] });

        expect(getField(sections, "Ignored mods")?.value).toBe("TD, AP");
    });
});
