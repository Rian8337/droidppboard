import type { PPVariant } from "app-structures";
import { defaultVariant } from "../routing/paths";

function getBuiltTime(variant: PPVariant): number {
    return variant.builtAt === null ? -Infinity : Date.parse(variant.builtAt);
}

/**
 * Orders variants for the sidebar: `droid-rebalance` first, then the pinned ones, then the rest.
 * Within each group the most recently built come first, with those never built last and ties
 * broken by name. Does not change the given list.
 */
export function sortVariants(variants: readonly PPVariant[]): PPVariant[] {
    return variants.toSorted((a, b) => {
        if (a.name === defaultVariant || b.name === defaultVariant) {
            return Number(b.name === defaultVariant) - Number(a.name === defaultVariant);
        }

        if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1;
        }

        const aBuilt = getBuiltTime(a);
        const bBuilt = getBuiltTime(b);

        if (aBuilt !== bBuilt) {
            return aBuilt > bBuilt ? -1 : 1;
        }

        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
}
