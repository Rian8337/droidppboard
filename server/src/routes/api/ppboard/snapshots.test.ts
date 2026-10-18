import {
    CalculationResponse,
    CalculationSnapshot,
    PPVariant,
} from "app-structures";
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

const dayMs = 24 * 60 * 60 * 1000;

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

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * The score service's answer for a stored play.
 */
function scoreBody(totalPp: number) {
    return {
        score: { mods: [{ acronym: "HD" }] },
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

/**
 * Makes a calculation as a stored snapshot holds it.
 */
function calculation(
    name: string,
    scope: CalculationResponse["scope"] = "variant",
): CalculationResponse {
    return {
        scope,
        variant: name,
        baseline: null,
        calculatorVersion: null,
        calculatedAt: "2026-10-01T00:00:00.000Z",
        beatmap: {
            id: 123,
            hash: "abc",
            title: "Someone - Test Song (Mapper) [Hard]",
            maxCombo: 2,
            cs: 4,
            ar: 9,
            od: 8,
            hp: 5,
        },
        parameters: { beatmap: { id: 123 }, mods: [] },
        result: {
            difficulty: { starRating: 5 },
            performance: { total: 100 },
            strainChart: null,
        },
        baselineResult: null,
        ignoredMods: [],
    };
}

function snapshot(
    id: string,
    name: string,
    overrides: Partial<CalculationSnapshot> & {
        scope?: CalculationResponse["scope"];
    } = {},
): CalculationSnapshot {
    const { scope, ...rest } = overrides;

    return {
        id,
        createdAt: new Date(Date.now() - dayMs).toISOString(),
        expiresAt: new Date(Date.now() + dayMs).toISOString(),
        calculation: calculation(name, scope),
        ...rest,
    };
}

const originalFetch = globalThis.fetch;
const scoreServiceFetch = vi.fn<(url: URL) => Promise<Response>>();
const insertSnapshot =
    vi.fn<(snapshot: CalculationSnapshot) => Promise<void>>();
const findSnapshot =
    vi.fn<(id: string) => Promise<CalculationSnapshot | null>>();

let uid: number | undefined;
let server: Server;
let baseUrl: string;
let BrokerClient: typeof BrokerClientType;
let Util: typeof UtilType;

function post(body: Record<string, unknown> = {}) {
    return fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            beatmap: "123",
            scope: "variant",
            variant: "droid-rebalance",
            ...body,
        }),
    });
}

function get(id: string) {
    return fetch(`${baseUrl}/${id}`);
}

function getInserted(): CalculationSnapshot {
    expect(insertSnapshot).toHaveBeenCalledTimes(1);

    return insertSnapshot.mock.calls[0]![0];
}

describe("calculation snapshots", () => {
    beforeEach(async () => {
        uid = 5;

        vi.stubEnv("DPP_SCORE_SERVICE_URL", "http://scores.test/");
        vi.stubEnv("DPP_SCORE_SERVICE_KEY", "score-key");

        insertSnapshot.mockReset().mockResolvedValue(undefined);
        findSnapshot.mockReset().mockResolvedValue(null);
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

        const { DatabaseManager } = await import(
            "../../../database/managers/DatabaseManager"
        );

        DatabaseManager.aliceDb = {
            collections: {
                calculationSnapshots: { insertSnapshot, findSnapshot },
            },
        } as never;

        const snapshots = (await import("./snapshots")).default;

        // The broker leaves private variants out of a list for someone who cannot see them.
        vi.spyOn(BrokerClient, "getVariants").mockImplementation((actingUid) =>
            Promise.resolve([
                variant("droid-live"),
                variant("droid-rebalance"),
                variant("osu-live"),
                variant("osu-rebalance"),
                ...(actingUid === 5 ? [variant("secret")] : []),
            ]),
        );
        vi.spyOn(BrokerClient, "getVariant").mockImplementation((name) =>
            Promise.resolve(variant(name)),
        );
        vi.spyOn(BrokerClient, "calculatePerformance").mockResolvedValue({
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
        app.use("/", snapshots);

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

    describe("POST /", () => {
        it("requires a login", async () => {
            uid = undefined;

            const res = await post();

            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({ message: "Not logged in" });
            expect(insertSnapshot).not.toHaveBeenCalled();
            expect(Util.downloadBeatmap).not.toHaveBeenCalled();
        });

        it("stores the calculation and answers with an ID and the expiry", async () => {
            const res = await post();

            expect(res.status).toBe(201);
            expect(res.headers.get("cache-control")).toBe("no-store");

            const body = (await res.json()) as {
                id: string;
                expiresAt: string;
            };
            const stored = getInserted();

            expect(body.id).toMatch(/^[A-Za-z0-9_-]{10}$/);
            expect(Object.keys(body).sort()).toEqual(["expiresAt", "id"]);
            expect(stored.id).toBe(body.id);
            expect(stored.expiresAt).toBe(body.expiresAt);
            expect(stored.calculation).toMatchObject({
                scope: "variant",
                variant: "droid-rebalance",
                baseline: "droid-live",
                beatmap: {
                    id: 123,
                    title: "Someone - Test Song (Mapper) [Hard]",
                },
            });
        });

        it("makes a different ID each time", async () => {
            const first = (await (await post()).json()) as { id: string };
            const second = (await (await post()).json()) as { id: string };

            expect(first.id).not.toBe(second.id);
        });

        it("stores the server's recalculation, not numbers from the request", async () => {
            const res = await post({
                calculation: calculation("droid-rebalance"),
                result: {
                    difficulty: { starRating: 99 },
                    performance: { total: 99999 },
                    strainChart: null,
                },
                baselineResult: null,
                createdAt: "2000-01-01T00:00:00.000Z",
                expiresAt: "2999-01-01T00:00:00.000Z",
                id: "forged0000",
            });

            expect(res.status).toBe(201);
            expect(
                (await res.json()) as { id: string; expiresAt: string },
            ).not.toMatchObject({ id: "forged0000" });

            const stored = getInserted();

            expect(stored.id).not.toBe("forged0000");
            expect(stored.expiresAt).not.toContain("2999");
            expect(stored.calculation.result).toEqual({
                difficulty: { starRating: 5 },
                performance: { total: 100 },
                strainChart: null,
            });
            expect(stored.calculation.baselineResult).toEqual({
                difficulty: { starRating: 5 },
                performance: { total: 100 },
                strainChart: null,
            });
            expect(BrokerClient.calculatePerformance).toHaveBeenCalled();
        });

        it("expires 30 days after creation by default", async () => {
            await post();

            const stored = getInserted();

            expect(
                Date.parse(stored.expiresAt) - Date.parse(stored.createdAt),
            ).toBe(30 * dayMs);
            expect(Date.parse(stored.createdAt)).toBeGreaterThan(
                Date.now() - 5000,
            );
        });

        it("follows SNAPSHOT_TTL_DAYS", async () => {
            vi.stubEnv("SNAPSHOT_TTL_DAYS", "7");

            await post();

            const stored = getInserted();

            expect(
                Date.parse(stored.expiresAt) - Date.parse(stored.createdAt),
            ).toBe(7 * dayMs);
        });

        it.each(["0", "-3", "abc", ""])(
            "falls back to 30 days when SNAPSHOT_TTL_DAYS is %j",
            async (value) => {
                vi.stubEnv("SNAPSHOT_TTL_DAYS", value);

                await post();

                const stored = getInserted();

                expect(
                    Date.parse(stored.expiresAt) - Date.parse(stored.createdAt),
                ).toBe(30 * dayMs);
            },
        );

        it("stores the person's own score for source my-score", async () => {
            const res = await post({ source: "my-score" });

            expect(res.status).toBe(201);
            expect(
                scoreServiceFetch.mock.calls.map(([url]) => [
                    url.searchParams.get("variant"),
                    url.searchParams.get("uid"),
                ]),
            ).toEqual([
                ["droid-rebalance", "5"],
                ["droid-live", "5"],
            ]);
            expect(BrokerClient.calculatePerformance).not.toHaveBeenCalled();
            expect(getInserted().calculation).toMatchObject({
                variant: "droid-rebalance",
                baseline: "droid-live",
                parameters: { mods: [{ acronym: "HD" }], combo: 2 },
                result: { performance: { total: 120 } },
                baselineResult: { performance: { total: 100 } },
            });
        });

        it("answers 404 for source my-score when the person has no score", async () => {
            scoreServiceFetch.mockResolvedValue(
                jsonResponse({ error: { code: "SCORE_NOT_FOUND" } }, 404),
            );

            const res = await post({ source: "my-score" });

            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({
                message: "You have no score on this beatmap",
            });
            expect(insertSnapshot).not.toHaveBeenCalled();
        });

        it("refuses an osu!standard variant for source my-score", async () => {
            const res = await post({
                source: "my-score",
                scope: "tool",
                variant: "osu-live",
            });

            expect(res.status).toBe(404);
            expect(insertSnapshot).not.toHaveBeenCalled();
        });

        it("calculates an osu!standard variant of the calculator tool", async () => {
            const res = await post({ scope: "tool", variant: "osu-rebalance" });

            expect(res.status).toBe(201);
            expect(getInserted().calculation).toMatchObject({
                scope: "tool",
                variant: "osu-rebalance",
                baseline: "osu-live",
            });
        });

        it("answers 404 for a variant the person cannot see", async () => {
            uid = 6;

            const res = await post({ variant: "secret" });

            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({ message: "Rework not found" });
            expect(insertSnapshot).not.toHaveBeenCalled();
        });

        it("answers 404 for droid-live with scope variant", async () => {
            const res = await post({ variant: "droid-live" });

            expect(res.status).toBe(404);
            expect(insertSnapshot).not.toHaveBeenCalled();
        });

        it("answers 400 for invalid input", async () => {
            const res = await post({ beatmap: "0" });

            expect(res.status).toBe(400);
            expect(await res.json()).toEqual({ message: "Invalid beatmap ID" });
            expect(insertSnapshot).not.toHaveBeenCalled();
        });

        it("stores nothing when the calculation fails", async () => {
            vi.spyOn(console, "error").mockImplementation(() => undefined);
            vi.mocked(BrokerClient.calculatePerformance).mockResolvedValue({
                status: 500,
                body: {},
            });

            const res = await post();

            expect(res.status).toBe(503);
            expect(insertSnapshot).not.toHaveBeenCalled();
        });

        it("tries another ID once when the ID is already taken", async () => {
            insertSnapshot.mockRejectedValueOnce(
                Object.assign(new Error("duplicate key"), { code: 11000 }),
            );

            const res = await post();
            const body = (await res.json()) as { id: string };

            expect(res.status).toBe(201);
            expect(insertSnapshot).toHaveBeenCalledTimes(2);

            const [first, second] = insertSnapshot.mock.calls.map(
                ([stored]) => stored,
            );

            expect(second!.id).not.toBe(first!.id);
            expect(body.id).toBe(second!.id);
            expect(second!.calculation).toEqual(first!.calculation);
        });

        it("does not retry a second clash or any other failure", async () => {
            vi.spyOn(console, "error").mockImplementation(() => undefined);
            insertSnapshot.mockRejectedValue(
                Object.assign(new Error("duplicate key"), { code: 11000 }),
            );

            expect((await post()).status).toBe(500);
            expect(insertSnapshot).toHaveBeenCalledTimes(2);

            insertSnapshot.mockReset().mockRejectedValue(new Error("down"));

            expect((await post()).status).toBe(500);
            expect(insertSnapshot).toHaveBeenCalledTimes(1);
        });

        it("answers 429 on the sixth request in a minute", async () => {
            for (let i = 0; i < 5; i++) {
                expect((await post()).status).toBe(201);
            }

            const res = await post();

            expect(res.status).toBe(429);
            expect(insertSnapshot).toHaveBeenCalledTimes(5);
        });

        it("limits each person on their own", async () => {
            for (let i = 0; i < 5; i++) {
                await post();
            }

            uid = 6;

            expect((await post()).status).toBe(201);
        });
    });

    describe("GET /:id", () => {
        it("answers with the snapshot", async () => {
            const stored = snapshot("abcdefghij", "droid-rebalance");

            findSnapshot.mockResolvedValue(stored);

            const res = await get("abcdefghij");

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual(stored);
            expect(findSnapshot).toHaveBeenCalledWith("abcdefghij");
        });

        it("lets a visitor read a snapshot of a public variant", async () => {
            uid = undefined;
            findSnapshot.mockResolvedValue(
                snapshot("abcdefghij", "droid-rebalance"),
            );

            expect((await get("abcdefghij")).status).toBe(200);
        });

        it("answers 404 for an unknown ID", async () => {
            const res = await get("abcdefghij");

            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({ message: "Snapshot not found" });
        });

        it("answers 404 with the same body for a private variant the person cannot see", async () => {
            findSnapshot.mockResolvedValue(snapshot("abcdefghij", "secret"));
            uid = 6;

            const unknown = await get("zzzzzzzzzz");
            const hidden = await get("abcdefghij");

            findSnapshot.mockResolvedValue(null);

            const missing = await get("abcdefghij");

            expect(hidden.status).toBe(404);
            expect(await hidden.json()).toEqual({
                message: "Snapshot not found",
            });
            expect(hidden.status).toBe(missing.status);
            expect(unknown.status).toBe(missing.status);
            expect(await missing.json()).toEqual({
                message: "Snapshot not found",
            });
        });

        it("answers 404 for a private variant to a visitor", async () => {
            uid = undefined;
            findSnapshot.mockResolvedValue(snapshot("abcdefghij", "secret"));

            const res = await get("abcdefghij");

            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({ message: "Snapshot not found" });
        });

        it("lets a person who can see the private variant read it", async () => {
            const stored = snapshot("abcdefghij", "secret");

            findSnapshot.mockResolvedValue(stored);

            const res = await get("abcdefghij");

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual(stored);
        });

        it("always lets anyone read a snapshot with scope tool", async () => {
            uid = undefined;

            const stored = snapshot("abcdefghij", "osu-rebalance", {
                scope: "tool",
            });

            findSnapshot.mockResolvedValue(stored);

            const res = await get("abcdefghij");

            expect(res.status).toBe(200);
            expect(await res.json()).toEqual(stored);
        });

        it("answers 410 when the snapshot has expired but is still stored", async () => {
            findSnapshot.mockResolvedValue(
                snapshot("abcdefghij", "droid-rebalance", {
                    expiresAt: new Date(Date.now() - 1000).toISOString(),
                }),
            );

            const res = await get("abcdefghij");

            expect(res.status).toBe(410);
            expect(await res.json()).toEqual({
                message: "This snapshot has expired",
            });
        });

        it("treats a snapshot that expires right now as expired", async () => {
            const now = new Date("2026-10-18T12:00:00.000Z");

            vi.useFakeTimers({ toFake: ["Date"] });
            vi.setSystemTime(now);

            try {
                findSnapshot.mockResolvedValue(
                    snapshot("abcdefghij", "droid-rebalance", {
                        expiresAt: now.toISOString(),
                    }),
                );

                expect((await get("abcdefghij")).status).toBe(410);
            } finally {
                vi.useRealTimers();
            }
        });

        it("keeps a private variant's expired snapshot hidden from someone who cannot see it", async () => {
            uid = 6;
            findSnapshot.mockResolvedValue(
                snapshot("abcdefghij", "secret", {
                    expiresAt: new Date(Date.now() - 1000).toISOString(),
                }),
            );

            const res = await get("abcdefghij");

            expect(res.status).toBe(404);
            expect(await res.json()).toEqual({ message: "Snapshot not found" });
        });

        it("answers 503 when the variants cannot be listed", async () => {
            vi.mocked(BrokerClient.getVariants).mockResolvedValue(null);
            findSnapshot.mockResolvedValue(
                snapshot("abcdefghij", "droid-rebalance"),
            );

            expect((await get("abcdefghij")).status).toBe(503);
        });

        it("does not let a cache share the answer between people", async () => {
            findSnapshot.mockResolvedValue(
                snapshot("abcdefghij", "droid-rebalance"),
            );

            expect((await get("abcdefghij")).headers.get("cache-control")).toBe(
                "no-store",
            );
        });
    });
});
