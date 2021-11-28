import express from "express";
import { DatabaseManager, DatabasePrototypePP } from "app-database";
import { Util } from "../Util";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const uid: number = parseInt(req.url.split('uid=')[1]);

    if (isNaN(uid)) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const isPrototype: boolean = Util.requestIsPrototype(req);

    const dbManager = isPrototype ? DatabaseManager.aliceDb.collections.prototypePP : DatabaseManager.elainaDb.collections.userBind;

    const playerInfo = await dbManager.getFromUid(uid);

    if (!playerInfo) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const response = {
        ...playerInfo,
        pprank: await dbManager.getUserDPPRank(playerInfo.pptotal),
    };

    if (isPrototype) {
        Object.defineProperty(
            response,
            "prevpprank",
            {
                value: await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank((<DatabasePrototypePP>playerInfo).prevpptotal),
                writable: true,
                configurable: true,
                enumerable: true
            }
        );
    }

    res.json(response);
});

export default router;