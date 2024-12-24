import express from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";
import { IPrototypePP, PrototypeLeaderboardResponse } from "app-structures";

const router = express.Router();

router.use(Util.createRateLimit(5));

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

    const type = req.query.type ?? "overall";
    const availableReworks =
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

    const response: PrototypeLeaderboardResponse<IPrototypePP> = {
        reworks: availableReworks,
        currentRework: currentRework ?? undefined,
        data: await DatabaseManager.aliceDb.collections.prototypePP.searchPlayers(
            page,
            type,
            searchQuery,
        ),
    };

    res.json(response);
});

export default router;
