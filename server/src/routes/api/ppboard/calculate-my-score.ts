import express from "express";
import { calculateMyScore } from "../../../calculation/calculateMyScore";
import { prepareCalculation } from "../../../calculation/prepareCalculation";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = express.Router();

router.use(Util.createRateLimit(5, 1000));

router.post(
    "/",
    asyncHandler(async (req, res) => {
        // The answer depends on who is logged in.
        res.set("Cache-Control", "no-store");

        const uid: unknown = res.locals.uid;

        if (typeof uid !== "number") {
            res.status(401).json({ message: "Not logged in" });

            return;
        }

        const prepared = await prepareCalculation(req, uid, {
            isDroidOnly: true,
        });

        if ("error" in prepared) {
            res.status(prepared.status).json({ message: prepared.error });

            return;
        }

        const result = await calculateMyScore(prepared, uid);

        if ("error" in result) {
            res.status(result.status).json({ message: result.error });

            return;
        }

        res.json(result);
    }),
);

export default router;
