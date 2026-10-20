import { PPVariant } from "app-structures";
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
        builtAt: null,
        calculatorVersion: null,
        ...overrides,
    };
}

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

describe("POST /calculate", () => {
    beforeEach(async () => {
        uid = undefined;

        // The route's rate limit is kept per module instance.
        vi.resetModules();

        ({ BrokerClient } = await import("../../../clients/BrokerClient"));
        ({ Util } = await import("../../../utils/Util"));

        const calculate = (await import("./calculate")).default;

        // The broker answers a private variant as not found to a visitor.
        vi.spyOn(BrokerClient, "getVariant").mockImplementation((name) =>
            Promise.resolve(
                name === "secret"
                    ? "notFound"
                    : variant(name, {
                          calculatorVersion:
                              name === "osu-rebalance" ? "9.9.9" : null,
                      }),
            ),
        );
        calculatePerformance = vi
            .spyOn(BrokerClient, "calculatePerformance")
            .mockResolvedValue({
                status: 200,
                body: {
                    difficulty: { starRating: 5 },
                    performance: { total: 100 },
                },
            });
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
        app.use("/", calculate);

        await new Promise<void>((resolve) => {
            server = app.listen(0, "127.0.0.1", resolve);
        });

        baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        vi.restoreAllMocks();
    });

    it("calculates a visible variant against droid-live", async () => {
        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(await res.json()).toMatchObject({
            scope: "variant",
            variant: "droid-rebalance",
            baseline: "droid-live",
            beatmap: { id: 123, title: "Someone - Test Song (Mapper) [Hard]" },
        });
        expect(calculatePerformance.mock.calls.map((c) => c[0]).sort()).toEqual(
            ["droid-live", "droid-rebalance"],
        );
    });

    it("calculates an uploaded .osu file", async () => {
        const form = new FormData();

        form.set("scope", "tool");
        form.set("variant", "droid-live");
        form.set("mods", "[]");
        form.set("beatmapfile", new Blob([osuFile]), "map.osu");

        const res = await fetch(baseUrl, { method: "POST", body: form });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            beatmap: { id: null, title: "Someone - Test Song (Mapper) [Hard]" },
            parameters: { beatmap: { file: true } },
        });
        expect(Util.downloadBeatmap).not.toHaveBeenCalled();
    });

    it("answers 404 for droid-live with scope variant", async () => {
        const res = await post({ scope: "variant", variant: "droid-live" });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: "Rework not found" });
        expect(calculatePerformance).not.toHaveBeenCalled();
    });

    it("answers 404 for a private variant the person cannot see", async () => {
        const res = await post({ scope: "variant", variant: "secret" });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: "Rework not found" });
        expect(Util.downloadBeatmap).not.toHaveBeenCalled();
        expect(calculatePerformance).not.toHaveBeenCalled();
    });

    it("calculates a private variant for a person who can see it", async () => {
        uid = 77;
        vi.mocked(BrokerClient.getVariant).mockResolvedValue(
            variant("secret", { public: false }),
        );

        const res = await post({ scope: "variant", variant: "secret" });

        expect(res.status).toBe(200);
        expect(BrokerClient.getVariant).toHaveBeenCalledWith("secret", 77);
        expect(calculatePerformance).toHaveBeenCalledWith(
            "secret",
            expect.anything(),
            77,
        );
    });

    it("accepts osu-rebalance with scope tool and compares it to osu-live", async () => {
        const res = await post({ scope: "tool", variant: "osu-rebalance" });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            scope: "tool",
            variant: "osu-rebalance",
            baseline: "osu-live",
            calculatorVersion: "9.9.9",
        });
        expect(calculatePerformance.mock.calls.map((c) => c[0]).sort()).toEqual(
            ["osu-live", "osu-rebalance"],
        );
    });

    it("answers 404 for flowaim with scope tool", async () => {
        const res = await post({ scope: "tool", variant: "flowaim" });

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ message: "Rework not found" });
        expect(calculatePerformance).not.toHaveBeenCalled();
    });

    it("returns no baseline for droid-live with scope tool", async () => {
        const res = await post({ scope: "tool", variant: "droid-live" });

        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
            baseline: null,
            baselineResult: null,
        });
        expect(calculatePerformance).toHaveBeenCalledTimes(1);
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
    });

    it("answers 503 when the broker cannot be reached", async () => {
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        calculatePerformance.mockResolvedValue({ status: 502, body: null });

        const res = await post({ scope: "tool", variant: "droid-live" });

        expect(res.status).toBe(503);
    });

    it("answers 503 when the variant cannot be fetched", async () => {
        vi.mocked(BrokerClient.getVariant).mockResolvedValue(null);

        const res = await post({
            scope: "variant",
            variant: "droid-rebalance",
        });

        expect(res.status).toBe(503);
    });
});
