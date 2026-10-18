import {
    Accuracy,
    Beatmap,
    BeatmapDecoder,
    BeatmapDifficulty,
    MathUtils,
    ModUtil,
    Modes,
    SerializedMod,
} from "@rian8337/osu-base";
import {
    CalculationOutcome,
    CalculationParameters,
    CalculationResponse,
    CalculationScope,
} from "app-structures";
import { createHash } from "crypto";
import { BrokerClient } from "../clients/BrokerClient";
import { getBaselineVariant } from "./calculatorVariants";

export interface CalculationInput {
    readonly scope: CalculationScope;
    readonly variant: string;
    readonly parameters: CalculationParameters;

    /**
     * The contents of the `.osu` file.
     */
    readonly osuFile: string;

    readonly beatmapId: number | null;

    /**
     * The uid of the person to act for, which private variants need.
     */
    readonly actingUid?: number;

    /**
     * The calculator version of the variant, as reported in the response. Defaults to `null`.
     */
    readonly calculatorVersion?: string | null;
}

export interface CalculationFailure {
    readonly error: string;
    readonly status: number;
}

export interface BrokerPerformance {
    readonly difficulty: Record<string, unknown>;
    readonly performance: Record<string, unknown>;
    readonly strainChart?: string;
}

/**
 * Splits mods into the ones an osu!standard variant applies and the acronyms of those it does not.
 */
function splitOsuMods(mods: readonly SerializedMod[]): {
    applicable: SerializedMod[];
    ignored: string[];
} {
    const applicable: SerializedMod[] = [];
    const ignored: string[] = [];

    for (const mod of mods) {
        // Mods that are not known are left out when deserializing.
        const [instance] = ModUtil.deserializeMods([mod]).values();

        if (instance?.isApplicableToOsu()) {
            applicable.push(mod);
        } else {
            ignored.push(mod.acronym);
        }
    }

    return { applicable, ignored };
}

function pickNumbers(attributes: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(attributes).filter(
            (entry): entry is [string, number] =>
                typeof entry[1] === "number" && Number.isFinite(entry[1]),
        ),
    );
}

/**
 * Keeps the numeric attributes of a calculation.
 *
 * @param response The difficulty and performance attributes, and the strain chart if there is one.
 * @returns The outcome.
 */
export function toOutcome(response: BrokerPerformance): CalculationOutcome {
    return {
        difficulty: pickNumbers(response.difficulty),
        performance: pickNumbers(response.performance),
        strainChart: response.strainChart ?? null,
    };
}

/**
 * Decodes the contents of a `.osu` file.
 *
 * @param osuFile The contents of the file.
 * @returns The beatmap, or `null` if the file is not a beatmap with objects.
 */
export function decodeBeatmap(osuFile: string): Beatmap | null {
    try {
        const { result } = new BeatmapDecoder().decode(osuFile);

        return result.hitObjects.objects.length > 0 ? result : null;
    } catch {
        return null;
    }
}

/**
 * Gets the MD5 hash of a beatmap from the contents of its `.osu` file.
 */
export function getBeatmapHash(osuFile: string): string {
    return createHash("md5").update(osuFile).digest("hex");
}

export interface CalculationResponseInput {
    readonly scope: CalculationScope;
    readonly variant: string;
    readonly baseline: string | null;
    readonly calculatorVersion: string | null;
    readonly parameters: CalculationParameters;
    readonly osuFile: string;
    readonly beatmapId: number | null;
    readonly beatmap: Beatmap;
    readonly mode: Modes;

    /**
     * The mods that the beatmap's difficulty is shown with.
     */
    readonly mods: readonly SerializedMod[];

    readonly result: CalculationOutcome;
    readonly baselineResult: CalculationOutcome | null;
    readonly ignoredMods: string[];
}

/**
 * Builds the response of a calculation from the outcomes of a variant and its baseline.
 *
 * @param input What was calculated.
 * @returns The response.
 */
export function buildCalculationResponse(
    input: CalculationResponseInput,
): CalculationResponse {
    const { beatmap } = input;
    const difficulty = new BeatmapDifficulty(beatmap.difficulty);

    ModUtil.applyModsToBeatmapDifficulty(
        difficulty,
        input.mode,
        ModUtil.deserializeMods(input.mods),
        true,
    );

    return {
        scope: input.scope,
        variant: input.variant,
        baseline: input.baseline,
        calculatorVersion: input.calculatorVersion,
        calculatedAt: new Date().toISOString(),
        beatmap: {
            id: input.beatmapId,
            hash: getBeatmapHash(input.osuFile),
            title: beatmap.metadata.title,
            maxCombo: beatmap.maxCombo,
            cs: difficulty.cs,
            ar: difficulty.ar,
            od: difficulty.od,
            hp: difficulty.hp,
        },
        parameters: input.parameters,
        result: input.result,
        baselineResult: input.baselineResult,
        ignoredMods: input.ignoredMods,
    };
}

function readBrokerMessage(body: unknown): string | null {
    const message = (body as { error?: { message?: unknown } } | null)?.error
        ?.message;

    return typeof message === "string" ? message : null;
}

/**
 * Calculates a score with a variant and, if it has one, the variant it is compared with.
 *
 * @param input What to calculate.
 * @returns The calculation, or the error to answer with.
 */
export async function calculateScore(
    input: CalculationInput,
): Promise<CalculationResponse | CalculationFailure> {
    const { scope, variant, parameters, osuFile } = input;
    const mode = variant.startsWith("osu-") ? Modes.Osu : Modes.Droid;

    const beatmap = decodeBeatmap(osuFile);

    if (beatmap === null) {
        return { error: "Invalid beatmap file", status: 400 };
    }

    const objectCount = beatmap.hitObjects.objects.length;

    let mods = parameters.mods;
    let ignoredMods: string[] = [];

    if (mode === Modes.Osu) {
        const split = splitOsuMods(mods);

        mods = split.applicable;
        ignoredMods = split.ignored;
    }

    const nmiss = parameters.nmiss ?? 0;
    const hasHitCounts =
        parameters.n100 !== undefined || parameters.n50 !== undefined;
    const accuracy = hasHitCounts
        ? Accuracy.fromHitCounts(
              { n100: parameters.n100, n50: parameters.n50, nmiss },
              objectCount,
          )
        : Accuracy.fromPercent(parameters.accuracy ?? 100, objectCount, nmiss);

    const requestBody = {
        beatmap: { file: osuFile },
        mods,
        score: {
            n300: accuracy.n300,
            n100: accuracy.n100,
            n50: accuracy.n50,
            nmiss: accuracy.nmiss,
            combo: MathUtils.clamp(
                parameters.combo ?? beatmap.maxCombo,
                0,
                beatmap.maxCombo,
            ),
            totalScore: parameters.totalScore,
            sliderTicksMissed: parameters.sliderTicksMissed,
            sliderEndsDropped: parameters.sliderEndsDropped,
        },
        strainChart: true,
    };

    const baseline = getBaselineVariant(scope, variant);

    const calculate = async (
        name: string,
    ): Promise<CalculationOutcome | CalculationFailure> => {
        const response = await BrokerClient.calculatePerformance(
            name,
            requestBody,
            input.actingUid,
        );

        if (response.status === 200) {
            return toOutcome(response.body as BrokerPerformance);
        }

        if (response.status === 404) {
            return { error: "Variant not found", status: 404 };
        }

        if (response.status >= 400 && response.status < 500) {
            return {
                error:
                    readBrokerMessage(response.body) ??
                    "The calculation was rejected",
                status: 400,
            };
        }

        console.error(
            `Calculation for ${name} failed with status ${response.status.toString()}`,
        );

        return {
            error: "Could not contact the processing server",
            status: 503,
        };
    };

    const [result, baselineResult] = await Promise.all([
        calculate(variant),
        baseline === null ? null : calculate(baseline),
    ]);

    for (const outcome of [result, baselineResult]) {
        if (outcome !== null && "error" in outcome) {
            return outcome;
        }
    }

    return buildCalculationResponse({
        scope,
        variant,
        baseline,
        calculatorVersion: input.calculatorVersion ?? null,
        parameters,
        osuFile,
        beatmapId: input.beatmapId,
        beatmap,
        mode,
        mods,
        result: result as CalculationOutcome,
        baselineResult: baselineResult as CalculationOutcome | null,
        ignoredMods,
    });
}
