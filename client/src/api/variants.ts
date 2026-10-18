import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PPVariant } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/**
 * The variants the person may see. Private variants are only included for those they are shared
 * with, so this is cleared when who is logged in changes. A page that needs them only sometimes
 * can pass `isEnabled: false` to skip loading.
 */
export function useVariants({ isEnabled = true }: { isEnabled?: boolean } = {}): UseQueryResult<
    PPVariant[]
> {
    return useQuery({
        enabled: isEnabled,
        queryKey: queryKeys.variants(),
        queryFn: () => requestJson<PPVariant[]>("GET", "/api/ppboard/variants"),
    });
}
