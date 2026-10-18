import {
    FullRunStatus,
    FullRunView,
    RecalcAllowance,
    RecalcEntryStatus,
    RecalcEntryView,
    RecalcQueueView,
} from "app-structures";
import { RecalcLimits } from "./limits";
import { ProfileOutcome } from "./ProfileCalculator";

/**
 * The persistence that full runs use, over the prototype pp collection.
 */
export interface FullRunStore {
    /**
     * Counts the profiles of a rework type.
     */
    countProfiles(reworkType: string): Promise<number>;

    /**
     * Counts the profiles of a rework type that a full run has scanned.
     */
    countScanned(reworkType: string): Promise<number>;

    /**
     * Gets the uids of profiles of a rework type that a full run has not
     * scanned, by local pp total descending.
     *
     * @param reworkType The rework type.
     * @param excludeUids The uids to leave out.
     * @param limit The maximum number of uids.
     */
    getUnscannedUids(
        reworkType: string,
        excludeUids: number[],
        limit: number,
    ): Promise<number[]>;

    /**
     * Marks every profile of a rework type as not scanned.
     */
    resetScanDone(reworkType: string): Promise<void>;

    /**
     * Copies the profiles of a rework type into another.
     */
    cloneProfiles(source: string, target: string): Promise<void>;
}

/**
 * The services that the recalculation queue uses.
 */
export interface RecalculationQueueDeps {
    /**
     * Gets the current time in milliseconds since the epoch.
     */
    now(): number;

    /**
     * Creates the ID of a new entry.
     */
    newId(): string;

    /**
     * The limits of the queue.
     */
    limits: RecalcLimits;

    /**
     * Recalculates a player's profile for a variant.
     *
     * @param uid The uid of the player.
     * @param variant The name of the variant.
     * @param actingUid The uid of the person that the calculation acts for.
     * @param onProgress Called with the scores processed out of the total.
     */
    calculate(
        uid: number,
        variant: string,
        actingUid: number,
        onProgress: (done: number, total: number) => void,
    ): Promise<ProfileOutcome>;

    /**
     * Gets the number of healthy instances of a variant, or `null` if it
     * cannot be told.
     *
     * @param variant The name of the variant.
     * @param actingUid The uid of the person the lookup acts for.
     */
    getCapacity(variant: string, actingUid: number): Promise<number | null>;

    /**
     * The store that full runs use.
     */
    fullRunStore: FullRunStore;
}

/**
 * A request to queue a player's recalculation.
 */
export interface EnqueueRequest {
    /**
     * The uid of the player to recalculate.
     */
    uid: number;

    /**
     * The username of the player to recalculate.
     */
    username: string;

    /**
     * The name of the variant to recalculate for.
     */
    variant: string;

    /**
     * The number of calculators the variant has right now, which seeds the
     * variant's count.
     */
    capacity: number;

    /**
     * The uid of the person who queues the player.
     */
    queuedByUid: number;

    /**
     * The username of the person who queues the player.
     */
    queuedByUsername: string;
}

export type EnqueueResult =
    | { ok: true; entry: RecalcEntryView }
    | {
          ok: false;
          reason: "limit" | "cooldown" | "duplicate";
          retryAfterSeconds?: number;
      };

export type RemoveResult = "removed" | "notFound" | "forbidden" | "notWaiting";

interface QueueEntry {
    id: string;
    uid: number;
    username: string;
    variant: string;
    queuedByUid: number;
    queuedByUsername: string;
    queuedAt: number;
    status: RecalcEntryStatus;
    progress: { done: number; total: number } | null;
    livePPTotal?: number;
    localPPTotal?: number;
    failureReason?: string;
    startedAt?: number;
    finishedAt?: number;

    /**
     * Orders entries by the time they were queued.
     */
    queueSeq: number;

    /**
     * Orders entries by the time they started or finished.
     */
    eventSeq?: number;
}

interface FullRun {
    variant: string;
    status: FullRunStatus;
    startedByUid: number;
    startedByUsername: string;
    startedAt: number;
    done: number;
    total: number;

    /**
     * Orders the run among entries by the time it started.
     */
    startSeq: number;

    /**
     * How many times each uid has been attempted in this run.
     */
    attempts: Map<number, number>;

    /**
     * The uids that failed and will be attempted again, oldest first.
     */
    retries: number[];

    /**
     * The uids whose latest attempt failed.
     */
    failedUids: Set<number>;

    /**
     * Whether a claim of players is in progress.
     */
    claiming: boolean;

    /**
     * Whether the claim in progress has to run again.
     */
    claimAgain: boolean;
}

/**
 * The attempts a full run makes at a player in total.
 */
const maxFullRunAttempts = 3;

/**
 * The variant that an empty variant's profiles are cloned from.
 */
const cloneSourceVariant = "droid-rebalance";

/**
 * The seconds a player takes when a variant has no completions yet.
 */
const defaultSecondsPerPlayer = 5;

/**
 * The number of completions per variant that the estimated wait averages.
 */
const averagedCompletions = 20;

/**
 * An in-memory queue of single-player recalculations and full runs.
 *
 * Each variant calculates at most as many players at once as it has
 * calculators (healthy instances), single entries and its full run together.
 * Single entries take a free calculator before the full run does.
 */
export class RecalculationQueue {
    private readonly entries = new Map<string, QueueEntry>();
    private readonly capacities = new Map<string, number>();
    private readonly lastAddAt = new Map<number, number>();
    private readonly completionSeconds = new Map<string, number[]>();
    private readonly fullRuns = new Map<string, FullRun>();
    private readonly startingFullRuns = new Set<string>();

    /**
     * The uids that full runs calculate right now, by variant. A stopped run's
     * players stay here until they finish.
     */
    private readonly fullRunCalculating = new Map<string, Set<number>>();
    private seq = 0;

    constructor(private readonly deps: RecalculationQueueDeps) {}

    /**
     * Queues a player's recalculation.
     *
     * @param request The request.
     * @returns The queued entry, or why it was refused.
     */
    enqueue(request: EnqueueRequest): EnqueueResult {
        this.pruneFinished();

        const now = this.deps.now();
        const { limits } = this.deps;

        let activeOfQueuer = 0;

        for (const entry of this.entries.values()) {
            if (!isActive(entry)) {
                continue;
            }

            if (
                entry.uid === request.uid &&
                entry.variant === request.variant
            ) {
                return { ok: false, reason: "duplicate" };
            }

            if (entry.queuedByUid === request.queuedByUid) {
                ++activeOfQueuer;
            }
        }

        if (activeOfQueuer >= limits.maxActivePerPerson) {
            return { ok: false, reason: "limit" };
        }

        const cooldownRemaining = this.cooldownRemainingSeconds(
            request.queuedByUid,
        );

        if (cooldownRemaining > 0) {
            return {
                ok: false,
                reason: "cooldown",
                retryAfterSeconds: cooldownRemaining,
            };
        }

        const entry: QueueEntry = {
            id: this.deps.newId(),
            uid: request.uid,
            username: request.username,
            variant: request.variant,
            queuedByUid: request.queuedByUid,
            queuedByUsername: request.queuedByUsername,
            queuedAt: now,
            status: "waiting",
            progress: null,
            queueSeq: ++this.seq,
        };

        this.entries.set(entry.id, entry);
        this.lastAddAt.set(request.queuedByUid, now);
        this.capacities.set(request.variant, request.capacity);
        this.schedule();

        return {
            ok: true,
            entry: this.toView(entry, this.waitingPosition(entry)),
        };
    }

    /**
     * Removes a waiting entry.
     *
     * @param id The ID of the entry.
     * @param byUid The uid of the person removing the entry.
     * @param isAdmin Whether that person is an admin.
     */
    remove(id: string, byUid: number, isAdmin: boolean): RemoveResult {
        this.pruneFinished();

        const entry = this.entries.get(id);

        if (!entry) {
            return "notFound";
        }

        if (!isAdmin && entry.queuedByUid !== byUid) {
            return "forbidden";
        }

        if (entry.status !== "waiting") {
            return "notWaiting";
        }

        this.entries.delete(id);

        return "removed";
    }

    /**
     * Gets the variant an entry is queued for.
     *
     * @param id The ID of the entry.
     * @returns The name of the variant, or `undefined` if there is no such entry.
     */
    getEntryVariant(id: string): string | undefined {
        this.pruneFinished();

        return this.entries.get(id)?.variant;
    }

    /**
     * Starts a full run of a variant, which recalculates every profile of the
     * variant that is not scanned yet.
     *
     * @param variant The name of the variant.
     * @param capacity The number of calculators the variant has right now,
     * which seeds the variant's count.
     * @param by The admin starting the run.
     * @param restart Whether to scan every profile again.
     */
    async startFullRun(
        variant: string,
        capacity: number,
        by: { uid: number; username: string },
        restart: boolean,
    ): Promise<"started" | "alreadyRunning"> {
        if (
            this.startingFullRuns.has(variant) ||
            this.isFullRunActive(variant)
        ) {
            return "alreadyRunning";
        }

        this.startingFullRuns.add(variant);

        try {
            const store = this.deps.fullRunStore;

            if ((await store.countProfiles(variant)) === 0) {
                await store.cloneProfiles(cloneSourceVariant, variant);
            }

            if (restart) {
                await store.resetScanDone(variant);
            }

            const [total, done] = await Promise.all([
                store.countProfiles(variant),
                store.countScanned(variant),
            ]);

            // Drop a stopped or finished run so the new one is listed last.
            this.fullRuns.delete(variant);
            this.fullRuns.set(variant, {
                variant,
                status: "running",
                startedByUid: by.uid,
                startedByUsername: by.username,
                startedAt: this.deps.now(),
                done,
                total,
                startSeq: ++this.seq,
                attempts: new Map(),
                retries: [],
                failedUids: new Set(),
                claiming: false,
                claimAgain: false,
            });
            this.capacities.set(variant, capacity);
            this.schedule();

            return "started";
        } finally {
            this.startingFullRuns.delete(variant);
        }
    }

    /**
     * Stops a variant's full run. Players that are calculating finish, and no
     * new player starts.
     *
     * @param variant The name of the variant.
     */
    stopFullRun(variant: string): "stopped" | "notRunning" {
        const run = this.fullRuns.get(variant);

        if (!run || !isFullRunActive(run)) {
            return "notRunning";
        }

        run.status = "stopped";

        return "stopped";
    }

    /**
     * Gets how many more entries a person may queue.
     *
     * @param uid The uid of the person.
     */
    allowance(uid: number): RecalcAllowance {
        let active = 0;

        for (const entry of this.entries.values()) {
            if (isActive(entry) && entry.queuedByUid === uid) {
                ++active;
            }
        }

        return {
            active,
            maxActive: this.deps.limits.maxActivePerPerson,
            cooldownRemainingSeconds: this.cooldownRemainingSeconds(uid),
        };
    }

    /**
     * Gets the queue as a viewer sees it.
     *
     * @param visibleVariants The variants the viewer can see.
     * @param selected The selected variant, or `null` for the global view.
     * @param viewerUid The uid of the viewer, if logged in.
     */
    snapshot(
        visibleVariants: ReadonlySet<string>,
        selected: string | null,
        viewerUid: number | undefined,
    ): Omit<RecalcQueueView, "canManageFullRuns" | "variants"> {
        this.pruneFinished();

        const isShown = (variant: string) =>
            visibleVariants.has(variant) &&
            (selected === null || variant === selected);

        const shown = [...this.entries.values()].filter((e) =>
            isShown(e.variant),
        );

        const waitingByVariant = new Map<string, QueueEntry[]>();

        for (const entry of shown) {
            if (entry.status === "waiting") {
                const waiting = waitingByVariant.get(entry.variant) ?? [];

                waiting.push(entry);
                waitingByVariant.set(entry.variant, waiting);
            }
        }

        const calculating = shown
            .filter((e) => e.status === "calculating")
            .sort((a, b) => (a.eventSeq ?? 0) - (b.eventSeq ?? 0));
        const waiting = shown
            .filter((e) => e.status === "waiting")
            .sort((a, b) => a.queueSeq - b.queueSeq);
        const finished = shown
            .filter((e) => e.status === "done" || e.status === "failed")
            .sort((a, b) => (b.eventSeq ?? 0) - (a.eventSeq ?? 0));

        let calculators = 0;

        if (selected === null) {
            for (const variant of visibleVariants) {
                calculators += this.capacityOf(variant);
            }
        } else if (visibleVariants.has(selected)) {
            calculators = this.capacityOf(selected);
        }

        return {
            variant: selected,
            calculators,
            estimatedWaitSeconds:
                selected !== null && visibleVariants.has(selected)
                    ? this.estimateWaitSeconds(selected, waiting.length)
                    : null,
            queue: [
                ...calculating.map((e) => this.toView(e, null)),
                ...waiting.map((e) =>
                    this.toView(
                        e,
                        (waitingByVariant.get(e.variant) ?? []).indexOf(e) + 1,
                    ),
                ),
            ],
            recent: finished.map((e) => this.toView(e, null)),
            fullRuns: [...this.fullRuns.values()]
                .filter((r) => visibleVariants.has(r.variant))
                .map((r) => this.toFullRunView(r)),
            allowance:
                viewerUid === undefined ? null : this.allowance(viewerUid),
        };
    }

    /**
     * Refreshes the calculator count of every variant that has work, acting
     * for the variant's most recent queuer or full-run starter. A count that
     * cannot be told keeps its last known value.
     */
    async refreshCapacities(): Promise<void> {
        const actingUids = new Map<string, number>();

        const sources = [
            ...[...this.entries.values()].filter(isActive).map((e) => ({
                variant: e.variant,
                uid: e.queuedByUid,
                seq: e.queueSeq,
            })),
            ...[...this.fullRuns.values()].filter(isFullRunActive).map((r) => ({
                variant: r.variant,
                uid: r.startedByUid,
                seq: r.startSeq,
            })),
        ].sort((a, b) => a.seq - b.seq);

        for (const source of sources) {
            actingUids.set(source.variant, source.uid);
        }

        await Promise.all(
            [...actingUids].map(async ([variant, actingUid]) => {
                let capacity: number | null;

                try {
                    capacity = await this.deps.getCapacity(variant, actingUid);
                } catch (e) {
                    console.error(
                        `Calculator count lookup of ${variant} threw:`,
                        e,
                    );

                    return;
                }

                if (capacity !== null) {
                    this.capacities.set(variant, capacity);
                }
            }),
        );

        this.schedule();
    }

    private isFullRunActive(variant: string) {
        const run = this.fullRuns.get(variant);

        return run !== undefined && isFullRunActive(run);
    }

    private toFullRunView(run: FullRun): FullRunView {
        return {
            variant: run.variant,
            status: run.status,
            startedByUid: run.startedByUid,
            startedByUsername: run.startedByUsername,
            startedAt: run.startedAt,
            done: run.done,
            total: run.total,
            failed: run.failedUids.size,
        };
    }

    /**
     * Gets the uids that are calculating for a variant, from single entries
     * and full runs.
     */
    private calculatingUids(variant: string) {
        const uids = new Set(this.fullRunCalculating.get(variant));

        for (const entry of this.entries.values()) {
            if (entry.status === "calculating" && entry.variant === variant) {
                uids.add(entry.uid);
            }
        }

        return uids;
    }

    /**
     * Gets how many players are calculating for a variant, counting a player
     * once per calculation.
     */
    private calculatingCount(variant: string) {
        let count = this.fullRunCalculating.get(variant)?.size ?? 0;

        for (const entry of this.entries.values()) {
            if (entry.status === "calculating" && entry.variant === variant) {
                ++count;
            }
        }

        return count;
    }

    private capacityOf(variant: string) {
        return this.capacities.get(variant) ?? 0;
    }

    private cooldownRemainingSeconds(queuedByUid: number) {
        const last = this.lastAddAt.get(queuedByUid);

        if (last === undefined) {
            return 0;
        }

        const remainingMs =
            this.deps.limits.addCooldownSeconds * 1000 -
            (this.deps.now() - last);

        return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
    }

    private estimateWaitSeconds(variant: string, waiting: number) {
        const calculators = this.capacityOf(variant);

        if (calculators <= 0) {
            return null;
        }

        const completions = this.completionSeconds.get(variant) ?? [];
        const secondsPerPlayer =
            completions.length > 0
                ? completions.reduce((sum, s) => sum + s, 0) /
                  completions.length
                : defaultSecondsPerPlayer;

        return Math.ceil(waiting / calculators) * secondsPerPlayer;
    }

    private waitingPosition(entry: QueueEntry) {
        if (entry.status !== "waiting") {
            return null;
        }

        let position = 1;

        for (const other of this.entries.values()) {
            if (
                other.status === "waiting" &&
                other.variant === entry.variant &&
                other.queueSeq < entry.queueSeq
            ) {
                ++position;
            }
        }

        return position;
    }

    private toView(
        entry: QueueEntry,
        position: number | null,
    ): RecalcEntryView {
        const view: RecalcEntryView = {
            id: entry.id,
            uid: entry.uid,
            username: entry.username,
            variant: entry.variant,
            queuedByUid: entry.queuedByUid,
            queuedByUsername: entry.queuedByUsername,
            queuedAt: entry.queuedAt,
            status: entry.status,
            position,
            progress: entry.progress ? { ...entry.progress } : null,
        };

        if (entry.livePPTotal !== undefined) {
            view.livePPTotal = entry.livePPTotal;
        }

        if (entry.localPPTotal !== undefined) {
            view.localPPTotal = entry.localPPTotal;
        }

        if (entry.failureReason !== undefined) {
            view.failureReason = entry.failureReason;
        }

        if (entry.finishedAt !== undefined) {
            view.finishedAt = entry.finishedAt;
        }

        return view;
    }

    /**
     * Drops finished and failed entries that outlived the retention time.
     */
    private pruneFinished() {
        const retentionMs = this.deps.limits.finishedRetentionMinutes * 60_000;
        const now = this.deps.now();

        for (const [id, entry] of this.entries) {
            if (
                entry.finishedAt !== undefined &&
                now - entry.finishedAt >= retentionMs
            ) {
                this.entries.delete(id);
            }
        }
    }

    /**
     * Starts the oldest waiting entries of each variant while it has a free
     * calculator, then lets each full run claim the calculators that are left.
     */
    private schedule() {
        const calculating = new Map<string, number>();

        for (const entry of this.entries.values()) {
            if (entry.status === "calculating") {
                calculating.set(
                    entry.variant,
                    (calculating.get(entry.variant) ?? 0) + 1,
                );
            }
        }

        for (const [variant, uids] of this.fullRunCalculating) {
            calculating.set(
                variant,
                (calculating.get(variant) ?? 0) + uids.size,
            );
        }

        const waiting = [...this.entries.values()]
            .filter((e) => e.status === "waiting")
            .sort((a, b) => a.queueSeq - b.queueSeq);

        for (const entry of waiting) {
            const running = calculating.get(entry.variant) ?? 0;

            if (running >= this.capacityOf(entry.variant)) {
                continue;
            }

            // The full run is calculating this player; wait for it.
            if (this.fullRunCalculating.get(entry.variant)?.has(entry.uid)) {
                continue;
            }

            calculating.set(entry.variant, running + 1);
            this.start(entry);
        }

        for (const run of this.fullRuns.values()) {
            if (!isFullRunActive(run)) {
                continue;
            }

            run.status =
                this.capacityOf(run.variant) > 0 ? "running" : "paused";

            void this.claimForFullRun(run);
        }
    }

    /**
     * Starts players of a full run on the variant's free calculators. Only one
     * claim per run goes at a time; a request that arrives meanwhile makes it
     * go again.
     */
    private async claimForFullRun(run: FullRun) {
        if (run.claiming) {
            run.claimAgain = true;

            return;
        }

        run.claiming = true;

        try {
            do {
                run.claimAgain = false;
                await this.claimOnce(run);
            } while (run.claimAgain);
        } catch (e) {
            console.error(`Full run of ${run.variant} failed to claim:`, e);
        } finally {
            run.claiming = false;
        }
    }

    private async claimOnce(run: FullRun) {
        const { variant } = run;
        const freeCalculators = () =>
            this.capacityOf(variant) - this.calculatingCount(variant);
        const canClaim = () =>
            run.status === "running" && freeCalculators() > 0;

        if (!canClaim()) {
            return;
        }

        const requested = freeCalculators();
        const fresh = await this.deps.fullRunStore.getUnscannedUids(
            variant,
            [...run.attempts.keys(), ...this.calculatingUids(variant)],
            requested,
        );
        let started = 0;

        // The queue may have changed while the store answered.
        for (const uid of fresh) {
            if (canClaim() && !this.calculatingUids(variant).has(uid)) {
                this.startFullRunPlayer(run, uid);
                ++started;
            }
        }

        if (fresh.length >= requested) {
            return;
        }

        // No fresh player is left, so failed ones get another attempt.
        for (const uid of [...run.retries]) {
            if (canClaim() && !this.calculatingUids(variant).has(uid)) {
                run.retries.splice(run.retries.indexOf(uid), 1);
                this.startFullRunPlayer(run, uid);
                ++started;
            }
        }

        if (
            started === 0 &&
            fresh.length === 0 &&
            run.retries.length === 0 &&
            this.calculatingUids(variant).size === 0 &&
            run.status === "running"
        ) {
            run.status = "finished";
        }
    }

    private startFullRunPlayer(run: FullRun, uid: number) {
        run.attempts.set(uid, (run.attempts.get(uid) ?? 0) + 1);

        const calculating =
            this.fullRunCalculating.get(run.variant) ?? new Set();

        calculating.add(uid);
        this.fullRunCalculating.set(run.variant, calculating);

        void this.runFullRunPlayer(run, uid);
    }

    private async runFullRunPlayer(run: FullRun, uid: number) {
        let outcome: ProfileOutcome;

        try {
            outcome = await this.deps.calculate(
                uid,
                run.variant,
                run.startedByUid,
                () => {},
            );
        } catch (e) {
            console.error(
                `Full-run recalculation of uid ${uid.toString()} for ${
                    run.variant
                } threw:`,
                e,
            );

            outcome = { ok: false, reason: "Unexpected error" };
        }

        this.fullRunCalculating.get(run.variant)?.delete(uid);

        if (outcome.ok) {
            ++run.done;
            run.failedUids.delete(uid);
        } else {
            run.failedUids.add(uid);

            if ((run.attempts.get(uid) ?? 0) < maxFullRunAttempts) {
                run.retries.push(uid);
            }
        }

        this.schedule();
    }

    private start(entry: QueueEntry) {
        entry.status = "calculating";
        entry.startedAt = this.deps.now();
        entry.eventSeq = ++this.seq;

        void this.run(entry);
    }

    private async run(entry: QueueEntry) {
        let outcome: ProfileOutcome;

        try {
            outcome = await this.deps.calculate(
                entry.uid,
                entry.variant,
                entry.queuedByUid,
                (done, total) => {
                    if (entry.status === "calculating") {
                        entry.progress = { done, total };
                    }
                },
            );
        } catch (e) {
            console.error(
                `Recalculation of uid ${entry.uid.toString()} for ${
                    entry.variant
                } threw:`,
                e,
            );

            outcome = { ok: false, reason: "Unexpected error" };
        }

        this.finish(entry, outcome);
    }

    private finish(entry: QueueEntry, outcome: ProfileOutcome) {
        const now = this.deps.now();

        entry.finishedAt = now;
        entry.eventSeq = ++this.seq;

        if (outcome.ok) {
            entry.status = "done";
            entry.livePPTotal = outcome.livePPTotal;
            entry.localPPTotal = outcome.localPPTotal;

            const completions = this.completionSeconds.get(entry.variant) ?? [];

            completions.push((now - (entry.startedAt ?? now)) / 1000);
            this.completionSeconds.set(
                entry.variant,
                completions.slice(-averagedCompletions),
            );
        } else {
            entry.status = "failed";
            entry.failureReason = outcome.reason;
        }

        this.schedule();
    }
}

function isActive(entry: QueueEntry) {
    return entry.status === "waiting" || entry.status === "calculating";
}

function isFullRunActive(run: FullRun) {
    return run.status === "running" || run.status === "paused";
}
