import express from "express";
import { join } from "path";
import { Util } from "../utils/Util";
import { UserBind } from "../../backend/database/utils/elainaDb/UserBind";
import { DatabaseManager } from "../database/DatabaseManager";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const page: number = Math.max(1, parseInt(req.url.split("?page=")[1]) || 1);
    const searchQuery: string = req.url.split("?query=")[1];

    const result: UserBind[] =
        await DatabaseManager.elainaDb.collections.userBind.searchPlayers(
            page,
            searchQuery
        );

    res.render(join(Util.getFrontendPath(), "render", "leaderboard"), {
        list: result,
        page: page,
        query: Util.convertURI(searchQuery ?? ""),
    });
});

export default router;
