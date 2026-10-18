import { Router } from "express";
import { Util } from "../../../utils/Util";
import { ICalculationResult } from "app-structures";
import {
    Accuracy,
    BeatmapDecoder,
    BeatmapDifficulty,
    MathUtils,
    ModCustomSpeed,
    ModDifficultyAdjust,
    ModUtil,
    Modes,
} from "@rian8337/osu-base";
import { ReadStream } from "fs";
import {
    DroidDifficultyAttributes,
    OsuDifficultyAttributes,
} from "@rian8337/osu-difficulty-calculator";
import {
    DroidDifficultyAttributes as RebalanceDroidDifficultyAttributes,
    OsuDifficultyAttributes as RebalanceOsuDifficultyAttributes,
} from "@rian8337/osu-rebalance-difficulty-calculator";
import { DroidPerformanceAttributes } from "../../../structures/difficultyattributes/DroidPerformanceAttributes";
import { RebalanceDroidPerformanceAttributes } from "../../../structures/difficultyattributes/RebalanceDroidPerformanceAttributes";
import { OsuPerformanceAttributes } from "../../../structures/difficultyattributes/OsuPerformanceAttributes";
import { BrokerPerformanceResponse } from "../../../structures/difficultyattributes/BrokerPerformanceResponse";

const router = Router();

/**
 * Converts a strain chart from the broker (a base64 PNG) to binary data, which is what the client reads.
 */
function decodeStrainChart(strainChart?: string): number[] {
    return strainChart ? Array.from(Buffer.from(strainChart, "base64")) : [];
}

router.use(Util.createRateLimit(5, 1000));

router.post("/", async (req, res) => {
    let osuFile = "";

    // @ts-expect-error: Bad typings
    if (Object.keys(req.files).length > 0) {
        //@ts-expect-error: Bad typings
        const file: ReadStream = req.files.beatmapfile;

        if (!file.path.toString("utf-8").endsWith(".osu")) {
            return res.status(400).json({ message: "Invalid file uploaded" });
        }

        osuFile = (await Util.readFile(file)).toString("utf-8");
    }

    let beatmapId: number | undefined;

    if (req.body.beatmaplink && !osuFile) {
        const a: string[] = req.body.beatmaplink.split("/");
        beatmapId = parseInt(a.at(-1)!);

        if (beatmapId <= 0 || isNaN(beatmapId)) {
            return res.status(400).json({ message: "Invalid beatmap ID" });
        }

        osuFile = await Util.downloadBeatmap(beatmapId);
    }

    if (!osuFile) {
        return res
            .status(400)
            .json({ message: "Please enter a valid beatmap file, link or ID" });
    }

    const mods = ModUtil.pcStringToMods(req.body.mods || "");
    const accuracy =
        MathUtils.clamp(parseFloat(req.body.accuracy), 0, 100) || 100;
    const miss = Math.max(0, parseInt(req.body.misses)) || 0;

    if (
        [req.body.forcecs, req.body.forcear, req.body.forceod].some(
            (v) => typeof v === "string" && v.length > 0,
        )
    ) {
        mods.set(
            new ModDifficultyAdjust({
                cs:
                    MathUtils.clamp(parseFloat(req.body.forcecs), 0, 15) ||
                    undefined,
                ar:
                    MathUtils.clamp(parseFloat(req.body.forcear), 0, 12.5) ||
                    undefined,
                od:
                    MathUtils.clamp(parseFloat(req.body.forceod), 0, 12.5) ||
                    undefined,
            }),
        );
    }

    const isPrototype = Util.requestIsPrototype(req);
    const parsedBeatmap = new BeatmapDecoder().decode(osuFile).result;

    const { maxCombo } = parsedBeatmap;
    const combo =
        MathUtils.clamp(parseInt(req.body.combo), 0, maxCombo) || maxCombo;

    const customSpeedMultiplier = MathUtils.clamp(
        parseFloat(req.body.speedmultiplier) || 1,
        0.5,
        2,
    );

    if (customSpeedMultiplier !== 1) {
        mods.set(new ModCustomSpeed(customSpeedMultiplier));
    }

    const beatmapDifficulty = new BeatmapDifficulty(parsedBeatmap.difficulty);

    ModUtil.applyModsToBeatmapDifficulty(
        beatmapDifficulty,
        Modes.Droid,
        mods,
        true,
    );

    const realAcc = Accuracy.fromPercent(
        accuracy,
        parsedBeatmap.hitObjects.objects.length,
        miss
    );

    const requestBody = JSON.stringify({
        beatmap: { file: osuFile },
        mods: mods.serializeMods(),
        score: {
            n300: realAcc.n300,
            n100: realAcc.n100,
            n50: realAcc.n50,
            nmiss: realAcc.nmiss,
            combo: combo,
        },
        strainChart: !!req.body.generatestrainchart,
    });

    const algorithm = isPrototype ? "rebalance" : "live";

    const calculate = async <TDifficulty, TPerformance>(mode: Modes) => {
        const variant = `${mode}-${algorithm}`;

        try {
            const response = await fetch(
                `${process.env.DPP_BROKER_URL!.replace(/\/+$/, "")}/variants/${variant}/performance`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Api-Key": process.env.DPP_BROKER_KEY!,
                    },
                    body: requestBody,
                },
            );

            if (!response.ok) {
                console.error(
                    `Calculation for ${variant} failed with status ${response.status.toString()}:`,
                    await response.text(),
                );

                return null;
            }

            return (await response.json()) as BrokerPerformanceResponse<
                TDifficulty,
                TPerformance
            >;
        } catch (e) {
            console.error(`Calculation for ${variant} failed:`, e);

            return null;
        }
    };

    const droidAttribs = await calculate<
        DroidDifficultyAttributes | RebalanceDroidDifficultyAttributes,
        DroidPerformanceAttributes | RebalanceDroidPerformanceAttributes
    >(Modes.Droid);

    if (!droidAttribs) {
        return res.status(400).json({
            message: "Could not contact the processing server",
        });
    }

    const osuAttribs = await calculate<
        OsuDifficultyAttributes | RebalanceOsuDifficultyAttributes,
        OsuPerformanceAttributes
    >(Modes.Osu);

    if (!osuAttribs) {
        return res.status(400).json({
            message: "Could not contact the processing server",
        });
    }

    const response: ICalculationResult = {
        beatmap: {
            id: beatmapId,
            artist: parsedBeatmap.metadata.artist,
            creator: parsedBeatmap.metadata.creator,
            title: parsedBeatmap.metadata.title,
            version: parsedBeatmap.metadata.version,
            maxCombo: parsedBeatmap.maxCombo,
            stats: {
                cs: parsedBeatmap.difficulty.cs,
                ar: parsedBeatmap.difficulty.ar,
                od: parsedBeatmap.difficulty.od,
                hp: parsedBeatmap.difficulty.hp,
            },
            modifiedStats: {
                cs: beatmapDifficulty.cs,
                ar: beatmapDifficulty.ar,
                od: beatmapDifficulty.od,
                hp: beatmapDifficulty.hp,
            },
        },
        difficulty: {
            droid: {
                aim: droidAttribs.difficulty.aimDifficulty,
                speed: droidAttribs.difficulty.tapDifficulty,
                rhythm: droidAttribs.difficulty.rhythmDifficulty,
                flashlight: droidAttribs.difficulty.flashlightDifficulty,
                reading: droidAttribs.difficulty.readingDifficulty,
                total: droidAttribs.difficulty.starRating,
            },
            osu: {
                aim: osuAttribs.difficulty.aimDifficulty,
                speed: osuAttribs.difficulty.speedDifficulty,
                rhythm: 0,
                flashlight: osuAttribs.difficulty.flashlightDifficulty,
                reading: 0,
                total: osuAttribs.difficulty.starRating,
            },
        },
        performance: {
            droid: {
                aim: droidAttribs.performance.aim,
                speed: droidAttribs.performance.tap,
                accuracy: droidAttribs.performance.accuracy,
                flashlight: droidAttribs.performance.flashlight,
                reading: droidAttribs.performance.reading,
                total: droidAttribs.performance.total,
            },
            osu: {
                aim: osuAttribs.performance.aim,
                speed: osuAttribs.performance.speed,
                accuracy: osuAttribs.performance.accuracy,
                flashlight: osuAttribs.performance.flashlight,
                reading: 0,
                total: osuAttribs.performance.total,
            },
        },
        strainGraph: {
            droid: decodeStrainChart(droidAttribs.strainChart),
            osu: decodeStrainChart(osuAttribs.strainChart),
        },
    };

    res.json(response);
});

export default router;
