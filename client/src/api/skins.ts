import { keepPreviousData, useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { IPlayerSkin } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/** How many skins the server returns on one page of the list. */
export const skinPageSize = 50;

/** One page of the skins whose name matches `query`; an empty one lists them all. */
export function useSkins(page: number, query: string): UseQueryResult<IPlayerSkin[]> {
    return useQuery({
        queryKey: queryKeys.skins(page, query),
        queryFn: () => {
            const parameters = new URLSearchParams({ page: String(page) });

            if (query !== "") {
                parameters.set("query", query);
            }

            return requestJson<IPlayerSkin[]>("GET", `/api/skins/search?${parameters}`);
        },
        placeholderData: keepPreviousData,
    });
}

/** A person's skin by name, or `null` if they have none of that name. */
export function useSkin(discordId: string, name: string): UseQueryResult<IPlayerSkin | null> {
    return useQuery({
        queryKey: queryKeys.skin(discordId, name),
        queryFn: () => {
            const parameters = new URLSearchParams({ discordid: discordId, name });

            return requestJson<IPlayerSkin | null>("GET", `/api/skins/get?${parameters}`);
        },
    });
}
