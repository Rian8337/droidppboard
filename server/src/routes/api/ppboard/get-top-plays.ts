import express from "express";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";
import { resolveVisibleVariant } from "../../../utils/visibleVariant";
import {
    PrototypeLeaderboardResponse,
    TopPrototypePPEntry,
} from "app-structures";

const router = express.Router();

router.use(Util.createRateLimit(5));

router.get(
    "/",
    asyncHandler(async (req, res) => {
        // What a person can see depends on who they are.
        res.set("Cache-Control", "no-store");

        // Query parameters can be parsed into arrays or objects, so their types have to be checked.
        const { mods, type } = req.query;
        const mod = typeof mods === "string" ? mods : "";

        const convertedMods =
            mod.length > 0 && mod.toLowerCase() !== "nm"
                ? ModUtil.pcStringToMods(mod)
                : undefined;

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

        // The precomputed top plays include every variant, so they are read only after the check.
        const response: PrototypeLeaderboardResponse<TopPrototypePPEntry[]> = {
            variants: resolved.variants,
            currentVariant: resolved.current,
            data:
                Util.getTopPrototypePP(resolved.current.name, convertedMods) ??
                [],
        };

        res.json(response);
    }),
);

export default router;
