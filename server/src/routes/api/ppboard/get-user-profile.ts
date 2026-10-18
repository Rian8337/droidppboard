import express from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";
import { resolveVisibleVariant } from "../../../utils/visibleVariant";
import { readCountries } from "../../../utils/readCountries";
import { PrototypeLeaderboardResponse, PrototypePlayer } from "app-structures";

const router = express.Router();

router.use(Util.createRateLimit(5));

router.get(
    "/",
    asyncHandler(async (req, res) => {
        // What a person can see depends on who they are.
        res.set("Cache-Control", "no-store");

        // Query parameters can be parsed into arrays or objects, so their types have to be checked.
        const { uid: uidQuery, type } = req.query;
        const uid = parseInt(typeof uidQuery === "string" ? uidQuery : "");

        if (isNaN(uid)) {
            res.status(404).json({ message: "Player not found!" });

            return;
        }

        const actingUid: unknown = res.locals.uid;
        const resolved = await resolveVisibleVariant(
            typeof type === "string" ? type : undefined,
            typeof actingUid === "number" ? actingUid : undefined,
        );

        if (resolved === "notFound") {
            res.status(404).json({ message: "Rework not found" });

            return;
        }

        if (resolved === "unavailable") {
            res.status(503).json({
                message: "The rework list is unavailable",
            });

            return;
        }

        const playerInfo =
            await DatabaseManager.aliceDb.collections.prototypePP.getFromUid(
                uid,
                resolved.current.name,
            );

        if (!playerInfo) {
            res.status(404).json({ message: "Player not found!" });

            return;
        }

        const countries = await readCountries([playerInfo.uid]);

        const response: PrototypeLeaderboardResponse<PrototypePlayer> = {
            variants: resolved.variants,
            currentVariant: resolved.current,
            data: {
                ...playerInfo,
                country: countries.get(playerInfo.uid) ?? null,
            },
        };

        res.json(response);
    }),
);

export default router;
