import { PPVariant } from "app-structures";
import { createHash } from "crypto";
import express from "express";
import formData from "express-form-data";
import { Server } from "http";
import { AddressInfo } from "net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrokerClient as BrokerClientType } from "../../../clients/BrokerClient";
import type { Util as UtilType } from "../../../utils/Util";

const osuFile = `osu file format v14

[Metadata]
Title:Test Song
Artist:Someone
Creator:Mapper
Version:Hard

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
`;
const osuFileHash = createHash("md5").update(osuFile).digest("hex");

function variant(name: string, overrides: Partial<PPVariant> = {}): PPVariant {
    return {
        name,
        title: null,
        aliases: [],
        description: null,
        available: true,
        healthyInstanceCount: 1,
        mode: name.startsWith("osu-") ? "osu" : "droid",
        algorithm: name.endsWith("live") ? "live" : "rebalance",
        public: true,
        pinned: false,
        builtAt: null,
        calculatorVersion: null,
        ...overrides,
    };
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * The score service's answer for a variant, where the total pp tells the variants apart.
 */
function scoreBody(totalPp: number) {
    return {
        score: { mods: [{ acronym: "HD" }, { acronym: "DT" }] },
        calculation: {
            difficulty: { starRating: 5, maxCombo: 2 },
            performance: { total: totalPp },
            score: {
                n300: 8,
                n100: 1,
                n50: 1,
                nmiss: 0,
                combo: 2,
                tapPenalty: 1,
                sliderCheesePenalty: 1,
            },
        },
    };
}

const originalFetch = globalThis.fetch;
const scoreServiceFetch = vi.fn<(url: URL) => Promise<Response>>();

let uid: number | undefined;
let server: Server;
let baseUrl: string;
let calculatePerformance: ReturnType<typeof vi.spyOn>;
let BrokerClient: typeof BrokerClientType;
let Util: typeof UtilType;

function post(body: Record<string, unknown>) {
    return fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatmap: "123", ...body }),
    });
}

/**
 * The score lookups made, as `[variant, uid, hash]`.
 */
function getLookups() {
    return scoreServiceFetch.mock.calls.map(([url]) => [
        url.searchParams.get("variant"),
        url.searchParams.get("uid"),
        url.searchParams.get("hash"),
    ]);
}

describe("POST /calculate/my-score", () => {
    beforeEach(async () => {
        uid = 5;

        vi.stubEnv("DPP_SCORE_SERVICE_URL", "http://scores.test/");
        vi.stubEnv("DPP_SCORE_SERVICE_KEY", "score-key");

        scoreServiceFetch.mockReset();
        scoreServiceFetch.mockImplementation((url) =>
            Promise.resolve(
                jsonResponse(
                    scoreBody(
                        url.searchParams.get("variant") === "droid-live"
                            ? 100
                            : 120,
                    ),
                ),
            ),
        );

        // Only the requests to the score service are faked, not the ones to the test server.
        vi.stubGlobal(
            "fetch",
            (input: string | URL | Request, init?: object) => {
                const url = new URL(
                    input instanceof Request ? input.url : input.toString(),
                );

                return url.hostname === "scores.test"
                    ? scoreServiceFetch(url)
                    : originalFetch(input, init);
            },
        );

        // The route's rate limit is kept per module instance.
        vi.resetModules();

        ({ BrokerClient } = await import("../../../clients/BrokerClient"));
        ({ Util } = await import("../../../utils/Util"));

        const calculateMyScore = (await import("./calculate-my-score")).default;

        // The broker answers a private variant as not found to someone who cannot see it.
        vi.spyOn(BrokerClient, "getVariant").mockImplementation((name) =>
            Promise.resolve(
                name === "secret"
                    ? "notFound"
                    : variant(name, {
                          calculatorVersion:
                              name === "droid-rebalance" ? "9.9.9" : null,
                      }),
            ),
        );
        calculatePerformance = vi.spyOn(BrokerClient, "calculatePerformance");
        vi.spyOn(Util, "downloadBeatmap").mockResolvedValue(osuFile);

        const app = express();

        app.use(formData.parse({ maxFilesSize: 1000000 }));
        app.use(formData.format());
        app.use(formData.stream());
        app.use(express.json());
        app.use((_, res, next) => {
            res.locals.uid = uid;
            next();
        });
        app.use("/", calculateMyScore);

        await new Promise<void>((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });

        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("requires a login", async () => {
        uid = undefined;

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ message: "Not logged in" });
        expect(scoreServiceFetch).not.toHaveBeenCalled();
        expect(Util.downloadBeatmap).not.toHaveBeenCalled();
    });

    it("looks the score up by the beatmap's hash and the session's uid, for the variant and then droid-live", async () => {
        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(200);
        expect(getLookups()).toEqual([
            ["droid-rebalance", "5", osuFileHash],
            ["droid-live", "5", osuFileHash],
        ]);
    });

    it("asks the score service for the best score by pp, on behalf of the person", async () => {
        await post({ scope: "variant", variant: "droid-rebalance" });

        for (const [url] of scoreServiceFetch.mock.calls) {
            expect(url.origin + url.pathname).toBe(
                "http://scores.test/online-scores",
            );
            expect(url.searchParams.get("best")).toBe("true");
        }
    });

    it("answers with the stored score's mods and counts as the parameters", async () => {
        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(await res.json()).toMatchObject({
            scope: "variant",
            variant: "droid-rebalance",
            baseline: "droid-live",
            calculatorVersion: "9.9.9",
            beatmap: {
                id: 123,
                hash: osuFileHash,
                title: "Someone - Test Song (Mapper) [Hard]",
                maxCombo: 2,
            },
            parameters: {
                beatmap: { id: 123 },
                mods: [{ acronym: "HD" }, { acronym: "DT" }],
                combo: 2,
                n100: 1,
                n50: 1,
                nmiss: 0,
                accuracy: 85,
            },
            result: {
                difficulty: { starRating: 5 },
                performance: { total: 120 },
                strainChart: null,
            },
            baselineResult: { performance: { total: 100 } },
            ignoredMods: [],
        });
        // The stored score is not calculated again.
        expect(calculatePerformance).not.toHaveBeenCalled();
    });

    it("hashes an uploaded .osu file", async () => {
        const form = new FormData();

        form.set("scope", "tool");
        form.set("variant", "droid-live");
        form.set("beatmapfile", new Blob([osuFile]), "map.osu");

        const res = await fetch(baseUrl, { method: "POST", body: form });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            beatmap: { id: null, hash: osuFileHash },
            parameters: { beatmap: { file: true } },
        });
        expect(Util.downloadBeatmap).not.toHaveBeenCalled();
        expect(getLookups()).toEqual([["droid-live", "5", osuFileHash]]);
    });

    it("compares droid-rebalance with droid-live for scope tool", async () => {
        const res = await post({ scope: "tool", variant: "droid-rebalance" });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            scope: "tool",
            baseline: "droid-live",
        });
        expect(getLookups().map(([name]) => name)).toEqual([
            "droid-rebalance",
            "droid-live",
        ]);
    });

    it("has no baseline for droid-live with scope tool", async () => {
        const res = await post({ scope: "tool", variant: "droid-live" });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            baseline: null,
            baselineResult: null,
        });
        expect(scoreServiceFetch).toHaveBeenCalledTimes(1);
    });

    it("answers 404 when the person has no score on the beatmap", async () => {
        scoreServiceFetch.mockResolvedValue(
            jsonResponse({ error: { code: "SCORE_NOT_FOUND" } }, 404),
        );

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            message: "You have no score on this beatmap",
        });
        // Nothing is looked up for the baseline when the variant has no score.
        expect(scoreServiceFetch).toHaveBeenCalledTimes(1);
    });

    it("answers 404 when the score service does not know the beatmap", async () => {
        scoreServiceFetch.mockResolvedValue(
            jsonResponse({ error: { code: "BEATMAP_NOT_FOUND" } }, 404),
        );

        const res = await post({ scope: "tool", variant: "droid-live" });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            message: "You have no score on this beatmap",
        });
    });

    it.each(["osu-live", "osu-rebalance"])(
        "refuses the osu!standard variant %s",
        async (name) => {
            const res = await post({ scope: "tool", variant: name });

            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({ message: "Rework not found" });
            expect(scoreServiceFetch).not.toHaveBeenCalled();
            expect(Util.downloadBeatmap).not.toHaveBeenCalled();
        },
    );

    it("answers 404 for droid-live with scope variant", async () => {
        const res = await post({ scope: "variant", variant: "droid-live" });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: "Rework not found" });
        expect(scoreServiceFetch).not.toHaveBeenCalled();
    });

    it("answers 404 for a variant the person cannot see", async () => {
        const res = await post({ scope: "variant", variant: "secret" });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: "Rework not found" });
        expect(scoreServiceFetch).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown variant with scope tool", async () => {
        const res = await post({ scope: "tool", variant: "flowaim" });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: "Rework not found" });
    });

    it("answers 503 when the score service fails", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        scoreServiceFetch.mockResolvedValue(
            jsonResponse({ error: { code: "INTERNAL" } }, 500),
        );

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(503);
    });

    it("shows the variant alone when the baseline has no score", async () => {
        scoreServiceFetch.mockImplementation((url) =>
            Promise.resolve(
                url.searchParams.get("variant") === "droid-live"
                    ? jsonResponse({ error: { code: "SCORE_NOT_FOUND" } }, 404)
                    : jsonResponse(scoreBody(120)),
            ),
        );

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            variant: "droid-rebalance",
            baseline: null,
            baselineResult: null,
            result: { performance: { total: 120 } },
        });
    });

    it("shows the variant alone when the baseline lookup returns a different play", async () => {
        scoreServiceFetch.mockImplementation((url) => {
            const isLive = url.searchParams.get("variant") === "droid-live";
            const body = scoreBody(isLive ? 100 : 120);

            if (isLive) {
                body.score.mods = [{ acronym: "HR" }];
            }

            return Promise.resolve(jsonResponse(body));
        });

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            baseline: null,
            baselineResult: null,
            parameters: { mods: [{ acronym: "HD" }, { acronym: "DT" }] },
            result: { performance: { total: 120 } },
        });
    });

    it("treats the same mods in another order as the same play", async () => {
        scoreServiceFetch.mockImplementation((url) => {
            const isLive = url.searchParams.get("variant") === "droid-live";
            const body = scoreBody(isLive ? 100 : 120);

            if (isLive) {
                body.score.mods = [{ acronym: "DT" }, { acronym: "HD" }];
            }

            return Promise.resolve(jsonResponse(body));
        });

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(await res.json()).toMatchObject({ baseline: "droid-live" });
    });

    it("answers 503 when the baseline cannot be looked up", async () => {
        scoreServiceFetch.mockImplementation((url) =>
            Promise.resolve(
                url.searchParams.get("variant") === "droid-live"
                    ? jsonResponse({}, 500)
                    : jsonResponse(scoreBody(120)),
            ),
        );

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(503);
    });

    it("answers 400 for invalid input", async () => {
        const res = await post({
            scope: "tool",
            variant: "droid-live",
            beatmap: "0",
        });

        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message: "Invalid beatmap ID" });
    });

    it("answers 400 when the beatmap cannot be downloaded", async () => {
        vi.mocked(Util.downloadBeatmap).mockResolvedValue("");

        const res = await post({ scope: "tool", variant: "droid-live" });

        expect(res.status).toBe(400);
        expect(scoreServiceFetch).not.toHaveBeenCalled();
    });

    it("answers 400 when the beatmap file is not a beatmap", async () => {
        vi.mocked(Util.downloadBeatmap).mockResolvedValue("not a beatmap");

        const res = await post({ scope: "tool", variant: "droid-live" });

        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message: "Invalid beatmap file" });
        expect(scoreServiceFetch).not.toHaveBeenCalled();
    });
});
