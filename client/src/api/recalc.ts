import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationResult,
    type UseQueryResult,
} from "@tanstack/react-query";
import type { RecalcEntryView, RecalcQueueView } from "app-structures";
import { requestJson, type ApiError } from "./http";
import { queryKeys } from "./queryKeys";

/** How often the queue is asked for again while the page is visible. */
export const recalcPollIntervalMs = 3000;

/**
 * The recalculation queue of a variant, or of every variant the person can see for `null`. It is
 * asked for again every {@link recalcPollIntervalMs} while the page is visible, and right away when
 * the person comes back to it.
 *
 * @param variant The name of the variant, or `null` for the global queue.
 * @param isEnabled Whether to load it at all.
 */
export function useRecalcQueue(
    variant: string | null,
    { isEnabled = true }: { isEnabled?: boolean } = {},
): UseQueryResult<RecalcQueueView, ApiError> {
    return useQuery({
        queryKey: queryKeys.recalcQueue(variant),
        queryFn: () =>
            requestJson<RecalcQueueView>(
                "GET",
                variant === null
                    ? "/api/recalc/queue"
                    : `/api/recalc/queue?variant=${encodeURIComponent(variant)}`,
            ),
        enabled: isEnabled,
        staleTime: 0,
        refetchInterval: recalcPollIntervalMs,
        refetchOnWindowFocus: true,
    });
}

/** What to queue: a variant and a player, by uid (a number or digits) or by username. */
export interface QueuePlayerRequest {
    variant: string;
    player: number | string;
}

/** Turns what a person typed into the body field that names the player. */
function toPlayerFields(player: number | string): { uid: number } | { username: string } {
    const text = String(player).trim();
    const uid = Number(text);

    return /^\d+$/.test(text) && Number.isSafeInteger(uid) ? { uid } : { username: text };
}

/** Makes every queue view load again, as a change to the queue changes all of them. */
function useRefreshQueues(): () => Promise<void> {
    const queryClient = useQueryClient();

    return () => queryClient.invalidateQueries({ queryKey: queryKeys.recalcQueues() });
}

/**
 * Queues a player for a variant. The queue is loaded again afterwards, whether or not it worked,
 * since the server may have refused because the queue changed.
 */
export function useQueuePlayer(): UseMutationResult<RecalcEntryView, ApiError, QueuePlayerRequest> {
    const refresh = useRefreshQueues();

    return useMutation({
        mutationFn: ({ variant, player }: QueuePlayerRequest) =>
            requestJson<RecalcEntryView>("POST", "/api/recalc/queue", {
                variant,
                ...toPlayerFields(player),
            }),
        onSettled: refresh,
    });
}

/** Removes a waiting entry from the queue, given its ID. */
export function useRemoveQueueEntry(): UseMutationResult<void, ApiError, string> {
    const refresh = useRefreshQueues();

    return useMutation({
        mutationFn: (id: string) =>
            requestJson<void>("DELETE", `/api/recalc/queue/${encodeURIComponent(id)}`),
        onSettled: refresh,
    });
}

/** What to start: a variant's full run, from where the last one stopped or from the beginning. */
export interface StartFullRunRequest {
    variant: string;

    /** Whether to clear the progress of the previous run, so every player is recalculated again. */
    restart: boolean;
}

/** Starts a variant's full run. Admins only; the server refuses anybody else. */
export function useStartFullRun(): UseMutationResult<void, ApiError, StartFullRunRequest> {
    const refresh = useRefreshQueues();

    return useMutation({
        mutationFn: ({ variant, restart }: StartFullRunRequest) =>
            requestJson<void>(
                "POST",
                `/api/recalc/full-runs/${encodeURIComponent(variant)}/start`,
                {
                    restart,
                },
            ),
        onSettled: refresh,
    });
}

/**
 * Stops a variant's full run, given the variant's name. Players that are being calculated finish,
 * and no new player starts. Admins only.
 */
export function useStopFullRun(): UseMutationResult<void, ApiError, string> {
    const refresh = useRefreshQueues();

    return useMutation({
        mutationFn: (variant: string) =>
            requestJson<void>("POST", `/api/recalc/full-runs/${encodeURIComponent(variant)}/stop`),
        onSettled: refresh,
    });
}
