import {
    Accuracy,
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

interface BrokerPerformance {
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

function toOutcome(response: BrokerPerformance): CalculationOutcome {
    return {
        difficulty: pickNumbers(response.difficulty),
        performance: pickNumbers(response.performance),
        strainChart: response.strainChart ?? null,
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

    let beatmap;

    try {
        beatmap = new BeatmapDecoder().decode(osuFile).result;
    } catch {
        return { error: "Invalid beatmap file", status: 400 };
    }

    const objectCount = beatmap.hitObjects.objects.length;

    if (objectCount === 0) {
        return { error: "Invalid beatmap file", status: 400 };
    }

    let mods = parameters.mods;
    let ignoredMods: string[] = [];

    if (mode === Modes.Osu) {
        const split = splitOsuMods(mods);

        mods = split.applicable;
        ignoredMods = split.ignored;
    }

    const difficulty = new BeatmapDifficulty(beatmap.difficulty);

    ModUtil.applyModsToBeatmapDifficulty(
        difficulty,
        mode,
        ModUtil.deserializeMods(mods),
        true,
    );

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

    return {
        scope,
        variant,
        baseline,
        calculatorVersion: input.calculatorVersion ?? null,
        calculatedAt: new Date().toISOString(),
        beatmap: {
            id: input.beatmapId,
            hash: createHash("md5").update(osuFile).digest("hex"),
            title: beatmap.metadata.title,
            maxCombo: beatmap.maxCombo,
            cs: difficulty.cs,
            ar: difficulty.ar,
            od: difficulty.od,
            hp: difficulty.hp,
        },
        parameters,
        result: result as CalculationOutcome,
        baselineResult: baselineResult as CalculationOutcome | null,
        ignoredMods,
    };
}
