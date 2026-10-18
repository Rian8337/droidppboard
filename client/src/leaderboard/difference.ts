import type { IPrototypePP, PrototypePPEntry, ScorePrototypeState } from "app-structures";

/** The variant whose players have no master pp to compare with. */
export const variantWithoutMaster = "droid-rebalance";

export type DifferenceTone = "up" | "down" | "neutral";

export interface FormattedDifference {
    text: string;
    tone: DifferenceTone;
}

/** How much more pp the player has locally than in what they are compared with: master when there is one, live otherwise. */
export function getDifference(player: IPrototypePP): number {
    return player.localPPTotal - (player.masterPPTotal ?? player.livePPTotal);
}

/** What a score is compared with: its master state when it has one, its live state otherwise. */
export function getComparisonState(score: PrototypePPEntry): ScorePrototypeState {
    return score.master ?? score.live;
}

/** How much more pp a score is worth locally than in what it is compared with, as for a player. */
export function getScoreDifference(score: PrototypePPEntry): number {
    return score.local.performance.total - getComparisonState(score).performance.total;
}

/**
 * Signs a difference and rounds it to `fractionDigits` decimals (one by default). A difference that
 * rounds to zero is neutral.
 */
export function formatDifference(difference: number, fractionDigits = 1): FormattedDifference {
    const text = difference.toFixed(fractionDigits);
    const rounded = Number(text);

    if (rounded === 0) {
        return { text: (0).toFixed(fractionDigits), tone: "neutral" };
    }

    return rounded > 0 ? { text: `+${text}`, tone: "up" } : { text, tone: "down" };
}
