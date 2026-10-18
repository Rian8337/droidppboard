import express from "express";
import { calculateScore } from "../../../calculation/calculateScore";
import { prepareCalculation } from "../../../calculation/prepareCalculation";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = express.Router();

router.use(Util.createRateLimit(5, 1000));

router.post(
    "/",
    asyncHandler(async (req, res) => {
        // What a person can calculate depends on who they are.
        res.set("Cache-Control", "no-store");

        const uid: unknown = res.locals.uid;
        const prepared = await prepareCalculation(
            req,
            typeof uid === "number" ? uid : undefined,
        );

        if ("error" in prepared) {
            res.status(prepared.status).json({ message: prepared.error });

            return;
        }

        const { request, variant } = prepared;
        const result = await calculateScore({
            scope: request.scope,
            variant: variant?.name ?? request.variant,
            parameters: request.parameters,
            osuFile: prepared.osuFile,
            beatmapId: prepared.beatmapId,
            actingUid: prepared.actingUid,
            calculatorVersion: variant?.calculatorVersion ?? null,
        });

        if ("error" in result) {
            res.status(result.status).json({ message: result.error });

            return;
        }

        res.json(result);
    }),
);

export default router;
