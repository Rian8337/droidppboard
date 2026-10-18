import type { PPVariant } from "app-structures";
import { useParams } from "react-router";
import { useVariants } from "../api/variants";
import { findVariant } from "./findVariant";

export interface CurrentVariant {
    /** The variant the address names, or `undefined` while loading, if it failed, or if there is none. */
    readonly variant: PPVariant | undefined;
    readonly isLoading: boolean;
    readonly error: Error | null;
    readonly refetch: () => void;
}

/**
 * The variant the address names, matched by name or alias among the variants the person may see.
 * One that does not exist and one that is private to others look the same: no variant.
 */
export function useCurrentVariant(): CurrentVariant {
    const { variant: name } = useParams();
    const { data: variants, isPending, error, refetch } = useVariants();

    return {
        variant: findVariant(variants, name),
        isLoading: isPending,
        error,
        refetch: () => void refetch(),
    };
}
