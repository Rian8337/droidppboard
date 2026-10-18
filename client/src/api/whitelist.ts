import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { IMapWhitelist } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/** How many beatmaps the server returns on one page of the whitelist. */
export const whitelistPageSize = 30;

/**
 * One page of the whitelisted beatmaps. `query` is the server's filter syntax (such as
 * `cs>=4 sort=-ar logic`); an empty one lists everything by beatmap name.
 */
export function useWhitelist(page: number, query: string): UseQueryResult<IMapWhitelist[]> {
    return useQuery({
        queryKey: queryKeys.whitelist(page, query),
        queryFn: () => {
            const parameters = new URLSearchParams({ page: String(page) });

            if (query !== "") {
                parameters.set("query", query);
            }

            return requestJson<IMapWhitelist[]>("GET", `/api/ppboard/getwhitelist?${parameters}`);
        },
        // Searching and sorting keep the table on screen until the new rows arrive.
        placeholderData: keepPreviousData,
    });
}
