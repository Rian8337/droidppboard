import { SerializedMod } from "@rian8337/osu-base";

/**
 * What a calculation is made for: a variant of the board (which is compared with the live
 * variant), or a variant of the beatmap calculator tool.
 */
export type CalculationScope = "variant" | "tool";

/**
 * The score that a calculation is made for.
 */
export interface CalculationParameters {
    /**
     * The beatmap, by ID or as an uploaded file.
     */
    readonly beatmap: { readonly id: number } | { readonly file: true };

    readonly mods: SerializedMod[];
    readonly combo?: number;
    readonly accuracy?: number;
    readonly totalScore?: number;
    readonly n100?: number;
    readonly n50?: number;
    readonly nmiss?: number;
    readonly sliderTicksMissed?: number;
    readonly sliderEndsDropped?: number;
}

/**
 * The attributes that one variant calculated.
 */
export interface CalculationOutcome {
    readonly difficulty: Record<string, number>;
    readonly performance: Record<string, number>;

    /**
     * The strain chart as a base64-encoded PNG.
     */
    readonly strainChart: string | null;
}

/**
 * The response of a calculation.
 */
export interface CalculationResponse {
    readonly scope: CalculationScope;
    readonly variant: string;

    /**
     * The live variant that the variant is compared with, or `null` if there is none.
     */
    readonly baseline: string | null;

    readonly calculatorVersion: string | null;

    /**
     * When the calculation was made, as an ISO date.
     */
    readonly calculatedAt: string;

    readonly beatmap: {
        readonly id: number | null;
        readonly hash: string;
        readonly title: string;
        readonly maxCombo: number;
        readonly cs: number;
        readonly ar: number;
        readonly od: number;
        readonly hp: number;
    };

    readonly parameters: CalculationParameters;
    readonly result: CalculationOutcome;
    readonly baselineResult: CalculationOutcome | null;

    /**
     * The acronyms of mods that do not apply to an osu!standard variant and were left out.
     */
    readonly ignoredMods: string[];
}
