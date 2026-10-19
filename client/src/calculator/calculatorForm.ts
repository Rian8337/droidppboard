import type { SerializedMod } from "@rian8337/osu-base";
import type { CalculationResponse, CalculationScope } from "app-structures";

/** What the calculator's form holds. Numbers are kept as the text that was typed. */
export interface CalculatorFormValues {
    /** A beatmap link or ID. */
    beatmap: string;

    /** An uploaded `.osu` file, which is used instead of `beatmap`. */
    beatmapFile: File | null;

    mods: SerializedMod[];
    combo: string;
    accuracy: string;
    totalScore: string;
    n100: string;
    n50: string;
    nmiss: string;
    sliderTicksMissed: string;
    sliderEndsDropped: string;
}

export const emptyFormValues: CalculatorFormValues = {
    beatmap: "",
    beatmapFile: null,
    mods: [],
    combo: "",
    accuracy: "",
    totalScore: "",
    n100: "",
    n50: "",
    nmiss: "",
    sliderTicksMissed: "",
    sliderEndsDropped: "",
};

/** Whether nothing has been entered in the form, so that resetting it loses nothing. */
export function isFormEmpty(values: CalculatorFormValues): boolean {
    return (Object.keys(emptyFormValues) as (keyof CalculatorFormValues)[]).every((key) =>
        key === "mods" ? values.mods.length === 0 : values[key] === emptyFormValues[key],
    );
}

/** The form values that a result was calculated from, and whether My score made it. */
export interface SubmittedCalculation {
    values: CalculatorFormValues;
    isMyScore: boolean;
}

/** The text fields that go into the request under their own names. */
export const numericFieldNames = [
    "combo",
    "accuracy",
    "totalScore",
    "n100",
    "n50",
    "nmiss",
    "sliderTicksMissed",
    "sliderEndsDropped",
] as const;

/**
 * Builds the multipart body of a calculation request. Fields that are empty are left out, and an
 * uploaded file is sent as `beatmapfile` in place of the beatmap link or ID.
 */
export function buildCalculationFormData(
    scope: CalculationScope,
    variant: string,
    values: CalculatorFormValues,
): FormData {
    const form = new FormData();

    form.set("scope", scope);
    form.set("variant", variant);
    form.set("mods", JSON.stringify(values.mods));

    if (values.beatmapFile) {
        form.set("beatmapfile", values.beatmapFile);
    } else if (values.beatmap.trim() !== "") {
        form.set("beatmap", values.beatmap.trim());
    }

    for (const name of numericFieldNames) {
        const value = values[name].trim();

        if (value !== "") {
            form.set(name, value);
        }
    }

    return form;
}

/**
 * Builds the multipart body that makes a snapshot of a calculation: the same fields as the
 * calculation itself, plus the source when My score made it.
 */
export function buildSnapshotFormData(
    scope: CalculationScope,
    variant: string,
    { values, isMyScore }: SubmittedCalculation,
): FormData {
    const form = buildCalculationFormData(scope, variant, values);

    if (isMyScore) {
        form.set("source", "my-score");
    }

    return form;
}

/**
 * Gets the form values that would make `response` again. The beatmap is empty for a result of an
 * uploaded file, which has no ID to calculate against.
 */
export function getFormValuesFromResult(response: CalculationResponse): CalculatorFormValues {
    const { parameters } = response;

    function getText(value: number | undefined): string {
        return value === undefined ? "" : String(value);
    }

    return {
        beatmap: "id" in parameters.beatmap ? String(parameters.beatmap.id) : "",
        beatmapFile: null,
        mods: parameters.mods,
        combo: getText(parameters.combo),
        accuracy: getText(parameters.accuracy),
        totalScore: getText(parameters.totalScore),
        n100: getText(parameters.n100),
        n50: getText(parameters.n50),
        nmiss: getText(parameters.nmiss),
        sliderTicksMissed: getText(parameters.sliderTicksMissed),
        sliderEndsDropped: getText(parameters.sliderEndsDropped),
    };
}

/** Whether `getFormValuesFromResult` can fill in a beatmap: not for an uploaded file. */
export function canLoadFromResult(response: CalculationResponse): boolean {
    return "id" in response.parameters.beatmap;
}
