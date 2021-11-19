import express from "express";
import { UploadedFile } from "express-fileupload";
import { join } from "path";
import { DatabaseManager } from "../database/DatabaseManager";
import { PrototypePP } from "../database/utils/aliceDb/PrototypePP";
import { Beatmap } from "../modules/beatmap/Beatmap";
import { MathUtils } from "../modules/mathutil/MathUtils";
import { Mod } from "../modules/mods/Mod";
import { DroidPerformanceCalculator } from "../modules/rebaldifficulty/DroidPerformanceCalculator";
import { OsuPerformanceCalculator } from "../modules/rebaldifficulty/OsuPerformanceCalculator";
import { RebalanceMapStars as MapStars } from "../modules/tools/RebalanceMapStars";
import { Accuracy } from "../modules/utils/Accuracy";
import { MapStats } from "../modules/utils/MapStats";
import { ModUtil } from "../modules/utils/ModUtil";
import { Precision } from "../modules/utils/Precision";
import { Util } from "../utils/Util";

const router: express.Router = express.Router();

router.get(["/", "/leaderboard"], async (req, res) => {
    const page: number = Math.max(1, parseInt(req.url.split('?page=')[1]) || 1);
    const searchQuery: string = req.url.split('?query=')[1];

    const result: PrototypePP[] = await DatabaseManager.aliceDb.collections.prototypePP.searchPlayers(page, searchQuery);

    res.render(
        join(Util.getFrontendPath(), "render", "prototype", "prototype-leaderboard"),
        {
            list: result,
            page: page,
            query: Util.convertURI(searchQuery ?? "")
        }
    );
});

router.get("/profile", async (req, res) => {
    const renderPath: string = join(Util.getFrontendPath(), "render", "prototype", "profile");

    const uid: number = parseInt(req.url.split('uid=')[1]);

    if (isNaN(uid)) {
        return res.render(renderPath);
    }

    const playerInfo: PrototypePP | null = await DatabaseManager.aliceDb.collections.prototypePP.getFromUid(uid);

    if (!playerInfo) {
        return res.render(renderPath);
    }

    res.render(
        renderPath,
        {
            username: playerInfo.username,
            pprank: await DatabaseManager.aliceDb.collections.prototypePP.getUserDPPRank(playerInfo.pptotal),
            prevpprank: await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank(playerInfo.prevpptotal),
            pptotal: playerInfo.pptotal,
            prevpptotal: playerInfo.prevpptotal,
            entries: playerInfo.ppToDisplay()
        }
    );
});

router.get("/top-plays", (req, res) => {
    const mod: string = req.url.split("?mods=")[1] || "";

    const droidMod: string = mod.toLowerCase() !== "nm" ? ModUtil.pcStringToMods(mod).map(v => v.droidString).sort((a, b) => a.localeCompare(b)).join("") || "" : "-";

    res.render(
        join(Util.getFrontendPath(), "render", "prototype", "top-plays"),
        {
            entries: Util.topPrototypePPList.get(droidMod) ?? [],
            mods: Util.convertURI(mod).toUpperCase()
        }
    );
});

router.get("/calculate", (_, res) => {
    res.render(join(Util.getFrontendPath(), "render", "prototype", "calculate"));
});

router.post("/calculate", async (req, res) => {
    const renderPath: string = join(Util.getFrontendPath(), "render", "prototype", "calculate");
    let osuFile: string = "";

    if (req.files) {
        const file: UploadedFile = <UploadedFile> req.files.beatmapfile;

        if (!file || !file.name.endsWith(".osu")) {
            return res.render(renderPath, {
                err: "Invalid file uploaded"
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
                err: "Invalid beatmap ID"
            });
        }

        osuFile = await Util.downloadBeatmap(beatmapId);

        if (!osuFile) {
            return res.render(renderPath, {
                err: "Beatmap with specified beatmap ID is not available"
            });
        }
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

    const star: MapStars = new MapStars().calculate({
        file: osuFile,
        mods: convertedMods,
        stats: stats
    });

    if (star.pcStars.total === 0) {
        return res.render(renderPath, {
            err: "Invalid file uploaded or beatmap ID is invalid"
        });
    }

    const map: Beatmap = star.pcStars.map;
    const maxCombo = map.maxCombo;
    const combo: number = MathUtils.clamp(parseInt(req.body.combo), 0, maxCombo) || maxCombo;

    const realAcc: Accuracy = new Accuracy({
        percent: accuracy,
        nobjects: map.objects.length
    });

    const dpp: DroidPerformanceCalculator = new DroidPerformanceCalculator().calculate({
        stars: star.droidStars,
        combo: combo,
        accPercent: realAcc,
        miss: miss,
        stats: stats
    });

    const pp: OsuPerformanceCalculator = new OsuPerformanceCalculator().calculate({
        stars: star.pcStars,
        combo: combo,
        accPercent: realAcc,
        miss: miss,
        stats: stats
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
            estimated: !Precision.almostEqualsNumber(accuracy / 100, realAcc.value(), 1e-4),
            pp: {
                droid: dpp,
                osu: pp
            },
            straingraph: {
                droid: (await star.droidStars.getStrainChart(undefined, "#3884ff"))?.toString("base64"),
                osu: (await star.pcStars.getStrainChart(undefined, "#38caff"))?.toString("base64")
            }
        },
        formdata: req.body
    });
});

export default router;