import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PrototypePlayer } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/** How many players the server returns on one page of the leaderboard. */
export const leaderboardPageSize = 50;

/**
 * One page of a variant's leaderboard, ranked by local pp. `search` filters players by name; an
 * empty one lists everybody. Rows are never kept from another page, so their ranks stay right.
 */
export function useLeaderboard(
    variant: string,
    page: number,
    search: string,
): UseQueryResult<PrototypePlayer[]> {
    return useQuery({
        queryKey: queryKeys.leaderboard(variant, page, search),
        queryFn: () => {
            const parameters = new URLSearchParams({ type: variant, page: String(page) });

            if (search !== "") {
                parameters.set("query", search);
            }

            return requestJson<PrototypePlayer[]>(
                "GET",
                `/api/ppboard/prototype/getleaderboard?${parameters}`,
            );
        },
    });
}
