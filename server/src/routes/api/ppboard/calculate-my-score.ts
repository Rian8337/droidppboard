import { Accuracy, Modes } from "@rian8337/osu-base";
import { CalculationOutcome, CalculationParameters } from "app-structures";
import express from "express";
import {
    buildCalculationResponse,
    decodeBeatmap,
    getBeatmapHash,
    toOutcome,
} from "../../../calculation/calculateScore";
import { getBaselineVariant } from "../../../calculation/calculatorVariants";
import { prepareCalculation } from "../../../calculation/prepareCalculation";
import {
    OnlineScoreResponse,
    ScoreServiceClient,
} from "../../../recalculation/ScoreServiceClient";
import { Util } from "../../../utils/Util";
import { asyncHandler } from "../../../utils/asyncHandler";

const router = express.Router();

router.use(Util.createRateLimit(5, 1000));

/**
 * Takes the mods and statistics of a stored score as the parameters of a calculation.
 */
function toParameters(
    score: OnlineScoreResponse,
    beatmap: CalculationParameters["beatmap"],
): CalculationParameters {
    const { score: counts } = score.calculation;

    return {
        beatmap,
        mods: score.score.mods,
        combo: counts.combo,
        accuracy: new Accuracy(counts).value * 100,
        n100: counts.n100,
        n50: counts.n50,
        nmiss: counts.nmiss,
    };
}

function toCalculationOutcome(score: OnlineScoreResponse): CalculationOutcome {
    return toOutcome({
        difficulty: { ...score.calculation.difficulty },
        performance: { ...score.calculation.performance },
        strainChart: score.calculation.strainChart,
    });
}

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

        const { request, variant, osuFile } = prepared;
        const beatmap = decodeBeatmap(osuFile);

        if (beatmap === null) {
            res.status(400).json({ message: "Invalid beatmap file" });

            return;
        }

        const variantName = variant?.name ?? request.variant;
        const baselineName = getBaselineVariant(request.scope, variantName);
        const hash = getBeatmapHash(osuFile);

        // The baseline is only worth looking up for a person who has a score to compare.
        const scores: OnlineScoreResponse[] = [];

        for (const name of baselineName === null
            ? [variantName]
            : [variantName, baselineName]) {
            const outcome = await ScoreServiceClient.getOnlineScore(
                uid,
                hash,
                name,
                uid,
            );

            if (outcome.kind === "ok") {
                scores.push(outcome.response);

                continue;
            }

            if (outcome.kind === "skip") {
                res.status(404).json({
                    message: "You have no score on this beatmap",
                });
            } else {
                res.status(503).json({
                    message: "Could not contact the score service",
                });
            }

            return;
        }

        const [score, baselineScore] = scores;

        res.json(
            buildCalculationResponse({
                scope: request.scope,
                variant: variantName,
                baseline: baselineName,
                calculatorVersion: variant?.calculatorVersion ?? null,
                parameters: toParameters(score, request.parameters.beatmap),
                osuFile,
                beatmapId: prepared.beatmapId,
                beatmap,
                mode: Modes.Droid,
                mods: score.score.mods,
                result: toCalculationOutcome(score),
                baselineResult: baselineScore
                    ? toCalculationOutcome(baselineScore)
                    : null,
                ignoredMods: [],
            }),
        );
    }),
);

export default router;
