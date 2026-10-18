import type { IPrototypePP, ScorePrototypeState } from "app-structures";

/** How much less each score counts than the one above it, as the server weighs the totals. */
const weightPerRank = 0.95;

export interface ProfileStats {
    /** Weighted local aim, tap, accuracy, flashlight and reading pp of the player's scores. */
    aim: number;
    tap: number;
    accuracy: number;
    flashlight: number;
    reading: number;

    /** The accuracy of the player's scores, in percent, weighted by rank. */
    hitAccuracy: number;
}

/**
 * Sums the player's scores from highest local pp to lowest, each weighted by 0.95 to the power of
 * its rank (as the server does for the totals), once per skill. The hit accuracy is the weighted
 * mean of the scores' accuracies. A player without scores has zeros.
 */
export function getProfileStats(profile: IPrototypePP): ProfileStats {
    const scores = [...profile.pp].sort(
        (a, b) => b.local.performance.total - a.local.performance.total,
    );
    const stats: ProfileStats = {
        aim: 0,
        tap: 0,
        accuracy: 0,
        flashlight: 0,
        reading: 0,
        hitAccuracy: 0,
    };
    let weightSum = 0;

    scores.forEach((score, rank) => {
        const weight = Math.pow(weightPerRank, rank);
        const performance: ScorePrototypeState["performance"] = score.local.performance;

        stats.aim += performance.aim * weight;
        stats.tap += performance.tap * weight;
        stats.accuracy += performance.accuracy * weight;
        stats.flashlight += performance.flashlight * weight;
        stats.reading += performance.reading * weight;
        stats.hitAccuracy += score.accuracy * weight;
        weightSum += weight;
    });

    stats.hitAccuracy = weightSum === 0 ? 0 : stats.hitAccuracy / weightSum;

    return stats;
}
