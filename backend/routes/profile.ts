import express from "express";
import { join } from "path";
import { DatabaseManager } from "../database/DatabaseManager";
import { UserBind } from "../database/utils/elainaDb/UserBind";
import { Util } from "../utils/Util";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const renderPath: string = join(
        Util.getFrontendPath(),
        "render",
        "profile"
    );

    const uid: number = parseInt(req.url.split("uid=")[1]);

    if (isNaN(uid)) {
        return res.render(renderPath);
    }

    const bindInfo: UserBind | null =
        await DatabaseManager.elainaDb.collections.userBind.getFromUid(uid);

    if (!bindInfo) {
        return res.render(renderPath);
    }

    res.render(renderPath, {
        username: bindInfo.username,
        pprank: await DatabaseManager.elainaDb.collections.userBind.getUserDPPRank(
            bindInfo.pptotal
        ),
        playcount: bindInfo.playc,
        pptotal: bindInfo.pptotal,
        entries: bindInfo.ppToDisplay(),
    });
});

export default router;
