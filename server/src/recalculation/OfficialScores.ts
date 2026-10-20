import { RowDataPacket } from "mysql2/promise";
import { officialDb } from "../database/official";

interface ScoreRow extends RowDataPacket {
    id: number;
    hash: string;
}

/**
 * A best pp score of a player.
 */
export interface TopScore {
    /**
     * The ID of the score.
     */
    readonly id: number;

    /**
     * The MD5 hash of the beatmap the score was set on.
     */
    readonly hash: string;
}

/**
 * Gets a player's best pp scores, one per beatmap.
 *
 * @param uid The uid of the player.
 * @param amount The amount of scores to get. Defaults to 100.
 * @returns The scores, from the highest pp to the lowest.
 */
export async function getTopScores(
    uid: number,
    amount = 100,
): Promise<TopScore[]> {
    // `query` rather than `execute`, as MySQL rejects a prepared statement's numeric `LIMIT` parameter. The order
    // matches the score service's, so that a beatmap's first score is the one the score service calculates.
    const [rows] = await officialDb.query<ScoreRow[]>(
        "SELECT id, hash FROM bbl_score_best WHERE uid = ? ORDER BY pp DESC, id ASC LIMIT ?",
        [uid, amount],
    );

    const seen = new Set<string>();
    const scores: TopScore[] = [];

    for (const { id, hash } of rows) {
        const key = hash.toLowerCase();

        if (!seen.has(key)) {
            seen.add(key);
            scores.push({ id, hash });
        }
    }

    return scores;
}
