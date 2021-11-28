import express from "express";
import { Util } from "../Util";
import { Accuracy, Beatmap, DroidPerformanceCalculator, MapStars, MapStats, MathUtils, Mod, ModUtil, OsuPerformanceCalculator, RebalanceDroidPerformanceCalculator, RebalanceMapStars, RebalanceOsuPerformanceCalculator } from "osu-droid";
import { ICalculationResult } from "app-structures";
import { Precision } from "osu-droid/src/utils/Precision";
import { ReadStream } from "fs";

const router: express.Router = express.Router();

router.use(Util.createRateLimit(2));

router.post("/", async (req, res) => {
    let osuFile: string = "";

    //@ts-expect-error: Bad typings
    if (Object.keys(req.files).length > 0) {
        //@ts-expect-error: Bad typings
        const file: ReadStream = req.files.beatmapfile;

        if (!(file.path instanceof Buffer ? file.path.toString("utf-8") : file.path).endsWith(".osu")) {
            return res.status(406).json({ message: "Invalid file uploaded" });
        }

        osuFile = await Util.readFile(file);
    }

    let beatmapId: number | undefined;

    if (req.body.beatmaplink && !osuFile) {
        const a: string[] = req.body.beatmaplink.split("/");
        beatmapId = parseInt(a.at(-1)!);

        if (beatmapId <= 0 || isNaN(beatmapId)) {
            return res.status(406).json({ message: "Invalid beatmap ID" });
        }

        osuFile = await Util.downloadBeatmap(beatmapId);
    }

    if (!osuFile) {
        return res.status(406).json({ message: "Please enter a valid beatmap file, link or ID" });
    }

    const mods: string = req.body.mods || "";
    const convertedMods: Mod[] = ModUtil.pcStringToMods(mods);
    const accuracy: number = MathUtils.clamp(parseFloat(req.body.accuracy), 0, 100) || 100;
    const miss: number = Math.max(0, parseInt(req.body.misses)) || 0;

    const stats: MapStats = new MapStats();

    if (req.body.speedmultiplier) {
        stats.speedMultiplier = MathUtils.clamp(parseFloat(req.body.speedmultiplier) || 1, 0.5, 2);
    }

    if (req.body.forcear) {
        stats.ar = MathUtils.clamp(parseFloat(req.body.forcear), 0, 12.5);
        stats.isForceAR = !isNaN(stats.ar);
    }

    const isPrototype: boolean = Util.requestIsPrototype(req);

    const star = (isPrototype ? new RebalanceMapStars() : new MapStars()).calculate({
        file: osuFile,
        mods: convertedMods,
        stats: stats
    });

    if (star.pcStars.total === 0) {
        return res.status(406).json({ message: "Invalid file uploaded or beatmap ID is invalid" });
    }

    const map: Beatmap = star.pcStars.map;
    const maxCombo = map.maxCombo;
    const combo: number = MathUtils.clamp(parseInt(req.body.combo), 0, maxCombo) || maxCombo;

    const modifiedStats: MapStats = new MapStats({
        cs: map.cs,
        ar: stats.ar ?? map.ar,
        od: map.od,
        hp: map.hp,
        mods: convertedMods,
        speedMultiplier: stats.speedMultiplier,
        isForceAR: stats.isForceAR
    }).calculate();

    const realAcc: Accuracy = new Accuracy({
        percent: accuracy,
        nobjects: map.objects.length
    });

    const dpp = (isPrototype ? new RebalanceDroidPerformanceCalculator() : new DroidPerformanceCalculator()).calculate({
        //@ts-expect-error: Type checking is wack here
        stars: star.droidStars,
        combo: combo,
        accPercent: realAcc,
        miss: miss,
        stats: stats
    });

    const pp = (isPrototype ? new RebalanceOsuPerformanceCalculator() : new OsuPerformanceCalculator()).calculate({
        //@ts-expect-error: Type checking is wack here
        stars: star.pcStars,
        combo: combo,
        accPercent: realAcc,
        miss: miss,
        stats: stats
    });

    const response: ICalculationResult = {
        beatmap: {
            id: beatmapId,
            artist: map.artist,
            creator: map.creator,
            title: map.title,
            version: map.version,
            maxCombo: map.maxCombo,
            stats: {
                cs: map.cs,
                ar: map.ar!,
                od: map.od,
                hp: map.hp
            },
            modifiedStats: {
                cs: modifiedStats.cs!,
                ar: modifiedStats.ar!,
                od: modifiedStats.od!,
                hp: modifiedStats.hp!,
            }
        },
        estimated: !Precision.almostEqualsNumber(accuracy / 100, realAcc.value(), 1e-4),
        difficulty: {
            droid: {
                aim: dpp.stars.aim,
                speed: dpp.stars.tap,
                flashlight: dpp.stars.flashlight,
                total: dpp.stars.total
            },
            osu: {
                aim: pp.stars.aim,
                speed: pp.stars.speed,
                flashlight: pp.stars.flashlight,
                total: pp.stars.total
            },
        },
        performance: {
            droid: {
                aim: dpp.aim,
                speed: dpp.tap,
                accuracy: dpp.accuracy,
                flashlight: dpp.flashlight,
                total: dpp.total
            },
            osu: {
                aim: pp.aim,
                speed: pp.speed,
                accuracy: pp.accuracy,
                flashlight: pp.flashlight,
                total: pp.total
            }
        },
        strainGraph: {
            droid: (await star.droidStars.getStrainChart(undefined, "#3884ff"))?.toString("base64"),
            osu: (await star.pcStars.getStrainChart(undefined, "#38caff"))?.toString("base64")
        }
    }

    res.json(response);
});

export default router;