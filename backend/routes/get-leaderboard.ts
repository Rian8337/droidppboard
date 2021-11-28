import express from "express";
import { DatabaseManager } from "app-database";
import { Util } from "../Util";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const page: number = Math.max(1, parseInt(req.url.split('page=')[1]) || 1);
    const searchQuery: string = req.url.split('query=')[1];

    res.json(
        await (Util.requestIsPrototype(req) ? DatabaseManager.aliceDb.collections.prototypePP : DatabaseManager.elainaDb.collections.userBind).searchPlayers(page, searchQuery)
    );
});

export default router;