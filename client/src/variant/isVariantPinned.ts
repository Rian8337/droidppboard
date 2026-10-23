import type { PPVariant } from "app-structures";
import { defaultVariant } from "../routing/paths";

/**
 * Whether a variant is listed at the top of the sidebar. The default variant always leads it, so it counts as
 * pinned even though its stored flag cannot be set.
 */
export function isVariantPinned(variant: Pick<PPVariant, "name" | "pinned">): boolean {
    return variant.name === defaultVariant || variant.pinned;
}
