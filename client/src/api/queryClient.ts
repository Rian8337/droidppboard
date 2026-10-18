import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./http";

/**
 * Creates the client that caches the server's responses.
 *
 * @param retry Whether to retry a failed query once when the server was unreachable or failed.
 * Responses in the 4xx range are never retried, since asking again will not change them.
 */
export function createQueryClient({ retry = true }: { retry?: boolean } = {}): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                refetchOnWindowFocus: false,
                retry: retry
                    ? (failureCount, error) =>
                          failureCount < 1 &&
                          !(error instanceof ApiError && error.status >= 400 && error.status < 500)
                    : false,
            },
            mutations: { retry: false },
        },
    });
}

/** The client the app uses. */
export const queryClient = createQueryClient();
