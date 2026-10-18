import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PPVariant } from "app-structures";
import { requestJson } from "./http";
import { queryKeys } from "./queryKeys";

/**
 * The variants the person may see. Private variants are only included for those they are shared
 * with, so this is cleared when who is logged in changes.
 */
export function useVariants(): UseQueryResult<PPVariant[]> {
    return useQuery({
        queryKey: queryKeys.variants(),
        queryFn: () => requestJson<PPVariant[]>("GET", "/api/ppboard/variants"),
    });
}
