import {
    useMutation,
    useQuery,
    useQueryClient,
    type QueryClient,
    type UseQueryResult,
} from "@tanstack/react-query";
import { ApiError, requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/** The person who is logged in. */
export interface Me {
    readonly uid: number;
    readonly username: string;
    readonly role: "admin" | "manager" | null;

    /** The names of the variants a manager may manage. */
    readonly grants: readonly string[];
}

export interface LoginCredentials {
    readonly username: string;
    readonly password: string;
    readonly turnstileToken: string;
}

async function fetchMe(): Promise<Me | null> {
    try {
        return await requestJson<Me>("GET", "/api/auth/me");
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            return null;
        }

        throw error;
    }
}

/**
 * Drops everything cached and loads who is logged in again. What was seen as one person must not
 * survive as another, so nothing is kept, not even the variants everyone can see.
 */
async function resetSession(queryClient: QueryClient): Promise<void> {
    await queryClient.cancelQueries();
    queryClient.clear();
    await queryClient.fetchQuery({ queryKey: queryKeys.me(), queryFn: fetchMe, staleTime: 0 });
}

/**
 * The person who is logged in, or `null` if nobody is.
 */
export function useMe(): UseQueryResult<Me | null> {
    return useQuery({ queryKey: queryKeys.me(), queryFn: fetchMe, staleTime: Infinity });
}

/**
 * Logs in. On success the cache is cleared and the person is loaded again.
 */
export function useLogin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (credentials: LoginCredentials) =>
            requestJson<{ uid: number; username: string }>("POST", "/api/auth/login", credentials),
        onSuccess: () => resetSession(queryClient),
    });
}

/**
 * Logs out. On success the cache is cleared and the person is loaded again, so that no private
 * data stays on screen.
 */
export function useLogout() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => requestJson<void>("POST", "/api/auth/logout"),
        onSuccess: () => resetSession(queryClient),
    });
}
