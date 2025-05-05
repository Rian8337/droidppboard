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
import { CompleteCalculationAttributes } from "../../../structures/difficultyattributes/CompleteCalculationAttributes";
import { DroidPerformanceAttributes } from "../../../structures/difficultyattributes/DroidPerformanceAttributes";
import { RebalanceDroidPerformanceAttributes } from "../../../structures/difficultyattributes/RebalanceDroidPerformanceAttributes";
import { OsuPerformanceAttributes } from "../../../structures/difficultyattributes/OsuPerformanceAttributes";
import { DPPProcessorCalculationResponse } from "../../../structures/difficultyattributes/DPPProcessorCalculationResponse";

const router = Router();

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
        Modes.droid,
        mods,
        true,
    );

    const formData = new FormData();
    formData.set("file", new Blob([osuFile]));
    formData.set("key", process.env.DROID_SERVER_INTERNAL_KEY!);
    formData.set("gamemode", Modes.droid);
    formData.set("calculationmethod", isPrototype ? "1" : "0");
    formData.set("mods", JSON.stringify(mods.serializeMods()));

    if (req.body.generatestrainchart) {
        formData.set("generatestrainchart", "1");
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
        "http://localhost:3006/api/dpp/processor/calculate-beatmap-file",
    );

    const droidAttribs: DPPProcessorCalculationResponse<
        CompleteCalculationAttributes<
            DroidDifficultyAttributes | RebalanceDroidDifficultyAttributes,
            DroidPerformanceAttributes | RebalanceDroidPerformanceAttributes
        >
    > | null = await fetch(url, { method: "POST", body: formData })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

    if (!droidAttribs) {
        return res.status(400).json({
            message: "Could not contact the processing server",
        });
    }

    formData.set("gamemode", Modes.osu);

    const osuAttribs: DPPProcessorCalculationResponse<
        CompleteCalculationAttributes<
            OsuDifficultyAttributes | RebalanceOsuDifficultyAttributes,
            OsuPerformanceAttributes
        >
    > | null = await fetch(url, { method: "POST", body: formData })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

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
                ar: parsedBeatmap.difficulty.ar!,
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
                aim: droidAttribs.attributes.difficulty.aimDifficulty,
                speed: droidAttribs.attributes.difficulty.tapDifficulty,
                rhythm: droidAttribs.attributes.difficulty.rhythmDifficulty,
                flashlight:
                    droidAttribs.attributes.difficulty.flashlightDifficulty,
                visual: droidAttribs.attributes.difficulty.visualDifficulty,
                total: droidAttribs.attributes.difficulty.starRating,
            },
            osu: {
                aim: osuAttribs.attributes.difficulty.aimDifficulty,
                speed: osuAttribs.attributes.difficulty.speedDifficulty,
                rhythm: 0,
                flashlight:
                    osuAttribs.attributes.difficulty.flashlightDifficulty,
                visual: 0,
                total: osuAttribs.attributes.difficulty.starRating,
            },
        },
        performance: {
            droid: {
                aim: droidAttribs.attributes.performance.aim,
                speed: droidAttribs.attributes.performance.tap,
                accuracy: droidAttribs.attributes.performance.accuracy,
                flashlight: droidAttribs.attributes.performance.flashlight,
                visual: droidAttribs.attributes.performance.visual,
                total: droidAttribs.attributes.performance.total,
            },
            osu: {
                aim: osuAttribs.attributes.performance.aim,
                speed: osuAttribs.attributes.performance.speed,
                accuracy: osuAttribs.attributes.performance.accuracy,
                flashlight: osuAttribs.attributes.performance.flashlight,
                visual: 0,
                total: osuAttribs.attributes.performance.total,
            },
        },
        strainGraph: {
            droid: droidAttribs.strainChart,
            osu: osuAttribs.strainChart,
        },
    };

    res.json(response);
});

export default router;
