import type { CalculationOutcome, CalculationResponse } from "app-structures";
import { formatUtcTime } from "../utils/formatUtcTime";

export interface ResultField {
    label: string;
    value: string;
    tone?: "up" | "down";
}

export interface ResultSection {
    title: string;
    fields: ResultField[];
}

type AttributeFormat = "pp" | "difficulty" | "count" | "penalty";

/** An attribute of the response, shown when the response has it. */
interface AttributeField {
    key: string;
    label: string;
    format: AttributeFormat;
}

const droidSkillPp: AttributeField[] = [
    { key: "aim", label: "Aim pp", format: "pp" },
    { key: "tap", label: "Tap pp", format: "pp" },
    { key: "accuracy", label: "Accuracy pp", format: "pp" },
    { key: "flashlight", label: "Flashlight pp", format: "pp" },
    { key: "reading", label: "Reading pp", format: "pp" },
];

const osuSkillPp: AttributeField[] = [
    { key: "aim", label: "Aim pp", format: "pp" },
    { key: "speed", label: "Speed pp", format: "pp" },
    { key: "accuracy", label: "Accuracy pp", format: "pp" },
    { key: "flashlight", label: "Flashlight pp", format: "pp" },
];

const droidPerformanceDetails: AttributeField[] = [
    { key: "effectiveMissCount", label: "Effective miss count", format: "count" },
    { key: "tapPenalty", label: "Tap penalty", format: "penalty" },
    { key: "deviation", label: "Deviation", format: "count" },
    { key: "tapDeviation", label: "Tap deviation", format: "count" },
    { key: "sliderCheesePenalty", label: "Slider cheese penalty", format: "penalty" },
];

const droidSkillDifficulty: AttributeField[] = [
    { key: "aimDifficulty", label: "Aim difficulty", format: "difficulty" },
    { key: "tapDifficulty", label: "Tap difficulty", format: "difficulty" },
    { key: "rhythmDifficulty", label: "Rhythm difficulty", format: "difficulty" },
    { key: "readingDifficulty", label: "Reading difficulty", format: "difficulty" },
    { key: "flashlightDifficulty", label: "Flashlight difficulty", format: "difficulty" },
];

const osuSkillDifficulty: AttributeField[] = [
    { key: "aimDifficulty", label: "Aim difficulty", format: "difficulty" },
    { key: "speedDifficulty", label: "Speed difficulty", format: "difficulty" },
    { key: "readingDifficulty", label: "Reading difficulty", format: "difficulty" },
    { key: "flashlightDifficulty", label: "Flashlight difficulty", format: "difficulty" },
];

/** The calculator version is a 16-character hash; its start is enough to tell versions apart. */
const shortVersionLength = 8;

function formatAttribute(value: number, format: AttributeFormat): string {
    switch (format) {
        case "pp":
        case "difficulty":
        case "penalty":
            return value.toFixed(3);
        case "count":
            return value.toFixed(2);
    }
}

function formatSetting(value: unknown): string {
    return typeof value === "string" ? value : JSON.stringify(value);
}

function formatMods(response: CalculationResponse): string {
    const { mods } = response.parameters;

    if (mods.length === 0) {
        return "None";
    }

    return mods
        .map(({ acronym, settings }) => {
            const entries = Object.entries(settings ?? {});

            return entries.length === 0
                ? acronym
                : `${acronym} (${entries.map(([name, value]) => `${name}: ${formatSetting(value)}`).join(", ")})`;
        })
        .join(", ");
}

function formatAccuracy(response: CalculationResponse): string {
    const { parameters } = response;

    if (parameters.accuracy !== undefined) {
        return `${parameters.accuracy.toFixed(2)}%`;
    }

    // The hit counts take over from the accuracy, as in the calculation itself.
    return parameters.n100 !== undefined || parameters.n50 !== undefined
        ? "From hit counts"
        : "100.00%";
}

function formatStat(value: number): string {
    return String(Number(value.toFixed(2)));
}

function pickAttributes(
    attributes: Record<string, number>,
    fields: readonly AttributeField[],
): ResultField[] {
    return fields.flatMap(({ key, label, format }) => {
        const value = attributes[key];

        return typeof value === "number" ? [{ label, value: formatAttribute(value, format) }] : [];
    });
}

function getPerformanceFields(
    response: CalculationResponse,
    result: CalculationOutcome,
): ResultField[] {
    const { total } = result.performance;
    const fields: ResultField[] = [];

    if (typeof total === "number") {
        fields.push({ label: "Total pp", value: formatAttribute(total, "pp") });
    }

    const liveTotal = response.baselineResult?.performance.total;

    if (typeof liveTotal === "number") {
        fields.push({ label: "Live pp", value: formatAttribute(liveTotal, "pp") });

        if (typeof total === "number") {
            // What rounds to zero on screen is no change, whatever its sign.
            const difference = Number((total - liveTotal).toFixed(3));

            fields.push({
                label: "Difference",
                value: `${difference > 0 ? "+" : ""}${formatAttribute(difference, "pp")}`,
                tone: difference > 0 ? "up" : difference < 0 ? "down" : undefined,
            });
        }
    }

    return fields;
}

/**
 * Turns a calculation into the labelled values that the result panel shows, in groups. Values that
 * the response does not have are left out, and attributes that are not listed here are ignored.
 */
export function getResultSections(response: CalculationResponse): ResultSection[] {
    const { result, beatmap, parameters } = response;
    const isOsu = response.variant.startsWith("osu-");

    const header: ResultField[] = [];

    if (response.calculatorVersion !== null) {
        header.push({
            label: "Calculator version",
            value: response.calculatorVersion.slice(0, shortVersionLength),
        });
    }

    header.push({ label: "Calculated", value: formatUtcTime(response.calculatedAt) });

    if (response.baseline !== null) {
        header.push({ label: "Compared with", value: response.baseline });
    }

    const score: ResultField[] = [
        { label: "Map", value: beatmap.title },
        { label: "Mods", value: formatMods(response) },
        { label: "Accuracy", value: formatAccuracy(response) },
        { label: "Combo", value: `${parameters.combo ?? beatmap.maxCombo} / ${beatmap.maxCombo}` },
    ];

    if (response.ignoredMods.length > 0) {
        score.push({ label: "Ignored for osu!standard", value: response.ignoredMods.join(", ") });
    }

    const starRating = result.difficulty.starRating;

    return [
        { title: response.variant, fields: header },
        { title: "Score", fields: score },
        {
            title: "Performance",
            fields: [
                ...getPerformanceFields(response, result),
                ...pickAttributes(result.performance, isOsu ? osuSkillPp : droidSkillPp),
            ],
        },
        ...(isOsu
            ? []
            : [
                  {
                      title: "Performance details",
                      fields: pickAttributes(result.performance, droidPerformanceDetails),
                  },
              ]),
        {
            title: "Difficulty",
            fields: [
                ...(typeof starRating === "number"
                    ? [{ label: "Star rating", value: formatAttribute(starRating, "difficulty") }]
                    : []),
                ...pickAttributes(
                    result.difficulty,
                    isOsu ? osuSkillDifficulty : droidSkillDifficulty,
                ),
            ],
        },
        {
            title: "Beatmap stats after mods",
            fields: [
                { label: "CS", value: formatStat(beatmap.cs) },
                { label: "AR", value: formatStat(beatmap.ar) },
                { label: "OD", value: formatStat(beatmap.od) },
                { label: "HP", value: formatStat(beatmap.hp) },
            ],
        },
    ].filter((section) => section.fields.length > 0);
}
