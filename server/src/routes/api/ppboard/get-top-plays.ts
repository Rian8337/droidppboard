import express from "express";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../../../utils/Util";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import {
    PrototypeLeaderboardResponse,
    TopPrototypePPEntry,
} from "app-structures";

const router = express.Router();

router.use(Util.createRateLimit(5));

router.get<
    "/",
    unknown,
    unknown,
    unknown,
    Partial<{ mods: string; type: string }>
>("/", async (req, res) => {
    const mod = req.query.mods ?? "";
    const type = req.query.type ?? "overall";

    const convertedMods = ModUtil.pcStringToMods(
        mod.toLowerCase() !== "nm" ? mod : "",
    );
    const droidMods: string[] = [];

    for (const mod of convertedMods.values()) {
        if (mod.isApplicableToDroid()) {
            droidMods.push(mod.acronym);
        }
    }

    const modString =
        droidMods.sort((a, b) => a.localeCompare(b)).join("") || "-";

    const reworks =
        await DatabaseManager.aliceDb.collections.prototypePPType.get(
            {},
            { projection: { _id: 0, name: 1, type: 1 } },
        );
    const currentRework =
        await DatabaseManager.aliceDb.collections.prototypePPType.getOne(
            {
                type: type,
            },
            { projection: { _id: 0 } },
        );

    const response: PrototypeLeaderboardResponse<TopPrototypePPEntry> = {
        reworks: reworks,
        currentRework: currentRework ?? undefined,
        data: Util.topPrototypePPList.get(type)?.get(modString) ?? [],
    };

    res.json(response);
});

export default router;
