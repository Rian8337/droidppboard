import express from "express";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";
import { resolveVisibleVariant } from "../../../utils/visibleVariant";
import { readCountries } from "../../../utils/readCountries";
import { PrototypeTopPlay } from "app-structures";

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
            res.status(404).json({ message: "Rework not found" });

            return;
        }

        if (resolved === "unavailable") {
            res.status(503).json({
                message: "The rework list is unavailable",
            });

            return;
        }

        // The precomputed top plays include every variant, so they are read only after the check.
        const plays =
            Util.getTopPrototypePP(resolved.name, convertedMods) ?? [];
        const countries = await readCountries(plays.map((play) => play.uid));

        const response: PrototypeTopPlay[] = plays.map((play) => ({
            ...play,
            country: countries.get(play.uid) ?? null,
        }));

        res.json(response);
    }),
);

export default router;
