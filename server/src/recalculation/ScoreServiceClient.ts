import { SerializedMod } from "@rian8337/osu-base";
import { CacheableDifficultyAttributes } from "@rian8337/osu-difficulty-calculator";
import { BrokerPerformanceResponse } from "../structures/difficultyattributes/BrokerPerformanceResponse";
import { DroidPerformanceAttributes } from "../structures/difficultyattributes/DroidPerformanceAttributes";
import { DroidDifficultyAttributes } from "@rian8337/osu-difficulty-calculator";
import { DroidDifficultyAttributes as RebalanceDroidDifficultyAttributes } from "@rian8337/osu-rebalance-difficulty-calculator";

/**
 * The score values a performance calculation used.
 */
export interface ResolvedScore {
    readonly n300: number;
    readonly n100: number;
    readonly n50: number;
    readonly nmiss: number;
    readonly combo: number;
    readonly tapPenalty: number;
    readonly sliderCheesePenalty: number;
}

/**
 * The response of the score service's online score route, as far as recalculation reads it.
 */
export interface OnlineScoreResponse {
    readonly score: {
        /**
         * The ID of the score that was calculated.
         */
        readonly id: number;

        /**
         * All of the score's mods. The calculation's difficulty attributes hold only the
         * difficulty-adjusting ones.
         */
        readonly mods: SerializedMod[];
    };

    readonly calculation: BrokerPerformanceResponse<
        CacheableDifficultyAttributes<
            DroidDifficultyAttributes | RebalanceDroidDifficultyAttributes
        >,
        DroidPerformanceAttributes
    > & { readonly score: ResolvedScore };
}

/**
 * The outcome of looking up and calculating an online score.
 *
 * - `ok`: the score was calculated.
 * - `skip`: the score or its beatmap definitely does not exist, so there is nothing to calculate.
 * - `error`: the service could not answer, so nothing is known about the score.
 */
export type OnlineScoreOutcome =
    | { kind: "ok"; response: OnlineScoreResponse }
    | { kind: "skip"; reason: string }
    | { kind: "error"; reason: string };

/**
 * A client for the score service.
 */
export abstract class ScoreServiceClient {
    /**
     * Calculating a score replays it, which can take a while.
     */
    private static readonly requestTimeoutMs = 60_000;

    /**
     * Error codes with which the score service says that there is nothing to calculate.
     */
    private static readonly skipCodes = new Set([
        "SCORE_NOT_FOUND",
        "BEATMAP_NOT_FOUND",
    ]);

    /**
     * Gets the best pp score of a player on a beatmap, calculated for a variant.
     *
     * @param uid The uid of the player.
     * @param hash The MD5 hash of the beatmap.
     * @param variant The name of the variant to calculate with.
     * @param actingUid The uid of the person that the calculation is made on behalf of.
     * @returns The outcome.
     */
    static async getOnlineScore(
        uid: number,
        hash: string,
        variant: string,
        actingUid: number,
    ): Promise<OnlineScoreOutcome> {
        const url = new URL(
            `${process.env.DPP_SCORE_SERVICE_URL!.replace(/\/+$/, "")}/online-scores`,
        );

        url.searchParams.set("uid", uid.toString());
        url.searchParams.set("hash", hash.toLowerCase());
        url.searchParams.set("variant", variant);
        url.searchParams.set("best", "true");

        let response: Response;

        try {
            response = await fetch(url.href, {
                headers: {
                    "X-Api-Key": process.env.DPP_SCORE_SERVICE_KEY!,
                    "X-Acting-Uid": actingUid.toString(),
                },
                signal: AbortSignal.timeout(this.requestTimeoutMs),
            });
        } catch (e) {
            // Only the error's name is logged, as the message can embed the request's URL.
            const name = e instanceof Error ? e.name : "unknown error";

            console.error(`Score service request failed: ${name}`);

            return {
                kind: "error",
                reason:
                    name === "TimeoutError" || name === "AbortError"
                        ? "Score service timed out"
                        : "Score service is unreachable",
            };
        }

        let body: unknown;

        try {
            body = await response.json();
        } catch {
            body = null;
        }

        if (response.status === 200) {
            return body
                ? { kind: "ok", response: body as OnlineScoreResponse }
                : {
                      kind: "error",
                      reason: "Score service returned an unreadable response",
                  };
        }

        const code = this.getErrorCode(body);

        if (
            response.status === 404 &&
            code !== null &&
            this.skipCodes.has(code)
        ) {
            return { kind: "skip", reason: code };
        }

        return {
            kind: "error",
            reason: `Score service returned ${response.status.toString()}${code === null ? "" : ` (${code})`}`,
        };
    }

    private static getErrorCode(body: unknown): string | null {
        const code = (body as { error?: { code?: unknown } } | null)?.error
            ?.code;

        return typeof code === "string" ? code : null;
    }
}
