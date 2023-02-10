import { Router } from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";

const router = Router();

router.get("/", async (req, res) => {
    const page = Math.max(1, parseInt(req.url.split("page=")[1]) || 1);
    const searchQuery = req.url.split("query=")[1];

    res.json(
        await DatabaseManager.aliceDb.collections.playerSkins.searchSkins(
            page,
            searchQuery
        )
    );
});

export default router;
