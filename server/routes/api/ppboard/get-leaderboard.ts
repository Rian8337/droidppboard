import express from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const page = Math.max(1, parseInt(req.url.split("page=")[1]) || 1);
    const searchQuery = req.url.split("query=")[1];

    let dbManager;

    switch (true) {
        case Util.requestIsPrototype(req):
            dbManager = DatabaseManager.aliceDb.collections.prototypePP;
            break;
        case Util.requestIsOld(req):
            dbManager = DatabaseManager.aliceDb.collections.playerOldPPProfile;
            break;
        default:
            dbManager = DatabaseManager.elainaDb.collections.userBind;
    }

    res.json(await dbManager.searchPlayers(page, searchQuery));
});

export default router;
