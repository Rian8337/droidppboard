import {
    IPrototypePP,
    PrototypePPEntry,
    ScorePrototypeState,
} from "app-structures";

/**
 * The variant whose calculations every profile holds as `live`.
 */
export const liveVariant = "droid-live";

/**
 * The variant whose calculations every other profile holds as `master`.
 */
export const masterVariant = "droid-rebalance";

/**
 * The parts of a profile that hold calculations to reuse.
 */
export type ReusableProfile = Pick<
    IPrototypePP,
    "reworkType" | "pp" | "calculatorBuilds"
>;

/**
 * The calculations of a score that can be reused.
 */
export interface ReusableScore {
    /**
     * An entry of the score, for the values that do not depend on the variant.
     */
    readonly entry: PrototypePPEntry;

    /**
     * The state of the score in each variant whose calculation can be reused.
     */
    readonly states: Map<string, ScorePrototypeState>;
}

/**
 * Gets the state of an entry in a variant, as a profile of a variant holds it.
 */
function getState(
    reworkType: string,
    entry: PrototypePPEntry,
    variant: string,
): ScorePrototypeState | undefined {
    if (reworkType === variant) {
        return entry.local;
    }

    if (variant === liveVariant) {
        return entry.live;
    }

    return variant === masterVariant ? entry.master : undefined;
}

/**
 * Collects the calculations that profiles hold for the current builds of variants, by score ID.
 *
 * A profile's calculation of a variant is current when the profile recorded the variant's build as the current one.
 *
 * @param profiles The profiles.
 * @param variants The variants to collect the calculations of.
 * @param builds The current build of each variant. A variant without one is not collected.
 */
export function collectReusableScores(
    profiles: readonly ReusableProfile[],
    variants: readonly string[],
    builds: Readonly<Record<string, string>>,
): Map<number, ReusableScore> {
    const scores = new Map<number, ReusableScore>();

    for (const profile of profiles) {
        for (const variant of variants) {
            const build = builds[variant];

            if (
                build === undefined ||
                profile.calculatorBuilds?.[variant] !== build
            ) {
                continue;
            }

            for (const entry of profile.pp) {
                if (entry.scoreId === undefined) {
                    continue;
                }

                const state = getState(profile.reworkType, entry, variant);

                if (state === undefined) {
                    continue;
                }

                let score = scores.get(entry.scoreId);

                if (!score) {
                    score = { entry, states: new Map() };
                    scores.set(entry.scoreId, score);
                }

                if (!score.states.has(variant)) {
                    score.states.set(variant, state);
                }
            }
        }
    }

    return scores;
}

/**
 * The scores that failed profile calculations finished, so that the next attempt of a player does not calculate them
 * again. Holds a bounded number of profiles, dropping the oldest first.
 */
export class UnfinishedProfiles {
    private readonly profiles = new Map<string, ReusableProfile>();

    /**
     * @param maxSize The maximum number of profiles to hold.
     */
    constructor(private readonly maxSize = 1000) {}

    /**
     * Gets the unfinished profile of a player in a variant.
     */
    get(uid: number, variant: string): ReusableProfile | undefined {
        return this.profiles.get(this.keyOf(uid, variant));
    }

    /**
     * Stores the unfinished profile of a player in a variant, replacing any earlier one.
     */
    set(uid: number, variant: string, profile: ReusableProfile): void {
        const key = this.keyOf(uid, variant);

        this.profiles.delete(key);
        this.profiles.set(key, profile);

        for (const oldest of this.profiles.keys()) {
            if (this.profiles.size <= this.maxSize) {
                break;
            }

            this.profiles.delete(oldest);
        }
    }

    /**
     * Removes the unfinished profile of a player in a variant.
     */
    delete(uid: number, variant: string): void {
        this.profiles.delete(this.keyOf(uid, variant));
    }

    private keyOf(uid: number, variant: string) {
        return `${uid.toString()}:${variant}`;
    }
}
