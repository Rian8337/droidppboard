import express from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";
import { resolveVisibleVariant } from "../../../utils/visibleVariant";
import { IPrototypePP, PrototypeLeaderboardResponse } from "app-structures";

const router = express.Router();

router.use(Util.createRateLimit(5));

router.get(
    "/",
    asyncHandler(async (req, res) => {
        // What a person can see depends on who they are.
        res.set("Cache-Control", "no-store");

        // Query parameters can be parsed into arrays or objects, so their types have to be checked.
        const { page: pageQuery, query, type } = req.query;
        const page = Math.max(
            1,
            parseInt(typeof pageQuery === "string" ? pageQuery : "1") || 1,
        );
        const searchQuery = typeof query === "string" ? query : "";

        const uid: unknown = res.locals.uid;
        const resolved = await resolveVisibleVariant(
            typeof type === "string" ? type : undefined,
            typeof uid === "number" ? uid : undefined,
        );

        if (resolved === "notFound") {
            res.status(404).json({ message: "Variant not found" });

            return;
        }

        if (resolved === "unavailable") {
            res.status(503).json({
                message: "The variant list is unavailable",
            });

            return;
        }

        const response: PrototypeLeaderboardResponse<IPrototypePP[]> = {
            variants: resolved.variants,
            currentVariant: resolved.current,
            data: await DatabaseManager.aliceDb.collections.prototypePP.searchPlayers(
                page,
                resolved.current.name,
                searchQuery,
            ),
        };

        res.json(response);
    }),
);

export default router;
