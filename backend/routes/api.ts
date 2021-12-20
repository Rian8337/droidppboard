import express from "express";
import rateLimit from "express-rate-limit";
import { DatabaseManager } from "../database/DatabaseManager";
import { DPPAPIKey } from "../database/utils/aliceDb/DPPAPIKey";
import { UserBind } from "../database/utils/elainaDb/UserBind";
import { PPEntry } from "../structures/PPEntry";

const router: express.Router = express.Router();

router.use(rateLimit({
    windowMs: 1000,
    max: 2,
}));

router.get("/getplayertop", async (req, res) => {
    const requestParams: string[] = req.url.split("?")[1]?.split("&") || [];

    if (requestParams.length !== 2) {
        return res.json({
            code: 400,
            error: "Please provide exactly 2 request parameters (uid and API key)."
        });
    }

    const key: string =
        requestParams
            .find((param) => param.startsWith("key="))
            ?.split("key=")[1] || "";

    if (!key) {
        return res.json({
            code: 400,
            error: "Please provide an API key."
        });
    }

    const uid: number = parseInt(
        requestParams
            .find((param) => param.startsWith("uid="))
            ?.split("uid=")[1] || "0"
    );

    if (!uid) {
        return res.json({
            code: 400,
            error: "Please provide a valid uid."
        });
    }

    const keyInfo: DPPAPIKey | null =
        await DatabaseManager.aliceDb.collections.dppAPIKey.getOne({
            key: key,
        });

    if (!keyInfo) {
        return res.send({
            code: 400,
            error: "Please provide a valid API key."
        });
    }

    const bindInfo: UserBind | null =
        await DatabaseManager.elainaDb.collections.userBind.getFromUid(uid);

    const responseObject = {
        code: 200,
        data: {},
    };

    if (!bindInfo) {
        return res.json(responseObject);
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

router.get("/getleaderboard", async (req, res) => {
    const requestParams: string[] = req.url.split("?")[1]?.split("&") || [];

    const key: string =
        requestParams
            .find((param) => param.startsWith("key="))
            ?.split("key=")[1] || "";

    if (!key) {
        return res.json({
            code: 400,
            error: "Please provide an API key."
        });
    }

    const keyInfo: DPPAPIKey | null =
        await DatabaseManager.aliceDb.collections.dppAPIKey.getOne({
            key: key,
        });

    if (!keyInfo) {
        return res.json({
            code: 400,
            error: "Please provide a valid API key."
        });
    }

    const page: number = Math.max(
        1,
        parseInt(requestParams.find(v => v.startsWith("page="))?.split("=")[1] || "1")
    );

    if (isNaN(page)) {
        return res.json({
            code: 400,
            error: "Please provide a valid page."
        });
    }

    const searchQuery: string = requestParams.find(v => v.startsWith("query="))?.split("=")[1] ?? "";

    const result: UserBind[] =
        await DatabaseManager.elainaDb.collections.userBind.searchPlayers(
            page,
            searchQuery
        );

    const responseObject = {
        code: 200,
        data: result
    };

    res.json(responseObject);
});

export default router;
