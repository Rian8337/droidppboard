import type { PrototypePPEntry } from "app-structures";

/** A score as the table shows it. `username`, `uid` and `country` are set for scores of several players, such as top plays. */
export type ScoreRow = PrototypePPEntry & {
    /** The 1-based position of the score by local pp. */
    rank: number;

    /** How many places the score moved from its live position to its local one; positive means up. */
    rankChange: number;
    username?: string;
    country?: string | null;
    uid?: number;
};

/** Gives each score the 1-based position it has when ordered by `getPp`, highest first; ties keep their input order. */
function getPositions(
    scores: readonly PrototypePPEntry[],
    getPp: (score: PrototypePPEntry) => number,
): number[] {
    const positions: number[] = [];

    scores
        .map((score, index) => ({ index, pp: getPp(score) }))
        .sort((a, b) => b.pp - a.pp)
        .forEach(({ index }, position) => {
            positions[index] = position + 1;
        });

    return positions;
}

/** Ranks scores by local pp and records how far each moved compared with its position by live pp. */
export function addRankChanges(scores: readonly PrototypePPEntry[]): ScoreRow[] {
    const livePositions = getPositions(scores, (score) => score.live.performance.total);
    const localPositions = getPositions(scores, (score) => score.local.performance.total);

    return scores.map((score, index) => ({
        ...score,
        rank: localPositions[index],
        rankChange: livePositions[index] - localPositions[index],
    }));
}
