import {
    ModMultiplierSampleEntry,
    ModMultiplierSampleResponse,
} from "app-structures";
import express from "express";
import { RowDataPacket } from "mysql2/promise";
import { officialDb } from "../../../database/official";
import { Util } from "../../../utils/Util";
import { MapInfo } from "@rian8337/osu-base";

const router = express.Router();

router.use(Util.createRateLimit(3));

interface ScoreRow extends RowDataPacket {
    id: number;
    uid: number;
    score: number;
    score_multiplier: number;
    total_score: number;
    accuracy: number;
    mark: string;
    mod_combo: string;
}

router.get<
    "/",
    unknown,
    unknown,
    unknown,
    Partial<{ beatmapId: string; mods: string }>
>("/", async (req, res) => {
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

    const requiredMods = (req.query.mods ?? "")
        .split(",")
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean);

    const cached = Util.scoreMultiplierCache.get(hash);
    let allScores: ModMultiplierSampleEntry[];

    if (cached && Date.now() < cached.expiresAt) {
        allScores = cached.data;
    } else {
        const query = `
            WITH beatmap_scores AS (
                SELECT id, uid, score, score_multiplier, total_score, accuracy, mark, mods
                FROM bbl_score
                WHERE hash = ?
            ),
            enriched AS (
                SELECT
                    s.id, s.uid, s.score, s.score_multiplier, s.total_score, s.accuracy, s.mark,
                    COALESCE(
                        (
                            SELECT GROUP_CONCAT(j.acronym ORDER BY j.acronym SEPARATOR '+')
                            FROM JSON_TABLE(s.mods, '$[*]' COLUMNS (acronym VARCHAR(10) PATH '$.acronym')) j
                        ),
                        'NM'
                    ) AS mod_combo
                FROM beatmap_scores s
            ),
            ranked AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY mod_combo ORDER BY total_score DESC) AS rn
                FROM enriched
            )
            SELECT id, uid, score, score_multiplier, total_score, accuracy, mark, mod_combo
            FROM ranked
            WHERE rn <= 25
            ORDER BY total_score DESC
            LIMIT 50
        `;

        const result = await officialDb
            .execute<ScoreRow[]>(query, [hash])
            .catch((e) => {
                console.error(e);
                return null;
            });

        if (!result) {
            return res.status(500).json({ message: "Failed to query scores" });
        }

        const [rows] = result;

        allScores = rows.map((row: ScoreRow) => ({
            id: row.id,
            uid: row.uid,
            score: row.score,
            scoreMultiplier: row.score_multiplier,
            totalScore: row.total_score,
            accuracy: row.accuracy,
            mark: row.mark,
            modCombo: row.mod_combo,
        }));

        Util.scoreMultiplierCache.set(hash, {
            data: allScores,
            expiresAt: Date.now() + 3_600_000,
        });
    }

    const scores =
        requiredMods.length > 0
            ? allScores.filter((s) => {
                  const parts =
                      s.modCombo === "NM" ? [] : s.modCombo.split("+");
                  return requiredMods.every((m) => parts.includes(m));
              })
            : allScores;

    const beatmapInfo = MapInfo.from(beatmap);

    const response: ModMultiplierSampleResponse = {
        beatmapTitle: beatmapInfo.fullTitle,
        hash,
        scores,
    };

    res.json(response);
});

export default router;
