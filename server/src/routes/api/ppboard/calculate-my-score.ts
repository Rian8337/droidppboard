import { Accuracy, Modes } from "@rian8337/osu-base";
import { CalculationOutcome, CalculationParameters } from "app-structures";
import express, { Response } from "express";
import {
    buildCalculationResponse,
    decodeBeatmap,
    getBeatmapHash,
    toOutcome,
} from "../../../calculation/calculateScore";
import { getBaselineVariant } from "../../../calculation/calculatorVariants";
import { prepareCalculation } from "../../../calculation/prepareCalculation";
import {
    OnlineScoreOutcome,
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
        accuracy: Math.round(new Accuracy(counts).value * 10000) / 100,
        n100: counts.n100,
        n50: counts.n50,
        nmiss: counts.nmiss,
    };
}

/**
 * Checks whether two lookups returned the same play, by its mods, combo and hit counts.
 *
 * Each lookup asks for the best score by pp, and the score service picks that play without
 * regard to the variant, so both normally return the same stored play. This guards against that
 * ever changing, as comparing two different plays would show a difference that is not the
 * variants'.
 */
function isSameScore(a: OnlineScoreResponse, b: OnlineScoreResponse): boolean {
    const describe = ({ score, calculation }: OnlineScoreResponse) =>
        JSON.stringify([
            [...score.mods].sort((x, y) => x.acronym.localeCompare(y.acronym)),
            calculation.score.combo,
            calculation.score.n300,
            calculation.score.n100,
            calculation.score.n50,
            calculation.score.nmiss,
        ]);

    return describe(a) === describe(b);
}

/**
 * Answers a lookup that did not find a score to calculate.
 */
function sendFailure(
    res: Response,
    outcome: Exclude<OnlineScoreOutcome, { kind: "ok" }>,
) {
    if (outcome.kind === "skip") {
        res.status(404).json({ message: "You have no score on this beatmap" });
    } else {
        res.status(503).json({
            message: "Could not contact the score service",
        });
    }
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

        const outcome = await ScoreServiceClient.getOnlineScore(
            uid,
            hash,
            variantName,
            uid,
        );

        if (outcome.kind !== "ok") {
            sendFailure(res, outcome);

            return;
        }

        const score = outcome.response;
        let baselineScore: OnlineScoreResponse | null = null;

        // The baseline is only worth looking up for a person who has a score to compare.
        if (baselineName !== null) {
            const baselineOutcome = await ScoreServiceClient.getOnlineScore(
                uid,
                hash,
                baselineName,
                uid,
            );

            if (baselineOutcome.kind === "error") {
                sendFailure(res, baselineOutcome);

                return;
            }

            // Without a score for the baseline, the variant is shown on its own.
            if (
                baselineOutcome.kind === "ok" &&
                isSameScore(score, baselineOutcome.response)
            ) {
                baselineScore = baselineOutcome.response;
            }
        }

        res.json(
            buildCalculationResponse({
                scope: request.scope,
                variant: variantName,
                baseline: baselineScore === null ? null : baselineName,
                calculatorVersion: variant?.calculatorVersion ?? null,
                parameters: toParameters(score, request.parameters.beatmap),
                osuFile,
                beatmapId: prepared.beatmapId,
                beatmap,
                mode: Modes.Droid,
                mods: score.score.mods,
                result: toCalculationOutcome(score),
                baselineResult:
                    baselineScore === null
                        ? null
                        : toCalculationOutcome(baselineScore),
                ignoredMods: [],
            }),
        );
    }),
);

export default router;
