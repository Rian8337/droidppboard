import { ReadStream } from "fs";
import { Request } from "express";
import { CalculationResponse, PPVariant } from "app-structures";
import { BrokerClient } from "../clients/BrokerClient";
import { Util } from "../utils/Util";
import { resolveVisibleVariant } from "../utils/visibleVariant";
import { CalculationFailure, calculateScore } from "./calculateScore";
import { isToolVariantName } from "./calculatorVariants";
import {
    CalculationRequest,
    parseCalculationRequest,
} from "./calculationRequest";

/**
 * A calculation request that was validated, with what it refers to resolved.
 */
export interface PreparedCalculation {
    readonly request: CalculationRequest;

    /**
     * The variant, or `null` if the broker could not describe it.
     */
    readonly variant: PPVariant | null;

    /**
     * The uid of the person to act for, or `undefined` for a visitor.
     */
    readonly actingUid: number | undefined;

    /**
     * The contents of the `.osu` file.
     */
    readonly osuFile: string;

    readonly beatmapId: number | null;
}

/**
 * Validates a request to calculate a score, finds the variant that the person can see, and reads
 * the beatmap.
 *
 * @param req The request.
 * @param actingUid The uid of the person to act for, or `undefined` for a visitor.
 * @param options `isDroidOnly` refuses osu!standard variants, as for scores of osu!droid players.
 * @returns The prepared calculation, or the error to answer with.
 */
export async function prepareCalculation(
    req: Request,
    actingUid: number | undefined,
    options: { readonly isDroidOnly?: boolean } = {},
): Promise<PreparedCalculation | CalculationFailure> {
    // The typings do not know of the files that express-form-data adds.
    const uploads = (req as unknown as { files?: Record<string, unknown> })
        .files?.beatmapfile;
    const upload = Array.isArray(uploads) ? uploads[0] : uploads;
    const request = parseCalculationRequest(
        req.body,
        upload instanceof ReadStream ? upload : undefined,
    );

    if ("error" in request) {
        return { error: request.error, status: 400 };
    }

    let variant: PPVariant | null;

    if (request.scope === "variant") {
        const resolved = await resolveVisibleVariant(
            request.variant,
            actingUid,
        );

        if (resolved === "notFound") {
            return { error: "Variant not found", status: 404 };
        }

        if (resolved === "unavailable") {
            return { error: "The variant list is unavailable", status: 503 };
        }

        variant = resolved.current;
    } else {
        if (!isToolVariantName(request.variant)) {
            return { error: "Variant not found", status: 404 };
        }

        variant = await BrokerClient.getVariant(request.variant, actingUid);
    }

    if (
        options.isDroidOnly &&
        (variant?.name ?? request.variant).startsWith("osu-")
    ) {
        return { error: "Variant not found", status: 404 };
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
        return {
            error: "Please enter a valid beatmap file, link or ID",
            status: 400,
        };
    }

    return { request, variant, actingUid, osuFile, beatmapId };
}

/**
 * Calculates a prepared request with its variant and, if it has one, the variant it is compared
 * with.
 *
 * @param prepared The prepared request.
 * @returns The calculation, or the error to answer with.
 */
export function calculatePrepared(
    prepared: PreparedCalculation,
): Promise<CalculationResponse | CalculationFailure> {
    const { request, variant } = prepared;

    return calculateScore({
        scope: request.scope,
        variant: variant?.name ?? request.variant,
        parameters: request.parameters,
        osuFile: prepared.osuFile,
        beatmapId: prepared.beatmapId,
        actingUid: prepared.actingUid,
        calculatorVersion: variant?.calculatorVersion ?? null,
    });
}
