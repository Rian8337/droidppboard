import express from "express";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";
import { listVisibleDroidVariants } from "../../../utils/visibleVariant";

const router = express.Router();

router.use(Util.createRateLimit(5));

router.get(
    "/",
    asyncHandler(async (_, res) => {
        // What a person can see depends on who they are.
        res.set("Cache-Control", "no-store");

        const uid: unknown = res.locals.uid;
        const variants = await listVisibleDroidVariants(
            typeof uid === "number" ? uid : undefined,
        );

        if (variants === null) {
            res.status(503).json({
                message: "The rework list is unavailable",
            });

            return;
        }

        res.json(variants);
    }),
);

export default router;
