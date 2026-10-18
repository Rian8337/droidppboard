/**
 * The limits of the recalculation queue.
 */
export interface RecalcLimits {
    /**
     * The maximum number of waiting or calculating entries per person.
     */
    maxActivePerPerson: number;

    /**
     * The seconds a person must wait between adding entries.
     */
    addCooldownSeconds: number;

    /**
     * The minutes finished and failed entries stay visible.
     */
    finishedRetentionMinutes: number;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
    if (value === undefined || !/^\d+$/.test(value.trim())) {
        return fallback;
    }

    const parsed = Number(value);

    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Reads the recalculation queue limits from the environment.
 *
 * A value that is not a positive integer falls back to its default.
 *
 * @param env The environment.
 * @returns The limits.
 */
export function readRecalcLimits(env: NodeJS.ProcessEnv): RecalcLimits {
    return {
        maxActivePerPerson: readPositiveInteger(
            env.RECALC_MAX_ACTIVE_PER_PERSON,
            5,
        ),
        addCooldownSeconds: readPositiveInteger(
            env.RECALC_ADD_COOLDOWN_SECONDS,
            10,
        ),
        finishedRetentionMinutes: readPositiveInteger(
            env.RECALC_FINISHED_RETENTION_MINUTES,
            60,
        ),
    };
}
