import type { PPVariant } from "./PPVariant";

/**
 * The status of a single recalculation entry.
 */
export type RecalcEntryStatus = "waiting" | "calculating" | "done" | "failed";

/**
 * A single player's recalculation for a variant, as shown on the queue page.
 */
export interface RecalcEntryView {
    /**
     * The ID of the entry.
     */
    id: string;

    /**
     * The uid of the player being recalculated.
     */
    uid: number;

    /**
     * The username of the player being recalculated.
     */
    username: string;

    /**
     * The name of the variant the player is recalculated for.
     */
    variant: string;

    /**
     * The uid of the person who queued the entry.
     */
    queuedByUid: number;

    /**
     * The username of the person who queued the entry.
     */
    queuedByUsername: string;

    /**
     * The time at which the entry was queued, in milliseconds since the epoch.
     */
    queuedAt: number;

    /**
     * The status of the entry.
     */
    status: RecalcEntryStatus;

    /**
     * The 1-based position of the entry among the waiting entries of its
     * variant, or `null` if the entry is not waiting.
     */
    position: number | null;

    /**
     * The number of scores processed out of the player's top scores, or `null`
     * if the entry has not reported any progress.
     */
    progress: { done: number; total: number } | null;

    /**
     * The live pp total of the recalculated profile, if the entry is done.
     */
    livePPTotal?: number;

    /**
     * The local pp total of the recalculated profile, if the entry is done.
     */
    localPPTotal?: number;

    /**
     * The reason the entry failed, if it failed.
     */
    failureReason?: string;

    /**
     * The time at which the entry finished or failed, in milliseconds since
     * the epoch.
     */
    finishedAt?: number;
}

/**
 * The status of a full run.
 */
export type FullRunStatus = "running" | "paused" | "stopped" | "finished";

/**
 * A full recalculation run of a variant, as shown on the queue page.
 */
export interface FullRunView {
    /**
     * The name of the variant the run recalculates.
     */
    variant: string;

    /**
     * The status of the run.
     */
    status: FullRunStatus;

    /**
     * The uid of the admin who started the run.
     */
    startedByUid: number;

    /**
     * The username of the admin who started the run.
     */
    startedByUsername: string;

    /**
     * The time at which the run started, in milliseconds since the epoch.
     */
    startedAt: number;

    /**
     * The number of players that have been recalculated.
     */
    done: number;

    /**
     * The number of players the run recalculates.
     */
    total: number;

    /**
     * The number of players whose recalculation failed.
     */
    failed: number;
}

/**
 * How many more entries a person may queue.
 */
export interface RecalcAllowance {
    /**
     * The number of waiting or calculating entries the person has queued.
     */
    active: number;

    /**
     * The maximum number of waiting or calculating entries per person.
     */
    maxActive: number;

    /**
     * The seconds until the person may queue again, or 0 if they may now.
     */
    cooldownRemainingSeconds: number;
}

/**
 * The recalculation queue as shown to a viewer.
 */
export interface RecalcQueueView {
    /**
     * The selected variant, or `null` for the global view.
     */
    variant: string | null;

    /**
     * The number of calculators (healthy instances) of the selected variant,
     * or of all variants the viewer can see in the global view.
     */
    calculators: number;

    /**
     * The estimated seconds until a newly queued player of the selected
     * variant finishes waiting, or `null` if it is unknown.
     */
    estimatedWaitSeconds: number | null;

    /**
     * The calculating entries, followed by the waiting entries in queue order.
     */
    queue: RecalcEntryView[];

    /**
     * The done and failed entries, newest first.
     */
    recent: RecalcEntryView[];

    /**
     * The full runs of the variants the viewer can see.
     */
    fullRuns: FullRunView[];

    /**
     * The viewer's allowance, or `null` for a visitor.
     */
    allowance: RecalcAllowance | null;

    /**
     * Whether the viewer may start and control full runs.
     */
    canManageFullRuns: boolean;

    /**
     * The droid variants the viewer can see, sorted by name. The queue page lists them in its
     * variant picker.
     */
    variants: PPVariant[];
}
