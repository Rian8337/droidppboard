import express from "express";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../../../utils/Util";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import {
    PrototypeLeaderboardResponse,
    TopPrototypePPEntry,
} from "app-structures";

const router = express.Router();

router.use(Util.createRateLimit(8));

router.get<
    "/",
    unknown,
    unknown,
    unknown,
    Partial<{ mods: string; type: string }>
>("/", async (req, res) => {
    const mod = req.query.mods ?? "";
    const type = req.query.type ?? "overall";

    const droidMod =
        mod.toLowerCase() !== "nm"
            ? [
                  ...ModUtil.pcStringToMods(mod).reduce((a, v) => {
                      if (!v.isApplicableToDroid()) {
                          return a;
                      }

                      return a + v.droidString;
                  }, ""),
              ]
                  .sort((a, b) => a.localeCompare(b))
                  .join("") || ""
            : "-";

    if (Util.requestIsInGame(req)) {
        return res.json(Util.topInGamePPList.get(droidMod) ?? []);
    }

    if (Util.requestIsPrototype(req)) {
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
            data: Util.topPrototypePPList.get(type)?.get(droidMod) ?? [],
        };

        return res.json(response);
    }

    res.json(Util.topPPList.get(droidMod) ?? []);
});

export default router;
