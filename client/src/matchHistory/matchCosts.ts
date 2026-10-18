import { MultiplayerTeam, type MultiplayerScore, type MultiplayerSession } from "./types";

/** The user IDs the tournament server uses for the red and the blue team's total in Team VS. */
const redTotalUserId = 0;
const blueTotalUserId = 1;

/** Whether the score is a team's total rather than a player's. */
export function isTeamTotal(score: MultiplayerScore): boolean {
    return score.userId === redTotalUserId || score.userId === blueTotalUserId;
}

/**
 * The match cost of every player: their score against the session average in each session they
 * scored in, summed and weighted by 2 / (sessions + 2), so that playing few sessions does not
 * inflate it. Team totals are not players. Highest first.
 */
export function calculateMatchCosts(
    sessions: readonly MultiplayerSession[],
): [player: string, cost: number][] {
    const sessionCounts = new Map<string, number>();
    const scoreRatios = new Map<string, number>();

    for (const session of sessions) {
        const playerScores = session.scores.filter((score) => !isTeamTotal(score));

        if (playerScores.length === 0) {
            continue;
        }

        const average =
            playerScores.reduce((total, score) => total + score.score, 0) / playerScores.length;

        if (average <= 0) {
            continue;
        }

        for (const score of playerScores) {
            sessionCounts.set(score.userName, (sessionCounts.get(score.userName) ?? 0) + 1);
            scoreRatios.set(
                score.userName,
                (scoreRatios.get(score.userName) ?? 0) + score.score / average,
            );
        }
    }

    return [...sessionCounts]
        .map<[string, number]>(([player, count]) => [
            player,
            (2 / (count + 2)) * (scoreRatios.get(player) ?? 0),
        ])
        .sort((a, b) => b[1] - a[1]);
}

function getTeamOrder(score: MultiplayerScore): number {
    switch (score.userId) {
        case blueTotalUserId:
            return 0;
        case redTotalUserId:
            return 2;
        default:
            return score.team === MultiplayerTeam.blue ? 1 : 3;
    }
}

/** The scores of a Team VS session: the blue total, blue players, the red total, red players. */
export function sortTeamScores(scores: readonly MultiplayerScore[]): MultiplayerScore[] {
    return [...scores].sort((a, b) => getTeamOrder(a) - getTeamOrder(b));
}
