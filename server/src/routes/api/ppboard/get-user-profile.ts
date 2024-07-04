import { IInGamePP, IPrototypePP, IUserBind } from "app-structures";
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

    let playerInfo: IPrototypePP | IInGamePP | IUserBind | null = null;

    switch (true) {
        case Util.requestIsInGame(req):
            playerInfo =
                await DatabaseManager.aliceDb.collections.inGamePP.getFromUid(
                    uid,
                );
            break;
        case Util.requestIsPrototype(req):
            playerInfo =
                await DatabaseManager.aliceDb.collections.prototypePP.getFromUid(
                    uid,
                    reworkType,
                );
            break;
        default:
            playerInfo =
                await DatabaseManager.elainaDb.collections.userBind.getFromUid(
                    uid,
                );
    }

    if (!playerInfo) {
        return res.status(404).json({ message: "Player not found!" });
    }

    let ppRank = 0;

    switch (true) {
        case Util.requestIsInGame(req):
            ppRank =
                await DatabaseManager.aliceDb.collections.inGamePP.getUserDPPRank(
                    playerInfo.pptotal,
                );
            break;
        case Util.requestIsPrototype(req):
            ppRank =
                await DatabaseManager.aliceDb.collections.prototypePP.getUserDPPRank(
                    playerInfo.pptotal,
                    reworkType,
                );
            break;
        default:
            ppRank =
                await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank(
                    playerInfo.pptotal,
                );
    }

    let response: object = {
        ...playerInfo,
        pprank: ppRank,
    };

    if (Util.requestIsInGame(req) || Util.requestIsPrototype(req)) {
        Object.defineProperty(response, "prevpprank", {
            value: await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank(
                (<IPrototypePP | IInGamePP>playerInfo).prevpptotal,
            ),
            writable: true,
            configurable: true,
            enumerable: true,
        });
    }

    if (Util.requestIsPrototype(req)) {
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

        response = {
            reworks: availableReworks,
            currentRework: currentRework ?? undefined,
            data: response,
        };
    }

    res.json(response);
});

export default router;
