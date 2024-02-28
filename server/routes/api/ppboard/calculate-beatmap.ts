import { Router } from "express";
import { Util } from "../../../utils/Util";
import { ICalculationResult } from "app-structures";
import {
    Accuracy,
    BeatmapDecoder,
    DifficultyStatisticsCalculatorOptions,
    MathUtils,
    Mod,
    ModDifficultyAdjust,
    ModUtil,
    Modes,
    calculateOsuDifficultyStatistics,
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
import { CompleteCalculationAttributes } from "../../../structures/difficultyattributes/CompleteCalculationAttributes";
import { DroidPerformanceAttributes } from "../../../structures/difficultyattributes/DroidPerformanceAttributes";
import { RebalanceDroidPerformanceAttributes } from "../../../structures/difficultyattributes/RebalanceDroidPerformanceAttributes";
import { OsuPerformanceAttributes } from "../../../structures/difficultyattributes/OsuPerformanceAttributes";

const router = Router();

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

    let difficultyAdjustMod: ModDifficultyAdjust | undefined;

    if (
        [req.body.forcecs, req.body.forcear, req.body.forceod].some(
            (v) => v !== undefined,
        )
    ) {
        difficultyAdjustMod = new ModDifficultyAdjust({
            cs: MathUtils.clamp(parseFloat(req.body.forcecs), 0, 15),
            ar: MathUtils.clamp(parseFloat(req.body.forcear), 0, 12.5),
            od: MathUtils.clamp(parseFloat(req.body.forceod), 0, 12.5),
        });

        mods.push(difficultyAdjustMod);
    }

    const isPrototype = Util.requestIsPrototype(req);
    const parsedBeatmap = new BeatmapDecoder().decode(osuFile).result;

    const { maxCombo } = parsedBeatmap;
    const combo =
        MathUtils.clamp(parseInt(req.body.combo), 0, maxCombo) || maxCombo;

    const difficultyStatisticsOptions: DifficultyStatisticsCalculatorOptions<
        number,
        number,
        number,
        number,
        Mod[],
        number
    > = {
        circleSize: parsedBeatmap.difficulty.cs,
        approachRate:
            parsedBeatmap.difficulty.ar ?? parsedBeatmap.difficulty.od,
        overallDifficulty: parsedBeatmap.difficulty.od,
        healthDrain: parsedBeatmap.difficulty.hp,
        mods: mods,
        customSpeedMultiplier: MathUtils.clamp(
            parseFloat(req.body.speedmultiplier) || 1,
            0.5,
            2,
        ),
    };

    const formData = new FormData();
    formData.set("file", new Blob([osuFile]));
    formData.set("key", process.env.DROID_SERVER_INTERNAL_KEY!);
    formData.set("gamemode", Modes.droid);
    formData.set("calculationmethod", isPrototype ? "1" : "0");
    formData.set(
        "mods",
        mods.reduce((a, v) => a + v.acronym, ""),
    );
    formData.set(
        "customspeedmultiplier",
        difficultyStatisticsOptions.customSpeedMultiplier.toString(),
    );

    if (difficultyAdjustMod?.cs !== undefined) {
        formData.set("forcecs", difficultyAdjustMod.cs.toString());
    }
    if (difficultyAdjustMod?.ar !== undefined) {
        formData.set("forcear", difficultyAdjustMod.ar.toString());
    }
    if (difficultyAdjustMod?.od !== undefined) {
        formData.set("forceod", difficultyAdjustMod.od.toString());
    }

    const realAcc = new Accuracy({
        percent: accuracy,
        nobjects: parsedBeatmap.hitObjects.objects.length,
        nmiss: miss,
    });

    formData.set("n300", realAcc.n300.toString());
    formData.set("n100", realAcc.n100.toString());
    formData.set("n50", realAcc.n50.toString());
    formData.set("nmiss", realAcc.nmiss.toString());
    formData.set("maxcombo", combo.toString());

    const url = new URL(
        "https://droidpp.osudroid.moe/api/dpp/processor/calculate-beatmap-file",
    );

    const droidAttribs: CompleteCalculationAttributes<
        DroidDifficultyAttributes | RebalanceDroidDifficultyAttributes,
        DroidPerformanceAttributes | RebalanceDroidPerformanceAttributes
    > | null = await fetch(url, { method: "POST", body: formData })
        .then((res) => {
            if (!res.ok) {
                return null;
            }

            return res.json();
        })
        .catch(() => null);

    if (!droidAttribs) {
        return res.status(400).json({
            message: "Could not contact the processing server",
        });
    }

    formData.set("gamemode", Modes.osu);

    const osuAttribs: CompleteCalculationAttributes<
        OsuDifficultyAttributes | RebalanceOsuDifficultyAttributes,
        OsuPerformanceAttributes
    > | null = await fetch(url, { method: "POST", body: formData })
        .then((res) => {
            if (!res.ok) {
                return null;
            }

            return res.json();
        })
        .catch(() => null);

    if (!osuAttribs) {
        return res.status(400).json({
            message: "Could not contact the processing server",
        });
    }

    const difficultyStatistics = calculateOsuDifficultyStatistics(
        difficultyStatisticsOptions,
    );

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
                ar: parsedBeatmap.difficulty.ar!,
                od: parsedBeatmap.difficulty.od,
                hp: parsedBeatmap.difficulty.hp,
            },
            modifiedStats: {
                cs: difficultyStatistics.circleSize,
                ar: difficultyStatistics.approachRate,
                od: difficultyStatistics.overallDifficulty,
                hp: difficultyStatistics.healthDrain,
            },
        },
        difficulty: {
            droid: {
                aim: droidAttribs.difficulty.aimDifficulty,
                speed: droidAttribs.difficulty.tapDifficulty,
                rhythm: droidAttribs.difficulty.rhythmDifficulty,
                flashlight: droidAttribs.difficulty.flashlightDifficulty,
                visual: droidAttribs.difficulty.visualDifficulty,
                total: droidAttribs.difficulty.starRating,
            },
            osu: {
                aim: osuAttribs.difficulty.aimDifficulty,
                speed: osuAttribs.difficulty.speedDifficulty,
                rhythm: 0,
                flashlight: osuAttribs.difficulty.flashlightDifficulty,
                visual: 0,
                total: osuAttribs.difficulty.starRating,
            },
        },
        performance: {
            droid: {
                aim: droidAttribs.performance.aim,
                speed: droidAttribs.performance.tap,
                accuracy: droidAttribs.performance.accuracy,
                flashlight: droidAttribs.performance.flashlight,
                visual: droidAttribs.performance.visual,
                total: droidAttribs.performance.total,
            },
            osu: {
                aim: osuAttribs.performance.aim,
                speed: osuAttribs.performance.speed,
                accuracy: osuAttribs.performance.accuracy,
                flashlight: osuAttribs.performance.flashlight,
                visual: 0,
                total: osuAttribs.performance.total,
            },
        },
    };

    res.json(response);
});

export default router;
