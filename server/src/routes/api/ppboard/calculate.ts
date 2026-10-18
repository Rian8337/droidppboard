import { ReadStream } from "fs";
import express from "express";
import { PPVariant } from "app-structures";
import { BrokerClient } from "../../../clients/BrokerClient";
import { calculateScore } from "../../../calculation/calculateScore";
import { isToolVariantName } from "../../../calculation/calculatorVariants";
import { parseCalculationRequest } from "../../../calculation/calculationRequest";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";
import { resolveVisibleVariant } from "../../../utils/visibleVariant";

const router = express.Router();

router.use(Util.createRateLimit(5, 1000));

router.post(
    "/",
    asyncHandler(async (req, res) => {
        // What a person can calculate depends on who they are.
        res.set("Cache-Control", "no-store");

        // The typings do not know of the files that express-form-data adds.
        const uploads = (req as unknown as { files?: Record<string, unknown> })
            .files?.beatmapfile;
        const upload = Array.isArray(uploads) ? uploads[0] : uploads;
        const request = parseCalculationRequest(
            req.body,
            upload instanceof ReadStream ? upload : undefined,
        );

        if ("error" in request) {
            res.status(400).json({ message: request.error });

            return;
        }

        const uid: unknown = res.locals.uid;
        const actingUid = typeof uid === "number" ? uid : undefined;
        let variant: PPVariant | null;

        if (request.scope === "variant") {
            const resolved = await resolveVisibleVariant(
                request.variant,
                actingUid,
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

            variant = resolved.current;
        } else {
            if (!isToolVariantName(request.variant)) {
                res.status(404).json({ message: "Variant not found" });

                return;
            }

            variant = await BrokerClient.getVariant(request.variant, actingUid);
        }

        let osuFile = "";
        let beatmapId: number | null = null;

        if (request.beatmapInput.kind === "file") {
            osuFile = (await Util.readFile(request.beatmapInput.file)).toString(
                "utf-8",
            );
        } else {
            beatmapId = request.beatmapInput.id;
            osuFile = await Util.downloadBeatmap(beatmapId);
        }

        if (!osuFile) {
            res.status(400).json({
                message: "Please enter a valid beatmap file, link or ID",
            });

            return;
        }

        const result = await calculateScore({
            scope: request.scope,
            variant: variant?.name ?? request.variant,
            parameters: request.parameters,
            osuFile,
            beatmapId,
            actingUid,
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
