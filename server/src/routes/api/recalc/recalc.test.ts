import express, { RequestHandler } from "express";
import { AddressInfo } from "net";
import { Server } from "http";
import { PPVariant } from "app-structures";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecalculationQueue } from "../../../recalculation/RecalculationQueue";

const mocks = vi.hoisted(() => ({
    getVariants: vi.fn(),
    getMe: vi.fn(),
    findPlayer: vi.fn(),
    getUsernames: vi.fn(),
    queue: undefined as unknown,
}));

vi.mock("../../../auth/OsuDroidAccounts", () => ({
    OsuDroidAccounts: {
        findPlayer: mocks.findPlayer,
        getUsernames: mocks.getUsernames,
    },
}));
vi.mock("../../../clients/BrokerClient", () => ({
    BrokerClient: { getVariants: mocks.getVariants, getMe: mocks.getMe },
}));
vi.mock("../../../recalculation/instance", () => ({
    get recalculationQueue() {
        return mocks.queue;
    },
}));

function variant(name: string, overrides: Partial<PPVariant> = {}): PPVariant {
    return {
        name,
        title: null,
        aliases: [],
        description: null,
        available: true,
        healthyInstanceCount: 1,
        mode: "droid",
        algorithm: null,
        public: true,
        builtAt: null,
        calculatorVersion: null,
        ...overrides,
    };
}

const visibleVariants = [
    variant("droid-rebalance", { aliases: ["rebalance"] }),
    variant("flowaim"),
    variant("osu-live", { mode: "osu" }),
];

let server: Server;
let baseUrl: string;
let queue: RecalculationQueue;
let time: number;
let fullRunStore: {
    countProfiles: ReturnType<typeof vi.fn>;
    countScanned: ReturnType<typeof vi.fn>;
    getUnscannedUids: ReturnType<typeof vi.fn>;
    resetScanDone: ReturnType<typeof vi.fn>;
    addMissingProfiles: ReturnType<typeof vi.fn>;
};

// Stands in for the session middleware: a request is logged in as the uid in this header.
const testSession: RequestHandler = (req, res, next) => {
    const uid = req.get("X-Test-Uid");

    if (uid !== undefined) {
        res.locals.uid = parseInt(uid);
    }

    next();
};

async function start() {
    const recalc = (await import("./recalc")).default;

    const app = express();

    app.use(express.json());
    app.use("/api/recalc", testSession, recalc);

    await new Promise<void>((resolve) => {
        server = app.listen(0, "127.0.0.1", resolve);
    });

    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function request(
    method: string,
    path: string,
    options: { body?: unknown; uid?: number | null } = {},
) {
    const uid = options.uid === undefined ? 42 : options.uid;

    return fetch(baseUrl + path, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(uid === null ? {} : { "X-Test-Uid": uid.toString() }),
        },
        body:
            options.body === undefined
                ? undefined
                : JSON.stringify(options.body),
    });
}

describe("recalculation routes", () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.spyOn(console, "error").mockImplementation(() => {});

        time = 1_000_000;
        fullRunStore = {
            countProfiles: vi.fn().mockResolvedValue(10),
            countScanned: vi.fn().mockResolvedValue(0),
            getUnscannedUids: vi.fn().mockResolvedValue([]),
            resetScanDone: vi.fn().mockResolvedValue(undefined),
            addMissingProfiles: vi.fn().mockResolvedValue(undefined),
        };

        let ids = 0;

        queue = new RecalculationQueue({
            now: () => time,
            newId: () => `id-${(++ids).toString()}`,
            limits: {
                maxActivePerPerson: 2,
                addCooldownSeconds: 10,
                finishedRetentionMinutes: 60,
            },
            // Entries stay calculating, so that the tests see them as they are queued.
            calculate: () => new Promise(() => {}),
            getCapacity: () => Promise.resolve(1),
            fullRunStore,
        });
        mocks.queue = queue;

        mocks.getVariants.mockResolvedValue(visibleVariants);
        mocks.getMe.mockResolvedValue({ uid: 42, role: null, grants: [] });
        mocks.findPlayer.mockResolvedValue({
            id: 1000,
            username: "Player",
            archived: false,
        });
        mocks.getUsernames.mockResolvedValue(new Map([[42, "Queuer"]]));

        await start();
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
        vi.restoreAllMocks();
        mocks.getVariants.mockReset();
        mocks.getMe.mockReset();
        mocks.findPlayer.mockReset();
        mocks.getUsernames.mockReset();
    });

    describe("GET /queue", () => {
        it("shows the global view to visitors without defaulting to a variant", async () => {
            // droid-rebalance is not visible here, so a default would make this a 404.
            mocks.getVariants.mockResolvedValue([variant("flowaim")]);

            const response = await request("GET", "/api/recalc/queue", {
                uid: null,
            });
            const body = (await response.json()) as Record<string, unknown>;

            expect(response.status).toBe(200);
            expect(body).toMatchObject({
                variant: null,
                allowance: null,
                canManageFullRuns: false,
            });
            expect(mocks.getMe).not.toHaveBeenCalled();
            expect(mocks.getVariants).toHaveBeenCalledWith(undefined);
        });

        it("lists the droid variants the viewer can see for the picker", async () => {
            const response = await request("GET", "/api/recalc/queue", {
                uid: null,
            });
            const body = (await response.json()) as { variants: PPVariant[] };

            // The osu variant is not a prototype variant, so it is left out.
            expect(body.variants.map((v) => v.name)).toEqual([
                "droid-rebalance",
                "flowaim",
            ]);

            const selected = await request(
                "GET",
                "/api/recalc/queue?variant=flowaim",
            );

            expect(
                ((await selected.json()) as { variants: PPVariant[] }).variants,
            ).toHaveLength(2);
        });

        it("resolves aliases and answers 404 for an unknown, osu or private variant", async () => {
            const aliased = await request(
                "GET",
                "/api/recalc/queue?variant=rebalance",
            );

            expect(aliased.status).toBe(200);
            expect(await aliased.json()).toMatchObject({
                variant: "droid-rebalance",
            });

            for (const name of ["nope", "osu-live", "a&variant=b", ""]) {
                const response = await request(
                    "GET",
                    `/api/recalc/queue?variant=${encodeURIComponent(name)}`,
                );

                expect(response.status).toBe(404);
            }

            const array = await request(
                "GET",
                "/api/recalc/queue?variant=a&variant=b",
            );

            expect(array.status).toBe(404);
        });

        it("tells admins they can manage full runs", async () => {
            mocks.getMe.mockResolvedValue({
                uid: 42,
                role: "admin",
                grants: [],
            });

            const response = await request("GET", "/api/recalc/queue");

            expect(await response.json()).toMatchObject({
                canManageFullRuns: true,
            });
        });

        it("answers 503 when the variants cannot be fetched", async () => {
            mocks.getVariants.mockResolvedValue(null);

            const response = await request("GET", "/api/recalc/queue");

            expect(response.status).toBe(503);
        });
    });

    describe("POST /queue", () => {
        const body = { variant: "rebalance", uid: 1000 };

        it("queues a player under the canonical variant", async () => {
            const response = await request("POST", "/api/recalc/queue", {
                body,
            });
            const entry = (await response.json()) as Record<string, unknown>;

            expect(response.status).toBe(201);
            expect(entry).toMatchObject({
                uid: 1000,
                username: "Player",
                variant: "droid-rebalance",
                queuedByUid: 42,
                queuedByUsername: "Queuer",
            });
            expect(mocks.findPlayer).toHaveBeenCalledWith(1000);
        });

        it("looks players up by username", async () => {
            await request("POST", "/api/recalc/queue", {
                body: { variant: "flowaim", username: "  Player " },
            });

            expect(mocks.findPlayer).toHaveBeenCalledWith("Player");
        });

        it("answers 401 to visitors and 400 to malformed requests", async () => {
            expect(
                (
                    await request("POST", "/api/recalc/queue", {
                        body,
                        uid: null,
                    })
                ).status,
            ).toBe(401);
            expect(
                (
                    await request("POST", "/api/recalc/queue", {
                        body: { variant: "flowaim" },
                    })
                ).status,
            ).toBe(400);
        });

        it("answers 404 for a missing variant, a missing player and an archived player", async () => {
            const missingVariant = await request("POST", "/api/recalc/queue", {
                body: { variant: "nope", uid: 1000 },
            });

            expect(missingVariant.status).toBe(404);

            // droid-live is the baseline, so it is never queued even when the broker lists it.
            mocks.getVariants.mockResolvedValueOnce([
                ...visibleVariants,
                variant("droid-live"),
            ]);

            const liveVariant = await request("POST", "/api/recalc/queue", {
                body: { variant: "droid-live", uid: 1000 },
            });

            expect(liveVariant.status).toBe(404);

            mocks.findPlayer.mockResolvedValueOnce(null);

            const missingPlayer = await request("POST", "/api/recalc/queue", {
                body,
            });

            expect(missingPlayer.status).toBe(404);

            mocks.findPlayer.mockResolvedValueOnce({
                id: 1000,
                username: "Player",
                archived: true,
            });

            const archived = await request("POST", "/api/recalc/queue", {
                body,
            });

            expect(archived.status).toBe(404);
            expect(await archived.json()).toEqual({
                message: "This player is archived",
            });
        });

        it("answers 409 for an unavailable variant and for a duplicate", async () => {
            mocks.getVariants.mockResolvedValueOnce([
                variant("flowaim", { healthyInstanceCount: 0 }),
            ]);

            const unavailable = await request("POST", "/api/recalc/queue", {
                body: { variant: "flowaim", uid: 1000 },
            });

            expect(unavailable.status).toBe(409);

            expect(
                (await request("POST", "/api/recalc/queue", { body })).status,
            ).toBe(201);

            time += 20_000;

            expect(
                (await request("POST", "/api/recalc/queue", { body })).status,
            ).toBe(409);
        });

        it("answers 409 when a broker that predates the instance count omits it", async () => {
            const { healthyInstanceCount: _omitted, ...withoutCount } = variant(
                "flowaim",
            );

            mocks.getVariants.mockResolvedValueOnce([withoutCount]);

            const response = await request("POST", "/api/recalc/queue", {
                body: { variant: "flowaim", uid: 1000 },
            });

            expect(response.status).toBe(409);
            expect(queue.allowance(42).active).toBe(0);
        });

        it("answers 429 with Retry-After for the cooldown, and names the limit", async () => {
            mocks.findPlayer.mockImplementation((uid: number) =>
                Promise.resolve({
                    id: uid,
                    username: `Player${uid.toString()}`,
                    archived: false,
                }),
            );

            expect(
                (await request("POST", "/api/recalc/queue", { body })).status,
            ).toBe(201);

            const cooldown = await request("POST", "/api/recalc/queue", {
                body: { variant: "flowaim", uid: 1001 },
            });

            expect(cooldown.status).toBe(429);
            expect(cooldown.headers.get("Retry-After")).toBe("10");
            expect(
                ((await cooldown.json()) as { message: string }).message,
            ).toContain("seconds");

            time += 20_000;
            await request("POST", "/api/recalc/queue", {
                body: { variant: "flowaim", uid: 1001 },
            });
            time += 20_000;

            const limit = await request("POST", "/api/recalc/queue", {
                body: { variant: "flowaim", uid: 1002 },
            });

            expect(limit.status).toBe(429);
            expect(
                ((await limit.json()) as { message: string }).message,
            ).toContain("at most 2");
        });

        it("answers 500 without details when the account lookup fails", async () => {
            mocks.findPlayer.mockRejectedValueOnce(new Error("db password"));

            const response = await request("POST", "/api/recalc/queue", {
                body,
            });

            expect(response.status).toBe(500);
            expect(JSON.stringify(await response.json())).not.toContain(
                "db password",
            );
        });
    });

    describe("DELETE /queue/:id", () => {
        async function add(variantName: string, by = 42) {
            const result = queue.enqueue({
                uid: 1000,
                username: "Player",
                variant: variantName,
                capacity: 0,
                queuedByUid: by,
                queuedByUsername: "Queuer",
            });

            if (!result.ok) {
                throw new Error("Expected the entry to be queued");
            }

            return result.entry.id;
        }

        it("removes the person's own waiting entry", async () => {
            const id = await add("flowaim");

            expect(
                (await request("DELETE", `/api/recalc/queue/${id}`)).status,
            ).toBe(204);
            expect(queue.getEntryVariant(id)).toBeUndefined();
        });

        it("answers 404 for a missing entry and 403 for another person's unless an admin", async () => {
            expect(
                (await request("DELETE", "/api/recalc/queue/missing")).status,
            ).toBe(404);

            const others = await add("flowaim", 7);

            expect(
                (await request("DELETE", `/api/recalc/queue/${others}`)).status,
            ).toBe(403);

            mocks.getMe.mockResolvedValue({
                uid: 42,
                role: "admin",
                grants: [],
            });
            expect(
                (await request("DELETE", `/api/recalc/queue/${others}`)).status,
            ).toBe(204);
        });

        it("lets a manager remove only their own entries", async () => {
            mocks.getMe.mockResolvedValue({
                uid: 42,
                role: "manager",
                grants: [],
            });

            const others = await add("flowaim", 7);

            expect(
                (await request("DELETE", `/api/recalc/queue/${others}`)).status,
            ).toBe(403);
            expect(queue.getEntryVariant(others)).toBeDefined();
        });

        it("answers 409 for an entry that is calculating", async () => {
            const result = queue.enqueue({
                uid: 5,
                username: "X",
                variant: "flowaim",
                capacity: 1,
                queuedByUid: 42,
                queuedByUsername: "Queuer",
            });

            if (!result.ok) {
                throw new Error("Expected the entry to be queued");
            }

            expect(
                (
                    await request(
                        "DELETE",
                        `/api/recalc/queue/${result.entry.id}`,
                    )
                ).status,
            ).toBe(409);
        });

        it("answers 404, not 403, for an entry of a variant the person cannot see", async () => {
            const id = await add("private-variant", 7);

            // Even an admin of the entry's queuer: the variant is not in the visible list.
            expect(
                (await request("DELETE", `/api/recalc/queue/${id}`)).status,
            ).toBe(404);

            mocks.getMe.mockResolvedValue({
                uid: 42,
                role: "admin",
                grants: [],
            });
            expect(
                (await request("DELETE", `/api/recalc/queue/${id}`)).status,
            ).toBe(404);
            expect(queue.getEntryVariant(id)).toBe("private-variant");
        });

        it("answers 401 to visitors", async () => {
            const id = await add("flowaim");

            expect(
                (
                    await request("DELETE", `/api/recalc/queue/${id}`, {
                        uid: null,
                    })
                ).status,
            ).toBe(401);
        });
    });

    describe("full runs", () => {
        beforeEach(() => {
            mocks.getMe.mockResolvedValue({
                uid: 42,
                role: "admin",
                grants: [],
            });
        });

        it("starts a full run for an admin, acting as them", async () => {
            const response = await request(
                "POST",
                "/api/recalc/full-runs/rebalance/start",
                { body: { restart: true } },
            );

            expect(response.status).toBe(204);
            expect(fullRunStore.resetScanDone).toHaveBeenCalledWith(
                "droid-rebalance",
            );

            const view = queue.snapshot(
                new Set(["droid-rebalance"]),
                null,
                undefined,
            );

            expect(view.fullRuns).toMatchObject([
                {
                    variant: "droid-rebalance",
                    startedByUid: 42,
                    startedByUsername: "Queuer",
                },
            ]);
        });

        it("answers 409 for a run that is already running, and for stopping none", async () => {
            // The run waits for its first players, so that it stays running.
            fullRunStore.getUnscannedUids.mockReturnValue(
                new Promise(() => {}),
            );

            const stopNone = await request(
                "POST",
                "/api/recalc/full-runs/flowaim/stop",
            );

            expect(stopNone.status).toBe(409);

            expect(
                (
                    await request(
                        "POST",
                        "/api/recalc/full-runs/flowaim/start",
                    )
                ).status,
            ).toBe(204);
            expect(
                (
                    await request(
                        "POST",
                        "/api/recalc/full-runs/flowaim/start",
                    )
                ).status,
            ).toBe(409);
            expect(
                (await request("POST", "/api/recalc/full-runs/flowaim/stop"))
                    .status,
            ).toBe(204);
        });

        it("answers 403 to anyone who is not an admin, whatever the variant", async () => {
            for (const me of [
                { uid: 42, role: "manager", grants: [] },
                { uid: 42, role: null, grants: [] },
                null,
            ]) {
                mocks.getMe.mockResolvedValue(me);

                for (const path of [
                    "/api/recalc/full-runs/flowaim/start",
                    "/api/recalc/full-runs/flowaim/stop",
                    "/api/recalc/full-runs/private-variant/start",
                ]) {
                    expect((await request("POST", path)).status).toBe(403);
                }
            }
        });

        it("answers 401 to visitors, 404 for an invisible variant and 400 for a bad body", async () => {
            expect(
                (
                    await request(
                        "POST",
                        "/api/recalc/full-runs/flowaim/start",
                        { uid: null },
                    )
                ).status,
            ).toBe(401);
            expect(
                (
                    await request(
                        "POST",
                        "/api/recalc/full-runs/private-variant/start",
                    )
                ).status,
            ).toBe(404);
            expect(
                (await request("POST", "/api/recalc/full-runs/osu-live/stop"))
                    .status,
            ).toBe(404);
            expect(
                (
                    await request(
                        "POST",
                        "/api/recalc/full-runs/flowaim/start",
                        { body: { restart: "yes" } },
                    )
                ).status,
            ).toBe(400);
        });

        it("answers 500 without details when starting the run rejects", async () => {
            fullRunStore.countProfiles.mockRejectedValue(
                new Error("mongodb://user:pass@host"),
            );

            const response = await request(
                "POST",
                "/api/recalc/full-runs/flowaim/start",
            );
            const text = await response.text();

            expect(response.status).toBe(500);
            expect(JSON.parse(text)).toEqual({
                message: "Could not start the full run",
            });
            expect(text).not.toContain("pass");
            expect(String(vi.mocked(console.error).mock.calls)).not.toContain(
                "pass@host",
            );
        });
    });
});
