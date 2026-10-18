import { SerializedMod } from "@rian8337/osu-base";
import { CalculationParameters, CalculationScope } from "app-structures";
import { ReadStream } from "fs";
import { z } from "zod";

/**
 * A file that a person uploaded with a request.
 */
export type UploadedFile = ReadStream;

/**
 * Where the beatmap of a calculation comes from.
 */
export type BeatmapInput =
    | { readonly kind: "id"; readonly id: number }
    | { readonly kind: "file"; readonly file: UploadedFile };

export interface CalculationRequest {
    readonly scope: CalculationScope;
    readonly variant: string;
    readonly parameters: CalculationParameters;
    readonly beatmapInput: BeatmapInput;
}

// Form fields arrive as strings, and a field that is left empty counts as not given.
function optionalNumber(schema: z.ZodNumber) {
    return z.preprocess(
        (value) => (value === "" || value === null ? undefined : value),
        z.coerce.number().pipe(schema).optional(),
    );
}

const count = z.number().int().nonnegative();

const modsSchema = z.array(
    z.strictObject({
        acronym: z.string().min(1),
        settings: z.record(z.string(), z.unknown()).optional(),
    }),
);

const fieldsSchema = z.object({
    scope: z.enum(["variant", "tool"]),
    variant: z.string().min(1),
    beatmap: z.string().optional(),
    mods: z.unknown().optional(),
    combo: optionalNumber(count),
    accuracy: optionalNumber(z.number().min(0).max(100)),
    totalScore: optionalNumber(count),
    n100: optionalNumber(count),
    n50: optionalNumber(count),
    nmiss: optionalNumber(count),
    sliderTicksMissed: optionalNumber(count),
    sliderEndsDropped: optionalNumber(count),
});

function parseMods(value: unknown): SerializedMod[] | null {
    if (value === undefined || value === "") {
        return [];
    }

    let mods = value;

    if (typeof value === "string") {
        try {
            mods = JSON.parse(value);
        } catch {
            return null;
        }
    }

    const parsed = modsSchema.safeParse(mods);

    return parsed.success ? parsed.data : null;
}

/**
 * Gets the ID from a beatmap link or ID, which is its last path segment.
 */
function parseBeatmapId(input: string): number | null {
    const segment = input.trim().replace(/\/+$/, "").split("/").at(-1)!;

    if (!/^\d+$/.test(segment)) {
        return null;
    }

    const id = Number(segment);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Validates the request to calculate a score.
 *
 * @param body The fields of the request. `mods` is a JSON string of serialized mods.
 * @param file The uploaded `.osu` file, if any. It is used instead of `beatmap` when given.
 * @returns The request, or the error to answer with.
 */
export function parseCalculationRequest(
    body: unknown,
    file: UploadedFile | undefined,
): CalculationRequest | { error: string } {
    if (file && !file.path.toString().endsWith(".osu")) {
        return { error: "Invalid file uploaded" };
    }

    const fields = fieldsSchema.safeParse(body ?? {});

    if (!fields.success) {
        const [issue] = fields.error.issues;
        const field = issue.path.join(".");

        return { error: field ? `Invalid ${field}` : "Invalid request" };
    }

    const { scope, variant, beatmap, mods, ...numbers } = fields.data;
    const parsedMods = parseMods(mods);

    if (parsedMods === null) {
        return { error: "Invalid mods" };
    }

    let beatmapInput: BeatmapInput;
    let reference: CalculationParameters["beatmap"];

    if (file) {
        beatmapInput = { kind: "file", file };
        reference = { file: true };
    } else if (beatmap) {
        const id = parseBeatmapId(beatmap);

        if (id === null) {
            return { error: "Invalid beatmap ID" };
        }

        beatmapInput = { kind: "id", id };
        reference = { id };
    } else {
        return { error: "Please enter a valid beatmap file, link or ID" };
    }

    return {
        scope,
        variant,
        parameters: { beatmap: reference, mods: parsedMods, ...numbers },
        beatmapInput,
    };
}
