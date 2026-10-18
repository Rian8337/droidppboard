import { ReadStream } from "fs";
import { describe, expect, it } from "vitest";
import { parseCalculationRequest } from "./calculationRequest";

function upload(path: string): ReadStream {
    return { path } as ReadStream;
}

const base = { scope: "variant", variant: "droid-rebalance" };

describe("parseCalculationRequest", () => {
    it("accepts a beatmap ID", () => {
        const request = parseCalculationRequest(
            { ...base, beatmap: "1234" },
            undefined,
        );

        expect(request).toEqual({
            scope: "variant",
            variant: "droid-rebalance",
            parameters: { beatmap: { id: 1234 }, mods: [] },
            beatmapInput: { kind: "id", id: 1234 },
        });
    });

    it("takes the ID from the last segment of a link", () => {
        const request = parseCalculationRequest(
            { ...base, beatmap: "https://osu.ppy.sh/beatmapsets/9#osu/5678" },
            undefined,
        );

        expect(request).toMatchObject({
            beatmapInput: { kind: "id", id: 5678 },
        });
    });

    it("accepts an uploaded .osu file in place of a beatmap", () => {
        const file = upload("/tmp/map.osu");
        const request = parseCalculationRequest(
            { ...base, beatmap: "1234" },
            file,
        );

        expect(request).toMatchObject({
            parameters: { beatmap: { file: true } },
            beatmapInput: { kind: "file", file },
        });
    });

    it.each([
        ["https://osu.ppy.sh/b/1234?m=0", 1234],
        ["https://osu.ppy.sh/beatmaps/1234#osu/1234", 1234],
        ["https://osu.ppy.sh/beatmapsets/9#osu/5678?x=1", 5678],
        ["https://osu.ppy.sh/b/1234?m=0#top", 1234],
        ["https://osu.ppy.sh/b/1234/?m=0", 1234],
    ])("ignores the query and fragment of the link %s", (beatmap, id) => {
        expect(
            parseCalculationRequest({ ...base, beatmap }, undefined),
        ).toMatchObject({ beatmapInput: { kind: "id", id } });
    });

    it("rejects a file that is not a .osu file", () => {
        expect(parseCalculationRequest(base, upload("/tmp/map.txt"))).toEqual({
            error: "Invalid file uploaded",
        });
    });

    it.each(["0", "-5", "abc", "12abc", "https://osu.ppy.sh/b/abc?m=0"])(
        "rejects the beatmap %s",
        (beatmap) => {
            expect(
                parseCalculationRequest({ ...base, beatmap }, undefined),
            ).toEqual({ error: "Invalid beatmap ID" });
        },
    );

    it("rejects a request without a beatmap", () => {
        expect(parseCalculationRequest(base, undefined)).toEqual({
            error: "Please enter a valid beatmap file, link or ID",
        });
    });

    it("parses mods from a JSON string", () => {
        const mods = [{ acronym: "DT", settings: { speed_change: 1.3 } }];
        const request = parseCalculationRequest(
            { ...base, beatmap: "1", mods: JSON.stringify(mods) },
            undefined,
        );

        expect(request).toMatchObject({ parameters: { mods } });
    });

    it.each(["{not json", '{"acronym":"HD"}', '[{"settings":{}}]'])(
        "rejects the mods %s",
        (mods) => {
            expect(
                parseCalculationRequest(
                    { ...base, beatmap: "1", mods },
                    undefined,
                ),
            ).toEqual({ error: "Invalid mods" });
        },
    );

    it("passes the score fields through as numbers", () => {
        const request = parseCalculationRequest(
            {
                ...base,
                beatmap: "1",
                combo: "200",
                accuracy: "98.5",
                totalScore: "900000",
                n100: "3",
                n50: "1",
                nmiss: "2",
                sliderTicksMissed: "4",
                sliderEndsDropped: "5",
            },
            undefined,
        );

        expect(request).toMatchObject({
            parameters: {
                combo: 200,
                accuracy: 98.5,
                totalScore: 900000,
                n100: 3,
                n50: 1,
                nmiss: 2,
                sliderTicksMissed: 4,
                sliderEndsDropped: 5,
            },
        });
    });

    it("treats empty score fields as not given", () => {
        const request = parseCalculationRequest(
            { ...base, beatmap: "1", combo: "", nmiss: "" },
            undefined,
        );

        expect(request).toMatchObject({
            parameters: { combo: undefined, nmiss: undefined },
        });
    });

    it.each([
        ["n100", "-1"],
        ["n50", "-3"],
        ["nmiss", "-2"],
        ["sliderTicksMissed", "-1"],
        ["sliderEndsDropped", "-1"],
        ["totalScore", "-10"],
        ["combo", "-1"],
        ["nmiss", "1.5"],
        ["accuracy", "101"],
        ["accuracy", "abc"],
    ])("rejects %s of %s", (field, value) => {
        expect(
            parseCalculationRequest(
                { ...base, beatmap: "1", [field]: value },
                undefined,
            ),
        ).toEqual({ error: `Invalid ${field}` });
    });

    it("rejects an unknown scope", () => {
        expect(
            parseCalculationRequest(
                { scope: "other", variant: "x", beatmap: "1" },
                undefined,
            ),
        ).toEqual({ error: "Invalid scope" });
    });
});
