import express from "express";
import { Util } from "../../utils/Util";
import { DatabaseManager } from "../../database/DatabaseManager";

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

    playerInfo.pp.forEach(v => delete v.scoreID);

    const page: number = parseInt(req.url.split('page=')[1]);

    if (!isNaN(page)) {
        playerInfo.pp = playerInfo.pp.slice(5 * (page - 1), 5 + 5 * (page - 1));
    }

    const response = {
        ...playerInfo,
        pprank: await dbManager.getUserDPPRank(playerInfo.pptotal),
    };

    res.json(response);
});

export default router;
