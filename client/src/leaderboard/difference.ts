import type { IPrototypePP } from "app-structures";

export type DifferenceTone = "up" | "down" | "neutral";

export interface FormattedDifference {
    text: string;
    tone: DifferenceTone;
}

/** How much more pp the player has locally than in what they are compared with: master when there is one, live otherwise. */
export function getDifference(player: IPrototypePP): number {
    return player.localPPTotal - (player.masterPPTotal ?? player.livePPTotal);
}

/** Signs a difference and rounds it to one decimal. A difference that rounds to zero is neutral. */
export function formatDifference(difference: number): FormattedDifference {
    const text = difference.toFixed(1);
    const rounded = Number(text);

    if (rounded === 0) {
        return { text: "0.0", tone: "neutral" };
    }

    return rounded > 0 ? { text: `+${text}`, tone: "up" } : { text, tone: "down" };
}
