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

    const convertedMods =
        mod.length > 0 && mod.toLowerCase() !== "nm"
            ? ModUtil.pcStringToMods(mod)
            : undefined;

    const reworks =
        await DatabaseManager.aliceDb.collections.prototypePPType.get(
            {},
            { projection: { _id: 0, name: 1, type: 1 } },
        );

    const response: PrototypeLeaderboardResponse<TopPrototypePPEntry> = {
        reworks: reworks,
        currentRework: reworks.find((r) => r.type === type),
        data: Util.getTopPrototypePP(type, convertedMods) ?? [],
    };

    res.json(response);
});

export default router;
