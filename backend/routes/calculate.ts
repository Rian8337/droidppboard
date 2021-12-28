import express from "express";
import { UploadedFile } from "express-fileupload";
import { Accuracy, Beatmap, DroidPerformanceCalculator, MapStars, MapStats, MathUtils, Mod, ModUtil, OsuPerformanceCalculator, Parser, Precision } from "osu-droid";
import { join } from "path";
import { Util } from "../utils/Util";

const router: express.Router = express.Router();

router.get("/", (_, res) => {
    res.render(join(Util.getFrontendPath(), "render", "calculate"));
});

router.post("/", async (req, res) => {
    const renderPath: string = join(
        Util.getFrontendPath(),
        "render",
        "calculate"
    );
    let osuFile: string = "";

    if (req.files) {
        const file: UploadedFile = <UploadedFile>req.files.beatmapfile;

        if (!file || !file.name.endsWith(".osu")) {
            return res.render(renderPath, {
                err: "Invalid file uploaded",
            });
        }

        osuFile = file.data.toString("utf-8");
    }

    let beatmapId: number | undefined;

    if (req.body.beatmaplink && !osuFile) {
        const a: string[] = req.body.beatmaplink.split("/");
        beatmapId = parseInt(a[a.length - 1]);

        if (beatmapId <= 0 || isNaN(beatmapId)) {
            return res.render(renderPath, {
                err: "Invalid beatmap ID",
            });
        }

        osuFile = await Util.downloadBeatmap(beatmapId);

        if (!osuFile) {
            return res.render(renderPath, {
                err: "Beatmap with specified beatmap ID is not available",
            });
        }
    }

    const mods: string = req.body.mods || "";
    const convertedMods: Mod[] = ModUtil.pcStringToMods(mods);
    const accuracy: number =
        MathUtils.clamp(parseFloat(req.body.accuracy), 0, 100) || 100;
    const miss: number = Math.max(0, parseInt(req.body.misses)) || 0;

    const stats: MapStats = new MapStats();

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

    const parser: Parser = new Parser().parse(osuFile);

    const star: MapStars = new MapStars().calculate({
        map: parser.map,
        mods: convertedMods,
        stats: stats,
    });

    if (star.pcStars.total === 0) {
        return res.render(renderPath, {
            err: "Invalid file uploaded or beatmap ID is invalid",
        });
    }

    const map: Beatmap = star.pcStars.map;
    const maxCombo = map.maxCombo;
    const combo: number =
        MathUtils.clamp(parseInt(req.body.combo), 0, maxCombo) || maxCombo;

    const realAcc: Accuracy = new Accuracy({
        percent: accuracy,
        nobjects: map.objects.length,
    });

    const dpp: DroidPerformanceCalculator =
        new DroidPerformanceCalculator().calculate({
            stars: star.droidStars,
            combo: combo,
            accPercent: realAcc,
            miss: miss,
            stats: stats,
        });

    const pp: OsuPerformanceCalculator =
        new OsuPerformanceCalculator().calculate({
            stars: star.pcStars,
            combo: combo,
            accPercent: realAcc,
            miss: miss,
            stats: stats,
        });

    res.render(renderPath, {
        beatmapId: beatmapId,
        mapdata: map,
        calcdata: {
            mods: convertedMods,
            accuracy: accuracy,
            combo: combo,
            misses: miss,
            speedmultiplier: stats.speedMultiplier,
            forcear: stats.ar,
            star: star,
            estimated: !Precision.almostEqualsNumber(
                accuracy / 100,
                realAcc.value(),
                1e-4
            ),
            pp: {
                droid: dpp,
                osu: pp,
            },
            straingraph: {
                droid: (
                    await star.droidStars.getStrainChart(undefined, "#3884ff")
                )?.toString("base64"),
                osu: (
                    await star.pcStars.getStrainChart(undefined, "#38caff")
                )?.toString("base64"),
            },
        },
        formdata: req.body,
    });
});

export default router;
