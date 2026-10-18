import { RowDataPacket } from "mysql2/promise";
import { officialDb } from "../database/official";

interface ScoreHashRow extends RowDataPacket {
    hash: string;
}

/**
 * Gets the beatmap hashes of a player's best pp scores.
 *
 * @param uid The uid of the player.
 * @param amount The amount of scores to get. Defaults to 100.
 * @returns The MD5 hashes of the beatmaps, from the highest pp to the lowest.
 */
export async function getTopScoreHashes(
    uid: number,
    amount = 100,
): Promise<string[]> {
    // `query` rather than `execute`, as MySQL rejects a prepared statement's numeric `LIMIT` parameter.
    const [rows] = await officialDb.query<ScoreHashRow[]>(
        "SELECT hash FROM bbl_score_best WHERE uid = ? ORDER BY pp DESC LIMIT ?",
        [uid, amount],
    );

    return rows.map((row) => row.hash);
}
