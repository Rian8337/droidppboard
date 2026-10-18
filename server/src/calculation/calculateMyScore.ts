import { Accuracy, Modes } from "@rian8337/osu-base";
import {
    CalculationOutcome,
    CalculationParameters,
    CalculationResponse,
} from "app-structures";
import {
    OnlineScoreOutcome,
    OnlineScoreResponse,
    ScoreServiceClient,
} from "../recalculation/ScoreServiceClient";
import {
    CalculationFailure,
    buildCalculationResponse,
    decodeBeatmap,
    getBeatmapHash,
    toOutcome,
} from "./calculateScore";
import { getBaselineVariant } from "./calculatorVariants";
import { PreparedCalculation } from "./prepareCalculation";

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
function toFailure(
    outcome: Exclude<OnlineScoreOutcome, { kind: "ok" }>,
): CalculationFailure {
    return outcome.kind === "skip"
        ? { error: "You have no score on this beatmap", status: 404 }
        : { error: "Could not contact the score service", status: 503 };
}

function toCalculationOutcome(score: OnlineScoreResponse): CalculationOutcome {
    return toOutcome({
        difficulty: { ...score.calculation.difficulty },
        performance: { ...score.calculation.performance },
        strainChart: score.calculation.strainChart,
    });
}

/**
 * Builds the calculation of a person's best score on a beatmap, from what the score service
 * stored for it.
 *
 * @param prepared The validated request, prepared for the person with osu!standard variants
 * refused.
 * @param uid The uid of the person whose score to use.
 * @returns The calculation, or the error to answer with.
 */
export async function calculateMyScore(
    prepared: PreparedCalculation,
    uid: number,
): Promise<CalculationResponse | CalculationFailure> {
    const { request, variant, osuFile } = prepared;
    const beatmap = decodeBeatmap(osuFile);

    if (beatmap === null) {
        return { error: "Invalid beatmap file", status: 400 };
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
        return toFailure(outcome);
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
            return toFailure(baselineOutcome);
        }

        // Without a score for the baseline, the variant is shown on its own.
        if (
            baselineOutcome.kind === "ok" &&
            isSameScore(score, baselineOutcome.response)
        ) {
            baselineScore = baselineOutcome.response;
        }
    }

    return buildCalculationResponse({
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
            baselineScore === null ? null : toCalculationOutcome(baselineScore),
        ignoredMods: [],
    });
}
