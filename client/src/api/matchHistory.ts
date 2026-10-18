import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { MultiplayerRoomHistory } from "../matchHistory/types";
import { queryKeys } from "./queryKeys";

/** The tournament server, which is not this site's, so no cookies are sent to it. */
const historyUrl = "https://droidpp.osudroid.moe/api/tournament/getrooms_history";

async function fetchMatchHistory(matchId: string): Promise<MultiplayerRoomHistory> {
    const failure = new Error("Unable to load the match history of this room.");
    let response: Response;

    try {
        response = await fetch(`${historyUrl}?${new URLSearchParams({ id: matchId })}`);
    } catch {
        throw failure;
    }

    if (!response.ok) {
        throw failure;
    }

    return (await response.json()) as MultiplayerRoomHistory;
}

/** The sessions played in a multiplayer room. */
export function useMatchHistory(matchId: string): UseQueryResult<MultiplayerRoomHistory> {
    return useQuery({
        queryKey: queryKeys.matchHistory(matchId),
        queryFn: () => fetchMatchHistory(matchId),
    });
}
