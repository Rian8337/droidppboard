import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PrototypeLeaderboardResponse, PrototypePlayer } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/**
 * A player's profile in a variant, with every score. The server answers 404 for an unknown player
 * and for one the variant has no profile of.
 */
export function useProfile(variant: string, uid: number): UseQueryResult<PrototypePlayer> {
    return useQuery({
        queryKey: queryKeys.profile(variant, uid),
        queryFn: () => {
            const parameters = new URLSearchParams({ uid: String(uid), type: variant });

            return requestJson<PrototypeLeaderboardResponse<PrototypePlayer>>(
                "GET",
                `/api/ppboard/prototype/getuserprofile?${parameters}`,
            );
        },
        select: (response) => response.data,
    });
}
