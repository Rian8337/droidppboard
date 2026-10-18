import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateScore } from "./calculateScore";

const osuFile = `osu file format v14

[General]
Mode: 0

[Metadata]
Title:Test Song
TitleUnicode:Test Song
Artist:Someone
ArtistUnicode:Someone
Creator:Mapper
Version:Hard
BeatmapID:0
BeatmapSetID:0

[Difficulty]
HPDrainRate:5
CircleSize:4
OverallDifficulty:8
ApproachRate:9
SliderMultiplier:1.4
SliderTickRate:1

[TimingPoints]
0,500,4,2,0,100,1,0

[HitObjects]
64,64,1000,1,0,0:0:0:0:
128,64,1500,1,0,0:0:0:0:
192,64,2000,1,0,0:0:0:0:
256,64,2500,1,0,0:0:0:0:
`;

interface BrokerCall {
    url: string;
    headers: Record<string, string>;
    body: {
        beatmap: { file: string };
        mods: unknown[];
        score: Record<string, number>;
        strainChart: boolean;
    };
}

let calls: BrokerCall[];
let reply: (call: BrokerCall) => { status: number; body: unknown };

function brokerResult(star: number) {
    return {
        difficulty: { starRating: star, flags: ["x"] },
        performance: { total: star * 10 },
        strainChart: "AAAA",
    };
}

describe("calculateScore", () => {
    beforeEach(() => {
        calls = [];
        reply = (call) => ({
            status: 200,
            body: brokerResult(call.url.includes("droid-live") ? 5 : 6),
        });
        process.env.DPP_BROKER_URL = "http://broker.test/";
        process.env.DPP_BROKER_KEY = "key";

        vi.stubGlobal(
            "fetch",
            vi.fn((url: string, init: RequestInit) => {
                const call: BrokerCall = {
                    url,
                    headers: init.headers as Record<string, string>,
                    body: JSON.parse(init.body as string),
                };

                calls.push(call);

                const { status, body } = reply(call);

                return Promise.resolve(
                    new Response(JSON.stringify(body), { status }),
                );
            }),
        );
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    function input(overrides: Partial<Parameters<typeof calculateScore>[0]>) {
        return {
            scope: "variant" as const,
            variant: "droid-rebalance",
            parameters: { beatmap: { id: 1 }, mods: [] },
            osuFile,
            beatmapId: 1,
            ...overrides,
        };
    }

    it("sends the score fields under the broker's names", async () => {
        await calculateScore(
            input({
                parameters: {
                    beatmap: { id: 1 },
                    mods: [{ acronym: "HD" }],
                    combo: 3,
                    n100: 1,
                    n50: 0,
                    nmiss: 1,
                    totalScore: 500000,
                    sliderTicksMissed: 2,
                    sliderEndsDropped: 1,
                },
            }),
        );

        const call = calls.find((c) => c.url.includes("droid-rebalance"))!;

        expect(call.url).toBe(
            "http://broker.test/variants/droid-rebalance/performance",
        );
        expect(call.body).toEqual({
            beatmap: { file: osuFile },
            mods: [{ acronym: "HD" }],
            score: {
                n300: 2,
                n100: 1,
                n50: 0,
                nmiss: 1,
                combo: 3,
                totalScore: 500000,
                sliderTicksMissed: 2,
                sliderEndsDropped: 1,
            },
            strainChart: true,
        });
    });

    it("derives the hit counts from accuracy when counts are absent", async () => {
        await calculateScore(
            input({
                parameters: { beatmap: { id: 1 }, mods: [], accuracy: 75 },
            }),
        );

        const { score } = calls[0].body;

        expect(score.n300 + score.n100 + score.n50 + score.nmiss).toBe(4);
        expect(score.n300).toBe(2);
        expect(score.n100).toBe(2);
        expect(score.combo).toBe(4);
    });

    it("defaults to a full combo with perfect accuracy", async () => {
        await calculateScore(input({}));

        expect(calls[0].body.score).toMatchObject({
            n300: 4,
            n100: 0,
            n50: 0,
            nmiss: 0,
            combo: 4,
        });
    });

    it("calculates the baseline for a variant of the board", async () => {
        const result = await calculateScore(
            input({ calculatorVersion: "1.2.3" }),
        );

        expect(calls.map((c) => c.url).sort()).toEqual([
            "http://broker.test/variants/droid-live/performance",
            "http://broker.test/variants/droid-rebalance/performance",
        ]);
        expect(result).toMatchObject({
            scope: "variant",
            variant: "droid-rebalance",
            baseline: "droid-live",
            calculatorVersion: "1.2.3",
            result: {
                difficulty: { starRating: 6 },
                performance: { total: 60 },
                strainChart: "AAAA",
            },
            baselineResult: {
                difficulty: { starRating: 5 },
                performance: { total: 50 },
            },
        });
    });

    it("keeps only numbers in the attributes", async () => {
        const result = await calculateScore(input({}));

        expect(result).toMatchObject({
            result: { difficulty: { starRating: 6 } },
        });
        expect(
            (result as { result: { difficulty: object } }).result.difficulty,
        ).not.toHaveProperty("flags");
    });

    it("calculates no baseline for a live variant of the tool", async () => {
        const result = await calculateScore(
            input({ scope: "tool", variant: "osu-live" }),
        );

        expect(calls).toHaveLength(1);
        expect(calls[0].url).toContain("/variants/osu-live/");
        expect(result).toMatchObject({
            baseline: null,
            baselineResult: null,
        });
    });

    it("compares osu-rebalance with osu-live in the tool", async () => {
        const result = await calculateScore(
            input({ scope: "tool", variant: "osu-rebalance" }),
        );

        expect(calls.map((c) => c.url).sort()).toEqual([
            "http://broker.test/variants/osu-live/performance",
            "http://broker.test/variants/osu-rebalance/performance",
        ]);
        expect(result).toMatchObject({ baseline: "osu-live" });
    });

    it("sends X-Acting-Uid when a person is acting", async () => {
        await calculateScore(input({ actingUid: 1234 }));

        expect(calls).toHaveLength(2);
        expect(calls.map((c) => c.headers["X-Acting-Uid"])).toEqual([
            "1234",
            "1234",
        ]);
        expect(calls[0].headers["X-Api-Key"]).toBe("key");
    });

    it("sends no X-Acting-Uid for a visitor", async () => {
        await calculateScore(input({}));

        expect(calls[0].headers).not.toHaveProperty("X-Acting-Uid");
    });

    it("lists the mods that do not apply to an osu! variant", async () => {
        const result = await calculateScore(
            input({
                scope: "tool",
                variant: "osu-live",
                parameters: {
                    beatmap: { id: 1 },
                    mods: [
                        { acronym: "HD" },
                        { acronym: "PR" },
                        { acronym: "NOTAMOD" },
                    ],
                },
            }),
        );

        expect(calls[0].body.mods).toEqual([{ acronym: "HD" }]);
        expect(result).toMatchObject({ ignoredMods: ["PR", "NOTAMOD"] });
    });

    it("lists no ignored mods for a droid variant", async () => {
        const result = await calculateScore(
            input({
                parameters: { beatmap: { id: 1 }, mods: [{ acronym: "PR" }] },
            }),
        );

        expect(calls[0].body.mods).toEqual([{ acronym: "PR" }]);
        expect(result).toMatchObject({ ignoredMods: [] });
    });

    it("describes the beatmap with its statistics after mods", async () => {
        const result = await calculateScore(
            input({
                parameters: { beatmap: { id: 1 }, mods: [{ acronym: "HR" }] },
                beatmapId: null,
            }),
        );

        expect(result).toMatchObject({
            beatmap: {
                id: null,
                hash: createHash("md5").update(osuFile).digest("hex"),
                title: "Test Song",
                maxCombo: 4,
                od: 10,
            },
        });
    });

    it("answers 503 when the broker cannot be reached", async () => {
        reply = () => ({ status: 502, body: null });
        vi.mocked(fetch).mockRejectedValue(new Error("down"));

        expect(await calculateScore(input({}))).toEqual({
            error: "Could not contact the processing server",
            status: 503,
        });
    });

    it("answers 404 when the broker does not know the variant", async () => {
        reply = () => ({
            status: 404,
            body: { error: { code: "NOT_FOUND", message: "no" } },
        });

        expect(await calculateScore(input({}))).toEqual({
            error: "Variant not found",
            status: 404,
        });
    });

    it("answers 400 with the broker's message when it rejects the request", async () => {
        reply = () => ({
            status: 400,
            body: { error: { code: "INVALID", message: "Unknown mod" } },
        });

        expect(await calculateScore(input({}))).toEqual({
            error: "Unknown mod",
            status: 400,
        });
    });

    it("answers 400 for a file that is not a beatmap", async () => {
        expect(await calculateScore(input({ osuFile: "garbage" }))).toEqual({
            error: "Invalid beatmap file",
            status: 400,
        });
        expect(calls).toHaveLength(0);
    });
});
