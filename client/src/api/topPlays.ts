import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PrototypeTopPlay } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/**
 * The best plays of every player in a variant. The server keeps the plays that have every mod in
 * `modAcronyms` (such as `["HD", "DT"]`), ignoring mod settings; none lists all plays.
 */
export function useTopPlays(
    variant: string,
    modAcronyms: readonly string[],
): UseQueryResult<PrototypeTopPlay[]> {
    const mods = modAcronyms.join("");

    return useQuery({
        queryKey: queryKeys.topPlays(variant, mods),
        queryFn: () => {
            const parameters = new URLSearchParams({ type: variant });

            if (mods !== "") {
                parameters.set("mods", mods);
            }

            return requestJson<PrototypeTopPlay[]>(
                "GET",
                `/api/ppboard/prototype/gettopplays?${parameters}`,
            );
        },
        // Picking a mod keeps the table (and its open mod picker) on screen until the new plays arrive.
        placeholderData: keepPreviousData,
    });
}
