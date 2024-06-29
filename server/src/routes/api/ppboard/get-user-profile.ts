import { IInGamePP, IPrototypePP } from "app-structures";
import express from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";

const router = express.Router();

router.use(Util.createRateLimit(8));

router.get<
    "/",
    unknown,
    unknown,
    unknown,
    Partial<{ uid: string; type: string }>
>("/", async (req, res) => {
    const uid = parseInt(req.query.uid ?? "");
    const type = req.query.type ?? "overall";

    if (isNaN(uid)) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const dbManager = Util.requestIsInGame(req)
        ? DatabaseManager.aliceDb.collections.inGamePP
        : Util.requestIsPrototype(req)
          ? DatabaseManager.aliceDb.collections.prototypePP
          : DatabaseManager.elainaDb.collections.userBind;

    const playerInfo = await dbManager.getFromUid(uid);

    if (!playerInfo) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const response = {
        ...playerInfo,
        pprank: await dbManager.getUserDPPRank(playerInfo.pptotal, type),
    };

    if (Util.requestIsInGame(req) || Util.requestIsPrototype(req)) {
        Object.defineProperty(response, "prevpprank", {
            value: await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank(
                (<IPrototypePP | IInGamePP>playerInfo).prevpptotal,
            ),
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }

    res.json(response);
});

export default router;
