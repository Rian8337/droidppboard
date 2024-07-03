import express from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";
import { IPrototypePP, PrototypeLeaderboardResponse } from "app-structures";

const router = express.Router();

router.use(Util.createRateLimit(8));

router.get<
    "/",
    unknown,
    unknown,
    unknown,
    Partial<{
        page: string;
        reworkType: string;
        query: string;
        type: string;
    }>
>("/", async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || "1") || 1);
    const searchQuery = req.query.query ?? "";

    if (Util.requestIsInGame(req)) {
        return res.json(
            await DatabaseManager.aliceDb.collections.inGamePP.searchPlayers(
                page,
                searchQuery,
            ),
        );
    }

    if (Util.requestIsPrototype(req)) {
        const type = req.query.type ?? "overall";
        const availableReworks =
            await DatabaseManager.aliceDb.collections.prototypePPType.get(
                {},
                { projection: { _id: 0 } },
            );

        const response: PrototypeLeaderboardResponse<IPrototypePP> = {
            reworks: availableReworks,
            currentRework: availableReworks.find(
                (rework) => rework.type === type,
            ),
            data: await DatabaseManager.aliceDb.collections.prototypePP.searchPlayers(
                page,
                type,
                searchQuery,
            ),
        };

        return res.json(response);
    }

    res.json(
        await DatabaseManager.elainaDb.collections.userBind.searchPlayers(
            page,
            searchQuery,
        ),
    );
});

export default router;
