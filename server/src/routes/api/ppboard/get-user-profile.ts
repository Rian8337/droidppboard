import express from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";

const router = express.Router();

router.use(Util.createRateLimit(5));

router.get<
    "/",
    unknown,
    unknown,
    unknown,
    Partial<{ uid: string; type: string }>
>("/", async (req, res) => {
    const uid = parseInt(req.query.uid ?? "");
    const reworkType = req.query.type ?? "overall";

    if (isNaN(uid)) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const playerInfo =
        await DatabaseManager.aliceDb.collections.prototypePP.getFromUid(
            uid,
            reworkType,
        );

    if (!playerInfo) {
        return res.status(404).json({ message: "Player not found!" });
    }

    const availableReworks =
        await DatabaseManager.aliceDb.collections.prototypePPType.get(
            {},
            { projection: { _id: 0, name: 1, type: 1 } },
        );

    const currentRework =
        await DatabaseManager.aliceDb.collections.prototypePPType.getOne(
            {
                type: reworkType,
            },
            { projection: { _id: 0 } },
        );

    const response = {
        reworks: availableReworks,
        currentRework: currentRework ?? undefined,
        data: playerInfo,
    };

    res.json(response);
});

export default router;
