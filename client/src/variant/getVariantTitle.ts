import type { PPVariant } from "app-structures";

/** The name to show for a variant: its title if it has one, else its name. */
export function getVariantTitle(variant: Pick<PPVariant, "name" | "title">): string {
    return variant.title ?? variant.name;
}
