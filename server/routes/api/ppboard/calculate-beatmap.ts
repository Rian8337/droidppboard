import express from "express";
import { Util } from "../../../utils/Util";
import { ICalculationResult } from "app-structures";
import {
    Accuracy,
    BeatmapDecoder,
    MapStats,
    MathUtils,
    ModUtil,
    Precision,
} from "@rian8337/osu-base";
import { ReadStream } from "fs";
import {
    MapStars,
    DroidPerformanceCalculator,
    OsuPerformanceCalculator,
    DifficultyCalculationOptions,
} from "@rian8337/osu-difficulty-calculator";
import {
    MapStars as RebalanceMapStars,
    DroidPerformanceCalculator as RebalanceDroidPerformanceCalculator,
    OsuPerformanceCalculator as RebalanceOsuPerformanceCalculator,
} from "@rian8337/osu-rebalance-difficulty-calculator";
import getStrainChart from "@rian8337/osu-strain-graph-generator";

const router: express.Router = express.Router();

router.use(Util.createRateLimit(1, 5000));

router.post("/", async (req, res) => {
    let osuFile = "";

    // @ts-expect-error: Bad typings
    if (Object.keys(req.files).length > 0) {
        //@ts-expect-error: Bad typings
        const file: ReadStream = req.files.beatmapfile;

        if (
            !(
                file.path instanceof Buffer
                    ? file.path.toString("utf-8")
                    : file.path
            ).endsWith(".osu")
        ) {
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

    const stats = new MapStats();

    if (req.body.speedmultiplier) {
        stats.speedMultiplier = MathUtils.clamp(
            parseFloat(req.body.speedmultiplier) || 1,
            0.5,
            2
        );
    }

    if (req.body.forcear) {
        stats.ar = MathUtils.clamp(parseFloat(req.body.forcear), 0, 12.5);
        stats.isForceAR = !isNaN(stats.ar);
    }

    const isPrototype = Util.requestIsPrototype(req);

    let star: MapStars | RebalanceMapStars;

    const parsedBeatmap = new BeatmapDecoder().decode(osuFile, mods).result;

    const options: DifficultyCalculationOptions = {
        mods: mods,
        stats: stats,
    };

    try {
        star = isPrototype
            ? new RebalanceMapStars(parsedBeatmap, options)
            : new MapStars(parsedBeatmap, options);
    } catch {
        return res.status(400).json({
            message: "Invalid file uploaded or beatmap ID is invalid",
        });
    }

    if (star.osu.total === 0) {
        return res.status(400).json({
            message: "Invalid file uploaded or beatmap ID is invalid",
        });
    }

    const { beatmap } = star.osu;
    const { maxCombo } = beatmap;
    const combo =
        MathUtils.clamp(parseInt(req.body.combo), 0, maxCombo) || maxCombo;

    const modifiedStats: MapStats = new MapStats({
        cs: beatmap.difficulty.cs,
        ar: stats.ar ?? beatmap.difficulty.ar,
        od: beatmap.difficulty.od,
        hp: beatmap.difficulty.hp,
        mods: mods,
        speedMultiplier: stats.speedMultiplier,
        isForceAR: stats.isForceAR,
    }).calculate();

    const realAcc: Accuracy = new Accuracy({
        percent: accuracy,
        nobjects: beatmap.hitObjects.objects.length,
    });

    const dpp = (
        isPrototype
            ? new RebalanceDroidPerformanceCalculator(star.droid.attributes)
            : new DroidPerformanceCalculator(star.droid.attributes)
    ).calculate({
        combo: combo,
        accPercent: realAcc,
        miss: miss,
    });

    const pp = (
        isPrototype
            ? new RebalanceOsuPerformanceCalculator(star.osu.attributes)
            : new OsuPerformanceCalculator(star.osu.attributes)
    ).calculate({
        combo: combo,
        accPercent: realAcc,
        miss: miss,
    });

    const response: ICalculationResult = {
        beatmap: {
            id: beatmapId,
            artist: beatmap.metadata.artist,
            creator: beatmap.metadata.creator,
            title: beatmap.metadata.title,
            version: beatmap.metadata.version,
            maxCombo: beatmap.maxCombo,
            stats: {
                cs: beatmap.difficulty.cs,
                ar: beatmap.difficulty.ar!,
                od: beatmap.difficulty.od,
                hp: beatmap.difficulty.hp,
            },
            modifiedStats: {
                cs: modifiedStats.cs!,
                ar: modifiedStats.ar!,
                od: modifiedStats.od!,
                hp: modifiedStats.hp!,
            },
        },
        estimated: !Precision.almostEqualsNumber(
            accuracy / 100,
            realAcc.value(),
            1e-4
        ),
        difficulty: {
            droid: {
                aim: dpp.difficultyAttributes.aimDifficulty,
                speed: dpp.difficultyAttributes.tapDifficulty,
                rhythm: dpp.difficultyAttributes.rhythmDifficulty,
                flashlight: dpp.difficultyAttributes.flashlightDifficulty,
                visual: dpp.difficultyAttributes.visualDifficulty,
                total: dpp.difficultyAttributes.starRating,
            },
            osu: {
                aim: pp.difficultyAttributes.aimDifficulty,
                speed: pp.difficultyAttributes.speedDifficulty,
                rhythm: 0,
                flashlight: pp.difficultyAttributes.flashlightDifficulty,
                visual: 0,
                total: pp.difficultyAttributes.starRating,
            },
        },
        performance: {
            droid: {
                aim: dpp.aim,
                speed: dpp.tap,
                accuracy: dpp.accuracy,
                flashlight: dpp.flashlight,
                visual: dpp.visual,
                total: dpp.total,
            },
            osu: {
                aim: pp.aim,
                speed: pp.speed,
                accuracy: pp.accuracy,
                flashlight: pp.flashlight,
                visual: 0,
                total: pp.total,
            },
        },
        strainGraph: {
            droid: (
                await getStrainChart(
                    star.droid,
                    beatmap.metadata.beatmapSetId,
                    "#3884ff"
                )
            )?.toString("base64"),
            osu: (
                await getStrainChart(
                    star.osu,
                    beatmap.metadata.beatmapSetId,
                    "#38caff"
                )
            )?.toString("base64"),
        },
    };

    res.json(response);
});

export default router;
