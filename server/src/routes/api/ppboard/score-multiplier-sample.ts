import {
    BeatmapDifficulty,
    MapInfo,
    Modes,
    ModReplayV6,
    ModUtil,
} from "@rian8337/osu-base";
import {
    ModMultiplierSampleEntry,
    ModMultiplierSampleResponse,
} from "app-structures";
import express from "express";
import { RowDataPacket } from "mysql2/promise";
import { officialDb } from "../../../database/official";
import { DroidLegacyScoreMultiplierCalculator } from "../../../scoring/DroidLegacyScoreMultiplierCalculator";
import { DroidScoreMultiplierCalculator } from "../../../scoring/DroidScoreMultiplierCalculator";
import { Util } from "../../../utils/Util";

const rankedMods = [
    ...ModUtil.pcStringToMods([...ModUtil.allMods.keys()].join("")).values(),
].filter(
    (m) =>
        !(m instanceof ModReplayV6) && m.isApplicableToDroid() && m.droidRanked,
);

const rankedAcronyms = rankedMods.map((m) => m.acronym);
const placeholders = rankedAcronyms.map(() => "?").join(", ");

const router = express.Router();

router.use(Util.createRateLimit(3));

interface ScoreRow extends RowDataPacket {
    id: number;
    uid: number;
    score: number;
    accuracy: number;
    mark: string;
    mods: string | null;
}

router.get<"/", unknown, unknown, unknown, Partial<{ beatmapId: string }>>(
    "/",
    async (req, res) => {
        const rawId = req.query.beatmapId ?? "";
        const beatmapId = parseInt(rawId.split("/").at(-1) ?? "");

        if (isNaN(beatmapId) || beatmapId <= 0) {
            return res.status(400).json({ message: "Invalid beatmap ID" });
        }

        const beatmap = await Util.getBeatmap(beatmapId);

        if (!beatmap) {
            return res.status(404).json({ message: "Beatmap not found" });
        }

        const { file_md5: hash } = beatmap;

        const cached = Util.scoreMultiplierCache.get(hash);

        let scores: ModMultiplierSampleEntry[];

        if (cached && Date.now() < cached.expiresAt) {
            scores = cached.data;
        } else {
            const query = `
                WITH beatmap_scores AS (
                    SELECT id, uid, score, total_score, accuracy, mark, mods,
                        (
                            SELECT GROUP_CONCAT(j.acronym ORDER BY j.acronym)
                            FROM JSON_TABLE(mods, '$[*]' COLUMNS (acronym VARCHAR(10) PATH '$.acronym')) j
                        ) AS mods_str
                    FROM bbl_score
                    WHERE hash = ?
                ),
                per_acronym AS (
                    SELECT s.id, j.acronym
                    FROM beatmap_scores s,
                    JSON_TABLE(s.mods, '$[*]' COLUMNS (acronym VARCHAR(10) PATH '$.acronym')) j
                    WHERE j.acronym IN (${placeholders})

                    UNION ALL

                    SELECT s.id, NULL AS acronym
                    FROM beatmap_scores s
                    WHERE JSON_LENGTH(s.mods) = 0
                ),
                ranked AS (
                    SELECT p.id, p.acronym,
                           ROW_NUMBER() OVER (PARTITION BY p.acronym ORDER BY bs.total_score DESC) AS rn
                    FROM per_acronym p
                    JOIN beatmap_scores bs ON bs.id = p.id
                )
                SELECT bs.id, bs.uid, bs.score, bs.accuracy, bs.mark,
                       bs.mods_str AS mods
                FROM ranked r
                JOIN beatmap_scores bs ON bs.id = r.id
                WHERE r.rn <= 25
                ORDER BY bs.total_score DESC
            `;

            const result = await officialDb
                .execute<ScoreRow[]>(query, [hash, ...rankedAcronyms])
                .catch((e) => {
                    console.error(e);
                    return null;
                });

            if (!result) {
                return res
                    .status(500)
                    .json({ message: "Failed to query scores" });
            }

            const [rows] = result;

            const difficulty = new BeatmapDifficulty();

            difficulty.cs = parseFloat(beatmap.diff_size);
            difficulty.ar = parseFloat(beatmap.diff_approach);
            difficulty.od = parseFloat(beatmap.diff_overall);
            difficulty.hp = parseFloat(beatmap.diff_drain);

            const legacyCalculator = new DroidLegacyScoreMultiplierCalculator(
                difficulty,
            );

            const seen = new Set<number>();

            scores = rows
                .filter((row) => {
                    if (seen.has(row.id)) {
                        return false;
                    }
                    seen.add(row.id);
                    return true;
                })
                .map<ModMultiplierSampleEntry>((row) => {
                    const mods = ModUtil.pcStringToMods(row.mods ?? "");
                    const modArray = [...mods.values()];

                    const prevMultiplier =
                        legacyCalculator.calculateFor(modArray);

                    const appliedDifficulty = new BeatmapDifficulty(difficulty);

                    ModUtil.applyModsToBeatmapDifficulty(
                        appliedDifficulty,
                        Modes.Droid,
                        mods,
                    );

                    const newCalculator = new DroidScoreMultiplierCalculator(
                        difficulty,
                        appliedDifficulty,
                    );

                    const newMultiplier = newCalculator.calculateFor(modArray);

                    return {
                        id: row.id,
                        uid: row.uid,
                        mods: ModUtil.modsToOrderedString(modArray),
                        prevMultiplier,
                        prevTotalScore: Math.round(
                            Math.fround(
                                row.score * Math.fround(prevMultiplier),
                            ),
                        ),
                        newMultiplier,
                        newTotalScore: Math.round(row.score * newMultiplier),
                        accuracy: row.accuracy,
                        mark: row.mark,
                    };
                });

            scores.sort((a, b) => b.newTotalScore - a.newTotalScore).splice(50);

            Util.scoreMultiplierCache.set(hash, {
                data: scores,
                expiresAt: Date.now() + 3_600_000,
            });
        }

        const response: ModMultiplierSampleResponse = {
            beatmapTitle: MapInfo.from(beatmap).fullTitle,
            hash,
            scores,
        };

        return res.json(response);
    },
);

export default router;
