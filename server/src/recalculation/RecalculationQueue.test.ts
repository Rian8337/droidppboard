import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readRecalcLimits } from "./limits";
import {
    FullRunStore,
    RecalculationQueue,
    RecalculationQueueDeps,
} from "./RecalculationQueue";
import { ProfileOutcome } from "./ProfileCalculator";

interface PendingCalculation {
    uid: number;
    variant: string;
    actingUid: number;
    onProgress: (done: number, total: number) => void;
    resolve: (outcome: ProfileOutcome) => void;
    reject: (error: unknown) => void;
}

const minute = 60_000;

/**
 * An in-memory `FullRunStore`.
 */
class FakeFullRunStore implements FullRunStore {
    readonly profiles = new Map<
        string,
        Map<number, { localPPTotal: number; scanned: boolean }>
    >();
    resetCalls: string[] = [];
    cloneCalls: [string, string][] = [];

    /**
     * Adds unscanned profiles, the first of which has the highest local pp.
     */
    seed(variant: string, uids: number[], scanned = false) {
        const variantProfiles = this.variant(variant);

        uids.forEach((uid, i) => {
            variantProfiles.set(uid, {
                localPPTotal: (uids.length - i) * 100,
                scanned,
            });
        });
    }

    markScanned(variant: string, uid: number) {
        const profile = this.variant(variant).get(uid);

        if (profile) {
            profile.scanned = true;
        }
    }

    scannedUids(variant: string) {
        return [...this.variant(variant)]
            .filter(([, p]) => p.scanned)
            .map(([uid]) => uid);
    }

    countProfiles(reworkType: string) {
        return Promise.resolve(this.variant(reworkType).size);
    }

    countScanned(reworkType: string) {
        return Promise.resolve(this.scannedUids(reworkType).length);
    }

    getUnscannedUids(reworkType: string, excludeUids: number[], limit: number) {
        return Promise.resolve(
            [...this.variant(reworkType)]
                .filter(([uid, p]) => !p.scanned && !excludeUids.includes(uid))
                .sort(([, a], [, b]) => b.localPPTotal - a.localPPTotal)
                .slice(0, limit)
                .map(([uid]) => uid),
        );
    }

    resetScanDone(reworkType: string) {
        this.resetCalls.push(reworkType);

        for (const profile of this.variant(reworkType).values()) {
            profile.scanned = false;
        }

        return Promise.resolve();
    }

    cloneProfiles(source: string, target: string) {
        this.cloneCalls.push([source, target]);

        for (const uid of this.variant(source).keys()) {
            this.variant(target).set(uid, { localPPTotal: 0, scanned: false });
        }

        return Promise.resolve();
    }

    private variant(name: string) {
        let found = this.profiles.get(name);

        if (!found) {
            found = new Map();
            this.profiles.set(name, found);
        }

        return found;
    }
}

const success: ProfileOutcome = {
    ok: true,
    livePPTotal: 100,
    localPPTotal: 110,
};

/**
 * Lets promise callbacks that are already due run.
 */
function flush() {
    return new Promise<void>((resolve) => {
        setImmediate(resolve);
    });
}

describe("RecalculationQueue", () => {
    let time: number;
    let nextId: number;
    let pending: PendingCalculation[];
    let capacities: Map<string, number | null>;
    let getCapacity: ReturnType<typeof vi.fn>;
    let queue: RecalculationQueue;
    let fullRunStore: FakeFullRunStore;
    let calculateImpl:
        | ((uid: number, variant: string) => Promise<ProfileOutcome>)
        | null;

    function createQueue(overrides: Partial<RecalculationQueueDeps> = {}) {
        return new RecalculationQueue({
            now: () => time,
            newId: () => `e${(++nextId).toString()}`,
            limits: readRecalcLimits({}),
            calculate: (uid, variant, actingUid, onProgress) => {
                if (calculateImpl) {
                    return calculateImpl(uid, variant);
                }

                return new Promise<ProfileOutcome>((resolve, reject) => {
                    pending.push({
                        uid,
                        variant,
                        actingUid,
                        onProgress,
                        resolve,
                        reject,
                    });
                });
            },
            getCapacity: getCapacity as RecalculationQueueDeps["getCapacity"],
            fullRunStore,
            ...overrides,
        });
    }

    /**
     * Queues a player for a variant, waiting out the cooldown first.
     */
    function add(
        playerUid: number,
        variant: string,
        options: { capacity?: number; by?: number } = {},
    ) {
        const by = options.by ?? 1;

        time += 10_000;

        return queue.enqueue({
            uid: playerUid,
            username: `player${playerUid.toString()}`,
            variant,
            capacity: options.capacity ?? 1,
            queuedByUid: by,
            queuedByUsername: `user${by.toString()}`,
        });
    }

    const admin = { uid: 9, username: "admin" };

    function startRun(
        variant: string,
        options: { capacity?: number; restart?: boolean } = {},
    ) {
        return queue.startFullRun(
            variant,
            options.capacity ?? 1,
            admin,
            options.restart ?? false,
        );
    }

    /**
     * Finishes a pending calculation as `calculate` does: a success marks the
     * profile scanned.
     */
    async function finishScanned(
        uid: number,
        variant: string,
        outcome: ProfileOutcome = success,
    ) {
        if (outcome.ok) {
            fullRunStore.markScanned(variant, uid);
        }

        await finish(uid, outcome);
    }

    function fullRun(variant: string) {
        const found = view(["A", "B"]).fullRuns.find(
            (r) => r.variant === variant,
        );

        if (!found) {
            throw new Error(`No full run for ${variant}`);
        }

        return found;
    }

    function pendingFor(uid: number) {
        const found = pending.find((p) => p.uid === uid);

        if (!found) {
            throw new Error(`No pending calculation for ${uid.toString()}`);
        }

        return found;
    }

    async function finish(uid: number, outcome: ProfileOutcome = success) {
        pendingFor(uid).resolve(outcome);
        await flush();
    }

    function view(
        visible: string[] = ["A", "B"],
        selected: string | null = null,
        viewerUid: number | undefined = undefined,
    ) {
        return queue.snapshot(new Set(visible), selected, viewerUid);
    }

    function statuses(selected: string | null = null) {
        const snapshot = view(["A", "B"], selected);

        return Object.fromEntries(
            [...snapshot.queue, ...snapshot.recent].map((e) => [
                e.uid,
                e.status,
            ]),
        );
    }

    beforeEach(() => {
        time = 1_000_000;
        nextId = 0;
        pending = [];
        capacities = new Map();
        calculateImpl = null;
        fullRunStore = new FakeFullRunStore();
        getCapacity = vi.fn((variant: string) =>
            Promise.resolve(capacities.get(variant) ?? null),
        );
        queue = createQueue();
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("limits", () => {
        it("refuses a sixth active entry across variants", () => {
            for (const [uid, variant] of [
                [11, "A"],
                [12, "A"],
                [13, "A"],
                [14, "B"],
                [15, "B"],
            ] as const) {
                expect(add(uid, variant).ok).toBe(true);
            }

            expect(add(16, "B")).toEqual({ ok: false, reason: "limit" });
            expect(add(16, "A")).toEqual({ ok: false, reason: "limit" });
        });

        it("counts the limit per queuer", () => {
            for (let uid = 11; uid <= 15; uid++) {
                add(uid, "A");
            }

            expect(add(16, "A", { by: 2 }).ok).toBe(true);
        });

        it("refuses adds within the cooldown and reports the wait", () => {
            expect(
                queue.enqueue({
                    uid: 11,
                    username: "player11",
                    variant: "A",
                    capacity: 1,
                    queuedByUid: 1,
                    queuedByUsername: "user1",
                }).ok,
            ).toBe(true);

            const request = {
                uid: 12,
                username: "player12",
                variant: "A",
                capacity: 1,
                queuedByUid: 1,
                queuedByUsername: "user1",
            };

            expect(queue.enqueue(request)).toEqual({
                ok: false,
                reason: "cooldown",
                retryAfterSeconds: 10,
            });

            time += 6_000;

            expect(queue.enqueue(request)).toEqual({
                ok: false,
                reason: "cooldown",
                retryAfterSeconds: 4,
            });

            time += 4_000;

            expect(queue.enqueue(request).ok).toBe(true);
        });

        it("refuses a duplicate without starting the cooldown", () => {
            const first = add(11, "A");

            expect(first.ok).toBe(true);

            // The first cooldown has passed; the duplicate must not renew it.
            expect(add(11, "A")).toEqual({ ok: false, reason: "duplicate" });
            expect(
                queue.enqueue({
                    uid: 12,
                    username: "player12",
                    variant: "A",
                    capacity: 1,
                    queuedByUid: 1,
                    queuedByUsername: "user1",
                }).ok,
            ).toBe(true);
        });

        it("refuses a duplicate that someone else queued, but not for another variant", () => {
            add(11, "A", { by: 1 });

            expect(add(11, "A", { by: 2 })).toEqual({
                ok: false,
                reason: "duplicate",
            });
            expect(add(11, "B", { by: 2 }).ok).toBe(true);
        });

        it("does not count finished entries against the limit", async () => {
            capacities.set("A", 5);

            for (let uid = 11; uid <= 15; uid++) {
                add(uid, "A", { capacity: 5 });
            }

            expect(add(16, "A", { capacity: 5 }).ok).toBe(false);

            await finish(11);
            await finish(12, { ok: false, reason: "No scores" });

            expect(queue.allowance(1).active).toBe(3);
            expect(add(16, "A", { capacity: 5 }).ok).toBe(true);
            expect(add(17, "A", { capacity: 5 }).ok).toBe(true);
            expect(add(18, "A", { capacity: 5 })).toEqual({
                ok: false,
                reason: "limit",
            });
        });

        it("gives visitors no allowance", () => {
            expect(view(["A"], "A", undefined).allowance).toBeNull();
        });

        it("reports the viewer's allowance", () => {
            add(11, "A");
            add(12, "A");

            expect(view(["A"], "A", 1).allowance).toEqual({
                active: 2,
                maxActive: 5,
                cooldownRemainingSeconds: 10,
            });

            time += 4_000;

            expect(queue.allowance(1).cooldownRemainingSeconds).toBe(6);
            expect(queue.allowance(2)).toEqual({
                active: 0,
                maxActive: 5,
                cooldownRemainingSeconds: 0,
            });
        });
    });

    describe("scheduling", () => {
        it("runs as many players at once as the variant has calculators", () => {
            add(11, "A", { capacity: 2 });
            add(12, "A", { capacity: 2 });
            add(13, "A", { capacity: 2 });

            expect(statuses()).toEqual({
                11: "calculating",
                12: "calculating",
                13: "waiting",
            });
            expect(pending.map((p) => p.uid)).toEqual([11, 12]);
            expect(pending[0]?.actingUid).toBe(1);
        });

        it("starts the oldest waiting entry when a calculator frees up", async () => {
            add(11, "A");
            add(12, "A");
            add(13, "A");

            await finish(11);

            expect(statuses()).toEqual({
                11: "done",
                12: "calculating",
                13: "waiting",
            });
        });

        it("schedules each variant on its own calculators", () => {
            add(11, "A", { capacity: 1 });
            add(12, "B", { capacity: 1 });
            add(13, "A", { capacity: 1 });

            expect(statuses()).toEqual({
                11: "calculating",
                12: "calculating",
                13: "waiting",
            });
        });

        it("waits for a calculator when the variant has none", async () => {
            add(11, "A", { capacity: 0 });

            expect(statuses()).toEqual({ 11: "waiting" });

            capacities.set("A", 1);
            await queue.refreshCapacities();

            expect(statuses()).toEqual({ 11: "calculating" });
        });

        it("starts nothing new while over a reduced capacity", async () => {
            add(11, "A", { capacity: 2 });
            add(12, "A", { capacity: 2 });
            add(13, "A", { capacity: 2 });

            capacities.set("A", 1);
            await queue.refreshCapacities();
            await finish(11);

            expect(statuses()).toEqual({
                11: "done",
                12: "calculating",
                13: "waiting",
            });

            await finish(12);

            expect(statuses()).toEqual({
                11: "done",
                12: "done",
                13: "calculating",
            });
        });

        it("uses a raised capacity at once", async () => {
            add(11, "A", { capacity: 1 });
            add(12, "A", { capacity: 1 });

            capacities.set("A", 2);
            await queue.refreshCapacities();

            expect(statuses()).toEqual({
                11: "calculating",
                12: "calculating",
            });
        });
    });

    describe("capacities", () => {
        it("refreshes variants with work for their most recent queuer", async () => {
            add(11, "A", { by: 1 });
            add(12, "A", { by: 2 });
            add(13, "B", { by: 3 });
            await finish(13);

            capacities.set("A", 3);
            await queue.refreshCapacities();

            expect(getCapacity).toHaveBeenCalledTimes(1);
            expect(getCapacity).toHaveBeenCalledWith("A", 2);
        });

        it("keeps the last known count on null", async () => {
            add(11, "A", { capacity: 2 });
            add(12, "A", { capacity: 2 });
            add(13, "A", { capacity: 2 });

            capacities.set("A", null);
            await queue.refreshCapacities();

            expect(view(["A"], "A").calculators).toBe(2);
            expect(statuses()).toEqual({
                11: "calculating",
                12: "calculating",
                13: "waiting",
            });
        });

        it("keeps the last known count when the lookup throws", async () => {
            add(11, "A", { capacity: 2 });
            getCapacity.mockRejectedValueOnce(new Error("broker down"));

            await queue.refreshCapacities();

            expect(view(["A"], "A").calculators).toBe(2);
        });
    });

    describe("outcomes", () => {
        it("records done totals and failure reasons", async () => {
            add(11, "A", { capacity: 2 });
            add(12, "A", { capacity: 2 });

            pendingFor(11).onProgress(3, 7);

            expect(view().queue.find((e) => e.uid === 11)?.progress).toEqual({
                done: 3,
                total: 7,
            });

            time += 2_000;
            await finish(11, {
                ok: true,
                livePPTotal: 1234.5,
                localPPTotal: 1300.25,
            });
            await finish(12, {
                ok: false,
                reason: "Beatmap service timed out",
            });

            const { recent, queue: active } = view();

            expect(active).toEqual([]);
            expect(recent).toHaveLength(2);

            const done = recent.find((e) => e.uid === 11);
            const failed = recent.find((e) => e.uid === 12);

            expect(done).toMatchObject({
                status: "done",
                livePPTotal: 1234.5,
                localPPTotal: 1300.25,
                finishedAt: time,
                position: null,
            });
            expect(done?.failureReason).toBeUndefined();
            expect(failed).toMatchObject({
                status: "failed",
                failureReason: "Beatmap service timed out",
                finishedAt: time,
            });
            expect(failed?.livePPTotal).toBeUndefined();
        });

        it("ignores progress after an entry has finished", async () => {
            add(11, "A");
            const { onProgress } = pendingFor(11);

            await finish(11);
            onProgress(1, 2);

            expect(view().recent[0]?.progress).toBeNull();
        });

        it("fails an entry whose calculation rejects and frees its calculator", async () => {
            add(11, "A");
            add(12, "A");

            pendingFor(11).reject(new Error("boom"));
            await flush();

            expect(view().recent[0]).toMatchObject({
                uid: 11,
                status: "failed",
                failureReason: "Unexpected error",
            });
            expect(statuses()).toMatchObject({ 12: "calculating" });
        });

        it("fails an entry whose calculation throws and frees its calculator", async () => {
            calculateImpl = (uid) => {
                if (uid === 11) {
                    throw new Error("sync boom");
                }

                return Promise.resolve(success);
            };

            add(11, "A");
            add(12, "A");
            await flush();

            expect(statuses()).toEqual({ 11: "failed", 12: "done" });
            expect(view().recent.find((e) => e.uid === 11)).toMatchObject({
                failureReason: "Unexpected error",
            });
        });
    });

    describe("retention", () => {
        it("drops finished entries after the retention time", async () => {
            add(11, "A");
            await finish(11);

            time += 59 * minute;
            expect(view().recent.map((e) => e.uid)).toEqual([11]);

            time += 2 * minute;
            expect(view().recent).toEqual([]);
        });

        it("honours a configured retention time", async () => {
            queue = createQueue({
                limits: {
                    ...readRecalcLimits({}),
                    finishedRetentionMinutes: 5,
                },
            });
            add(11, "A");
            await finish(11);

            time += 4 * minute;
            expect(view().recent).toHaveLength(1);

            time += 2 * minute;
            expect(view().recent).toHaveLength(0);
        });
    });

    describe("remove", () => {
        it("lets only the queuer or an admin remove a waiting entry", () => {
            add(11, "A");
            const second = add(12, "A", { by: 2 });
            const third = add(13, "A", { by: 2 });

            if (!second.ok || !third.ok) {
                throw new Error("Expected the entries to be queued");
            }

            expect(queue.remove(second.entry.id, 3, false)).toBe("forbidden");
            expect(queue.remove(second.entry.id, 2, false)).toBe("removed");
            expect(queue.remove(second.entry.id, 2, false)).toBe("notFound");
            expect(queue.remove("missing", 2, true)).toBe("notFound");
            expect(queue.remove(third.entry.id, 99, true)).toBe("removed");
            expect(view().queue.map((e) => e.uid)).toEqual([11]);
        });

        it("refuses to remove a calculating entry", () => {
            const first = add(11, "A");

            if (!first.ok) {
                throw new Error("Expected the entry to be queued");
            }

            expect(queue.remove(first.entry.id, 1, false)).toBe("notWaiting");
            expect(queue.remove(first.entry.id, 99, true)).toBe("notWaiting");
        });

        it("refuses to remove a finished entry", async () => {
            const first = add(11, "A");

            if (!first.ok) {
                throw new Error("Expected the entry to be queued");
            }

            await finish(11);

            expect(queue.remove(first.entry.id, 1, true)).toBe("notWaiting");
        });

        it("frees the person's allowance and the player's slot", () => {
            const first = add(11, "A", { capacity: 0 });

            if (!first.ok) {
                throw new Error("Expected the entry to be queued");
            }

            queue.remove(first.entry.id, 1, false);

            expect(queue.allowance(1).active).toBe(0);
            expect(add(11, "A", { capacity: 0 }).ok).toBe(true);
        });
    });

    describe("snapshot", () => {
        it("lists calculating entries first, then waiting ones in order, with positions", () => {
            add(11, "A", { capacity: 1 });
            add(12, "A", { capacity: 1 });
            add(13, "B", { capacity: 1 });
            add(14, "A", { capacity: 1 });

            const { queue: entries } = view();

            expect(entries.map((e) => [e.uid, e.status, e.position])).toEqual([
                [11, "calculating", null],
                [13, "calculating", null],
                [12, "waiting", 1],
                [14, "waiting", 2],
            ]);
            expect(entries[0]).toMatchObject({
                id: "e1",
                username: "player11",
                variant: "A",
                queuedByUid: 1,
                queuedByUsername: "user1",
            });
            expect(view().fullRuns).toEqual([]);
        });

        it("lists recent entries newest first", async () => {
            add(11, "A", { capacity: 3 });
            add(12, "A", { capacity: 3 });
            add(13, "A", { capacity: 3 });

            await finish(12);
            time += 1_000;
            await finish(13);
            time += 1_000;
            await finish(11);

            expect(view().recent.map((e) => e.uid)).toEqual([11, 13, 12]);
        });

        it("filters to the selected variant", async () => {
            add(11, "A");
            add(12, "B");
            await finish(12);

            const selected = view(["A", "B"], "A");

            expect(selected.variant).toBe("A");
            expect(selected.queue.map((e) => e.uid)).toEqual([11]);
            expect(selected.recent).toEqual([]);
            expect(view(["A", "B"], null).variant).toBeNull();
        });

        it("leaves out variants the viewer cannot see", async () => {
            add(11, "A", { capacity: 2 });
            add(12, "B", { capacity: 3 });
            add(13, "B", { capacity: 3 });
            await finish(13);

            const selected = view(["A"], "A", 1);

            expect(selected.queue.map((e) => e.uid)).toEqual([11]);
            expect(selected.recent).toEqual([]);
            expect(selected.calculators).toBe(2);

            const global = view(["A"], null, 1);

            expect(global.queue.map((e) => e.uid)).toEqual([11]);
            expect(global.recent).toEqual([]);
            expect(global.calculators).toBe(2);
            // The allowance still counts the hidden variant's entry.
            expect(global.allowance?.active).toBe(2);

            const hidden = view(["A"], "B", 1);

            expect(hidden).toMatchObject({
                variant: "B",
                calculators: 0,
                estimatedWaitSeconds: null,
                queue: [],
                recent: [],
            });
        });

        it("sums calculators over visible variants in the global view", () => {
            add(11, "A", { capacity: 2 });
            add(12, "B", { capacity: 3 });

            expect(view(["A", "B"]).calculators).toBe(5);
            expect(view(["A", "B"], "B").calculators).toBe(3);
            expect(view(["A", "B"]).estimatedWaitSeconds).toBeNull();
        });
    });

    describe("estimated wait", () => {
        it("uses 5 seconds per player before any completion", () => {
            add(11, "A", { capacity: 2 });
            add(12, "A", { capacity: 2 });
            add(13, "A", { capacity: 2 });
            add(14, "A", { capacity: 2 });
            add(15, "A", { capacity: 2 });

            // Three waiting over two calculators is two rounds.
            expect(view(["A"], "A").estimatedWaitSeconds).toBe(10);
        });

        it("estimates the wait from recent completions", async () => {
            add(11, "A", { capacity: 1 });
            time += 20_000;
            await finish(11);

            add(12, "A", { capacity: 1 });
            time += 10_000;
            await finish(12);

            // Average of 20 s and 10 s.
            add(13, "A", { capacity: 1 });
            add(14, "A", { capacity: 1 });
            add(15, "A", { capacity: 1 });

            expect(view(["A"], "A").estimatedWaitSeconds).toBe(30);
            expect(view(["A", "B"], "B").estimatedWaitSeconds).toBeNull();
        });

        it("averages only a variant's own last 20 completions", async () => {
            queue = createQueue({
                limits: { ...readRecalcLimits({}), maxActivePerPerson: 100 },
            });

            for (const [uid, seconds] of [[11, 200]] as const) {
                add(uid, "A");
                time += seconds * 1_000;
                await finish(uid);
            }

            for (let uid = 12; uid < 32; uid++) {
                add(uid, "A");
                time += 10_000;
                await finish(uid);
            }

            add(40, "B");
            time += 400_000;
            await finish(40);

            add(50, "A");
            add(51, "A");

            expect(view(["A"], "A").estimatedWaitSeconds).toBe(10);
        });

        it("is zero with nothing waiting and null without calculators", async () => {
            add(11, "A", { capacity: 1 });

            expect(view(["A"], "A").estimatedWaitSeconds).toBe(0);

            add(12, "A", { capacity: 1 });
            capacities.set("A", 0);
            await queue.refreshCapacities();

            expect(view(["A"], "A").estimatedWaitSeconds).toBeNull();
        });
    });

    describe("full runs", () => {
        /**
         * Makes every calculation succeed except for the given uids, recording
         * the order of calls.
         */
        function calculateAll(failing: number[] = []) {
            const calls: number[] = [];

            calculateImpl = (uid, variant) => {
                calls.push(uid);

                if (failing.includes(uid)) {
                    return Promise.resolve({
                        ok: false,
                        reason: "Score service timed out",
                    });
                }

                fullRunStore.markScanned(variant, uid);

                return Promise.resolve(success);
            };

            return calls;
        }

        it("starts with the highest local pp first, acting for the admin", async () => {
            fullRunStore.seed("A", [21, 22, 23]);

            expect(await startRun("A")).toBe("started");

            expect(pending.map((p) => [p.uid, p.variant, p.actingUid])).toEqual(
                [[21, "A", 9]],
            );
            expect(fullRun("A")).toEqual({
                variant: "A",
                status: "running",
                startedByUid: 9,
                startedByUsername: "admin",
                startedAt: time,
                done: 0,
                total: 3,
                failed: 0,
            });

            await finishScanned(21, "A");

            expect(pending.map((p) => p.uid)).toEqual([21, 22]);
            expect(fullRun("A")).toMatchObject({ done: 1, total: 3 });
        });

        it("counts the profiles already scanned as done at the start", async () => {
            fullRunStore.seed("A", [21, 22]);
            fullRunStore.seed("A", [23, 24], true);

            await startRun("A");

            expect(fullRun("A")).toMatchObject({ done: 2, total: 4 });
        });

        it("runs up to the calculator count at once and finishes when all are scanned", async () => {
            fullRunStore.seed("A", [21, 22, 23]);

            await startRun("A", { capacity: 2 });

            expect(pending.map((p) => p.uid)).toEqual([21, 22]);

            await finishScanned(22, "A");
            await finishScanned(21, "A");

            expect(pending.map((p) => p.uid)).toEqual([21, 22, 23]);
            expect(fullRun("A").status).toBe("running");

            await finishScanned(23, "A");

            expect(fullRun("A")).toMatchObject({
                status: "finished",
                done: 3,
                total: 3,
                failed: 0,
            });
        });

        it("lets a waiting entry take the next calculator before the full run", async () => {
            fullRunStore.seed("A", [21, 22, 23]);
            await startRun("A");
            add(11, "A");

            expect(statuses()).toEqual({ 11: "waiting" });

            await finishScanned(21, "A");

            expect(statuses()).toEqual({ 11: "calculating" });
            expect(pending.map((p) => p.uid)).toEqual([21, 11]);
            expect(pending[1]?.actingUid).toBe(1);

            await finish(11);

            expect(pending.map((p) => p.uid)).toEqual([21, 11, 22]);
        });

        it("counts full-run players toward the variant's calculators", async () => {
            fullRunStore.seed("A", [21, 22, 23]);
            await startRun("A", { capacity: 2 });
            add(11, "A", { capacity: 2 });
            add(12, "A", { capacity: 2 });

            expect(statuses()).toEqual({ 11: "waiting", 12: "waiting" });

            await finishScanned(21, "A");
            await finishScanned(22, "A");

            expect(statuses()).toEqual({
                11: "calculating",
                12: "calculating",
            });
            expect(pending.map((p) => p.uid)).toEqual([21, 22, 11, 12]);
        });

        it("retries a failed full-run player later, up to three attempts", async () => {
            fullRunStore.seed("A", [21, 22, 23, 24]);
            const calls = calculateAll([22]);

            await startRun("A");
            await flush();

            expect(calls).toEqual([21, 22, 23, 24, 22, 22]);
            expect(fullRun("A")).toMatchObject({
                status: "finished",
                done: 3,
                total: 4,
                failed: 1,
            });
        });

        it("stops counting a player as failed once a retry succeeds", async () => {
            fullRunStore.seed("A", [21, 22]);

            let attempts = 0;

            calculateImpl = (uid, variant) => {
                if (uid === 21 && ++attempts === 1) {
                    return Promise.resolve({ ok: false, reason: "Timed out" });
                }

                fullRunStore.markScanned(variant, uid);

                return Promise.resolve(success);
            };

            await startRun("A");
            await flush();

            expect(attempts).toBe(2);
            expect(fullRun("A")).toMatchObject({
                status: "finished",
                done: 2,
                failed: 0,
            });
        });

        it("never marks a failed player scanned", async () => {
            fullRunStore.seed("A", [21, 22]);
            calculateAll([22]);

            await startRun("A");
            await flush();

            expect(fullRunStore.scannedUids("A")).toEqual([21]);
        });

        it("fails a full-run player whose calculation throws", async () => {
            fullRunStore.seed("A", [21]);
            calculateImpl = () => {
                throw new Error("boom");
            };

            await startRun("A");
            await flush();

            expect(fullRun("A")).toMatchObject({
                status: "finished",
                done: 0,
                failed: 1,
            });
        });

        it("does not start a player already calculating for the variant", async () => {
            fullRunStore.seed("A", [21, 22]);
            add(21, "A", { capacity: 2 });

            await startRun("A", { capacity: 2 });

            expect(pending.map((p) => p.uid)).toEqual([21, 22]);
            expect(pending.filter((p) => p.uid === 21)).toHaveLength(1);

            await finishScanned(22, "A");

            // The run is not finished while a calculation is in flight.
            expect(fullRun("A").status).toBe("running");
            expect(pending.filter((p) => p.uid === 21)).toHaveLength(1);

            // The single entry failed, so the player is still unscanned.
            await finish(21, { ok: false, reason: "Timed out" });

            expect(pending.filter((p) => p.uid === 21)).toHaveLength(2);
        });

        it("never exceeds capacity when a single entry and a full-run player share a uid", async () => {
            fullRunStore.seed("A", [21, 22, 23]);
            await startRun("A", { capacity: 2 });
            add(21, "A", { capacity: 2 });

            expect(pending.map((p) => p.uid)).toEqual([21, 22]);
            expect(statuses()).toEqual({ 21: "waiting" });

            await finishScanned(21, "A");

            // The single entry took the freed calculator, not the run.
            expect(statuses()).toEqual({ 21: "calculating" });
            expect(pending.map((p) => p.uid)).toEqual([21, 22, 21]);
        });

        it("holds a single entry while the full run calculates the same player", async () => {
            fullRunStore.seed("A", [21]);
            await startRun("A", { capacity: 2 });
            add(21, "A", { capacity: 2 });
            add(12, "A", { capacity: 2 });

            // The next waiting entry is not blocked by the held one.
            expect(statuses()).toEqual({ 21: "waiting", 12: "calculating" });

            await finishScanned(21, "A");

            expect(statuses()).toEqual({
                21: "calculating",
                12: "calculating",
            });
        });

        it("does not start a player that another run's in-flight calculation covers", async () => {
            fullRunStore.seed("A", [21, 22]);
            await startRun("A", { capacity: 1 });
            queue.stopFullRun("A");

            await startRun("A", { capacity: 2 });

            expect(pending.filter((p) => p.uid === 21)).toHaveLength(1);
            expect(pending.map((p) => p.uid)).toEqual([21, 22]);
        });

        it("pauses a full run while the variant has no calculators and resumes when it has", async () => {
            fullRunStore.seed("A", [21, 22, 23]);

            await startRun("A", { capacity: 0 });

            expect(fullRun("A").status).toBe("paused");
            expect(pending).toEqual([]);

            capacities.set("A", 1);
            await queue.refreshCapacities();

            expect(getCapacity).toHaveBeenCalledWith("A", 9);
            expect(fullRun("A").status).toBe("running");
            expect(pending.map((p) => p.uid)).toEqual([21]);

            capacities.set("A", 0);
            await queue.refreshCapacities();

            expect(fullRun("A").status).toBe("paused");

            await finishScanned(21, "A");

            expect(pending.map((p) => p.uid)).toEqual([21]);

            capacities.set("A", 1);
            await queue.refreshCapacities();

            expect(fullRun("A").status).toBe("running");
            expect(pending.map((p) => p.uid)).toEqual([21, 22]);
        });

        it("refreshes a variant with a full run for the most recent starter or queuer", async () => {
            fullRunStore.seed("B", [31]);
            fullRunStore.seed("C", [41]);

            add(11, "A", { by: 1 });
            await startRun("B");
            add(12, "A", { by: 2 });
            await startRun("C");
            add(13, "C", { by: 3, capacity: 1 });
            queue.stopFullRun("C");
            await queue.refreshCapacities();

            // C's run is stopped, so its queuer is the only one acting.
            expect(getCapacity).toHaveBeenCalledTimes(3);
            expect(getCapacity).toHaveBeenCalledWith("A", 2);
            expect(getCapacity).toHaveBeenCalledWith("B", 9);
            expect(getCapacity).toHaveBeenCalledWith("C", 3);
        });

        it("refuses to start a run that is running or paused", async () => {
            fullRunStore.seed("A", [21]);

            expect(await startRun("A")).toBe("started");
            expect(await startRun("A", { restart: true })).toBe(
                "alreadyRunning",
            );
            expect(fullRunStore.resetCalls).toEqual([]);

            queue.stopFullRun("A");
            capacities.set("A", 0);

            expect(await startRun("A", { capacity: 0 })).toBe("started");
            expect(fullRun("A").status).toBe("paused");
            expect(await startRun("A")).toBe("alreadyRunning");
        });

        it("refuses a second start while the first is still preparing", async () => {
            fullRunStore.seed("A", [21]);

            const results = await Promise.all([startRun("A"), startRun("A")]);

            expect(results).toEqual(["started", "alreadyRunning"]);
        });

        it("starts over by resetting scanned flags first", async () => {
            fullRunStore.seed("A", [21, 22], true);

            await startRun("A", { restart: true });

            expect(fullRunStore.resetCalls).toEqual(["A"]);
            expect(fullRun("A")).toMatchObject({ done: 0, total: 2 });
            expect(pending.map((p) => p.uid)).toEqual([21]);
        });

        it("keeps scanned flags without a restart", async () => {
            fullRunStore.seed("A", [21, 22], true);

            await startRun("A");

            expect(fullRunStore.resetCalls).toEqual([]);
            expect(fullRun("A")).toMatchObject({
                status: "finished",
                done: 2,
                total: 2,
            });
        });

        it("clones droid-rebalance profiles into an empty variant", async () => {
            fullRunStore.seed("droid-rebalance", [21, 22]);

            await startRun("A");

            expect(fullRunStore.cloneCalls).toEqual([["droid-rebalance", "A"]]);
            expect(fullRun("A")).toMatchObject({ done: 0, total: 2 });
            expect(pending.map((p) => p.uid)).toEqual([21]);
        });

        it("does not clone into a variant that has profiles", async () => {
            fullRunStore.seed("droid-rebalance", [21, 22]);
            fullRunStore.seed("A", [23]);

            await startRun("A");

            expect(fullRunStore.cloneCalls).toEqual([]);
            expect(fullRun("A").total).toBe(1);
        });

        it("stop lets in-flight players finish and starts nothing new", async () => {
            fullRunStore.seed("A", [21, 22, 23, 24]);
            await startRun("A", { capacity: 2 });

            expect(queue.stopFullRun("A")).toBe("stopped");
            expect(fullRun("A").status).toBe("stopped");

            await finishScanned(21, "A");
            await finishScanned(22, "A");

            expect(pending.map((p) => p.uid)).toEqual([21, 22]);
            expect(fullRun("A")).toMatchObject({ status: "stopped", done: 2 });
            expect(queue.stopFullRun("A")).toBe("notRunning");
            expect(queue.stopFullRun("B")).toBe("notRunning");
        });

        it("can start again after finishing", async () => {
            fullRunStore.seed("A", [21]);
            calculateAll();

            await startRun("A");
            await flush();

            expect(fullRun("A").status).toBe("finished");
            expect(queue.stopFullRun("A")).toBe("notRunning");

            time += 5_000;

            expect(await startRun("A", { restart: true })).toBe("started");
            await flush();

            expect(fullRun("A")).toMatchObject({
                status: "finished",
                startedAt: time,
                done: 1,
            });
        });

        it("shows full runs only for visible variants", async () => {
            fullRunStore.seed("A", [21]);
            fullRunStore.seed("B", [31]);
            await startRun("A");
            await startRun("B");

            expect(view(["A", "B"]).fullRuns.map((r) => r.variant)).toEqual([
                "A",
                "B",
            ]);
            expect(view(["B"]).fullRuns.map((r) => r.variant)).toEqual(["B"]);
            expect(view([], "A").fullRuns).toEqual([]);
        });
    });
});
