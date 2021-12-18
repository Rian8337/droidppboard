import express from "express";
import { DatabaseManager } from "../database/DatabaseManager";
import { DPPAPIKey } from "../database/utils/aliceDb/DPPAPIKey";
import { UserBind } from "../database/utils/elainaDb/UserBind";
import { PPEntry } from "../structures/PPEntry";

const router: express.Router = express.Router();

router.get("/getplayertop", async (req, res) => {
    const requestParams: string[] = req.url.split("?")[1]?.split("&") || [];

    if (requestParams.length !== 2) {
        return res.send(
            `{"code": 400, "error": "Please provide exactly 2 request parameters (uid and API key)."}`
        );
    }

    const key: string =
        requestParams
            .find((param) => param.startsWith("key="))
            ?.split("key=")[1] || "";

    if (!key) {
        return res.send(`{"code": 400, "error": "Please provide an API key."}`);
    }

    const uid: number = parseInt(
        requestParams
            .find((param) => param.startsWith("uid="))
            ?.split("uid=")[1] || "0"
    );

    if (!uid) {
        return res.send(
            `{"code": 400, "error": "Please provide a valid uid."}`
        );
    }

    const keyInfo: DPPAPIKey | null =
        await DatabaseManager.aliceDb.collections.dppAPIKey.getOne({
            key: key,
        });

    if (!keyInfo) {
        return res.send(
            `{"code": 400, "error": "Please provide a valid API key."}`
        );
    }

    const bindInfo: UserBind | null =
        await DatabaseManager.elainaDb.collections.userBind.getFromUid(uid);

    const responseObject = {
        code: 200,
        data: {},
    };

    if (!bindInfo) {
        return res.send(JSON.stringify(responseObject));
    }

    const ppList: PPEntry[] = bindInfo.pp;

    ppList.forEach((v) => delete v.scoreID);

    responseObject.data = {
        uid: bindInfo.uid,
        username: bindInfo.username,
        pp: {
            total: bindInfo.pptotal,
            list: ppList,
        },
    };

    res.send(JSON.stringify(responseObject).replace(/[<>]/g, ""));
});

export default router;
