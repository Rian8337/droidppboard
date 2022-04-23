import { IPrototypePP } from "app-structures";
import express from "express";
import { DatabaseManager } from "../database/managers/DatabaseManager";
import { Util } from "../Util";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const uid = parseInt(req.url.split("uid=")[1]);

    if (isNaN(uid)) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const isPrototype = Util.requestIsPrototype(req);

    const dbManager = isPrototype
        ? DatabaseManager.aliceDb.collections.prototypePP
        : DatabaseManager.elainaDb.collections.userBind;

    const playerInfo = await dbManager.getFromUid(uid);

    if (!playerInfo) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const response = {
        ...playerInfo,
        pprank: await dbManager.getUserDPPRank(playerInfo.pptotal),
    };

    if (isPrototype) {
        Object.defineProperty(response, "prevpprank", {
            value: await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank(
                (<IPrototypePP>playerInfo).prevpptotal
            ),
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }

    res.json(response);
});

export default router;
