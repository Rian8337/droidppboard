import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ModMultiplierSampleResponse } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

export interface ScoreMultiplierRequest {
    /** A beatmap ID or link, as typed. */
    readonly beatmapId: string;

    /** The acronyms every sampled score must have, such as `["HD", "DT"]`; none samples all scores. */
    readonly modAcronyms: readonly string[];
}

/**
 * Top scores on a beatmap under the previous and the new score multipliers. Nothing is asked for
 * while `request` is `null`.
 */
export function useScoreMultiplierSample(
    request: ScoreMultiplierRequest | null,
): UseQueryResult<ModMultiplierSampleResponse> {
    const beatmapId = request?.beatmapId ?? "";
    const mods = request?.modAcronyms.join("") ?? "";

    return useQuery({
        queryKey: queryKeys.scoreMultiplierSample(beatmapId, mods),
        queryFn: () => {
            const parameters = new URLSearchParams({ beatmapId });

            if (mods !== "") {
                parameters.set("mods", mods);
            }

            return requestJson<ModMultiplierSampleResponse>(
                "GET",
                `/api/ppboard/score-multiplier-sample?${parameters}`,
            );
        },
        enabled: request !== null,
    });
}
