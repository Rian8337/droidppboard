import {
    buildCalculationFormData,
    emptyFormValues,
    getFormValuesFromResult,
} from "../../src/calculator/calculatorForm";
import { droidCalculation } from "../mocks/fixtures";

describe("buildCalculationFormData", () => {
    it("sends the scope, variant, beatmap and the mods as JSON", () => {
        const form = buildCalculationFormData("variant", "droid-rebalance", {
            ...emptyFormValues,
            beatmap: " https://osu.ppy.sh/beatmapsets/1#osu/1234 ",
            mods: [{ acronym: "DT", settings: { speed_change: 1.25 } }],
        });

        expect(form.get("scope")).toBe("variant");
        expect(form.get("variant")).toBe("droid-rebalance");
        expect(form.get("beatmap")).toBe("https://osu.ppy.sh/beatmapsets/1#osu/1234");
        expect(JSON.parse(form.get("mods") as string)).toEqual([
            { acronym: "DT", settings: { speed_change: 1.25 } },
        ]);
    });

    it("omits the fields that are empty", () => {
        const form = buildCalculationFormData("tool", "droid-live", {
            ...emptyFormValues,
            beatmap: "1234",
            combo: "400",
            nmiss: "  ",
        });

        expect([...form.keys()].sort()).toEqual(["beatmap", "combo", "mods", "scope", "variant"]);
        expect(form.get("combo")).toBe("400");
    });

    it("sends every numeric field under the server's name", () => {
        const form = buildCalculationFormData("variant", "droid-rebalance", {
            ...emptyFormValues,
            beatmap: "1",
            combo: "1",
            accuracy: "2",
            totalScore: "3",
            n100: "4",
            n50: "5",
            nmiss: "6",
            sliderTicksMissed: "7",
            sliderEndsDropped: "8",
        });

        expect(
            [
                "combo",
                "accuracy",
                "totalScore",
                "n100",
                "n50",
                "nmiss",
                "sliderTicksMissed",
                "sliderEndsDropped",
            ].map((name) => form.get(name)),
        ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    });

    it("sends an uploaded file as beatmapfile instead of the beatmap", () => {
        const file = new File(["osu file format v14"], "map.osu");
        const form = buildCalculationFormData("variant", "droid-rebalance", {
            ...emptyFormValues,
            beatmap: "1234",
            beatmapFile: file,
        });

        expect((form.get("beatmapfile") as File).name).toBe("map.osu");
        expect(form.has("beatmap")).toBe(false);
    });
});

describe("getFormValuesFromResult", () => {
    it("puts the parameters of a result back into the form", () => {
        expect(getFormValuesFromResult(droidCalculation)).toEqual({
            beatmap: "1234",
            beatmapFile: null,
            mods: droidCalculation.parameters.mods,
            combo: "480",
            accuracy: "98.5",
            totalScore: "",
            n100: "",
            n50: "",
            nmiss: "2",
            sliderTicksMissed: "",
            sliderEndsDropped: "",
        });
    });

    it("round-trips into the same request", () => {
        const form = buildCalculationFormData(
            "variant",
            "droid-rebalance",
            getFormValuesFromResult(droidCalculation),
        );

        expect(form.get("beatmap")).toBe("1234");
        expect(form.get("accuracy")).toBe("98.5");
        expect(form.get("nmiss")).toBe("2");
        expect(JSON.parse(form.get("mods") as string)).toEqual(droidCalculation.parameters.mods);
    });

    it("has no beatmap for a result of an uploaded file", () => {
        const values = getFormValuesFromResult({
            ...droidCalculation,
            parameters: { beatmap: { file: true }, mods: [] },
        });

        expect(values.beatmap).toBe("");
    });
});
