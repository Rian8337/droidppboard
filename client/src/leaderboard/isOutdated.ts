import type { IPrototypePP, PPVariant } from "app-structures";

/** Whether the player was last calculated before the variant's calculator was last built. */
export function isOutdated(player: IPrototypePP, variant: Pick<PPVariant, "builtAt">): boolean {
    return variant.builtAt !== null && player.lastUpdate < Date.parse(variant.builtAt);
}
