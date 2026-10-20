import { PPVariant } from "app-structures";
import { BrokerClient } from "../clients/BrokerClient";

const defaultVariantName = "droid-rebalance";

/**
 * The name of the live variant, which is the baseline that the others are compared with and is
 * never offered as a variant of its own.
 */
export const liveVariantName = "droid-live";

/**
 * Checks whether a variant is one the board offers: a droid one other than the live variant.
 *
 * @param variant The variant.
 */
function isOfferedVariant(variant: PPVariant): boolean {
    return (
        (variant.mode === "droid" || variant.mode === null) &&
        variant.name !== liveVariantName
    );
}

/**
 * Lists the droid prototype variants that a person may view, sorted by name. The live variant is
 * left out.
 *
 * @param actingUid The uid of the person to act for, or `undefined` for a visitor.
 * @returns The variants, or `null` if they could not be fetched.
 */
export async function listVisibleDroidVariants(
    actingUid?: number,
): Promise<PPVariant[] | null> {
    const allVariants = await BrokerClient.getVariants(actingUid);

    if (allVariants === null) {
        return null;
    }

    return allVariants
        .filter(isOfferedVariant)
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/**
 * Finds a variant by its name or alias among listed variants.
 *
 * @param variants The variants, as {@link listVisibleDroidVariants} lists them.
 * @param name The name or alias of the variant.
 * @returns The variant, or `undefined` if it is not among them.
 */
export function findListedVariant(
    variants: PPVariant[],
    name: string,
): PPVariant | undefined {
    return variants.find((v) => v.name === name || v.aliases.includes(name));
}

/**
 * Resolves the droid prototype variant that a person may view, asking the broker for that variant
 * alone.
 *
 * The broker answers a variant the person cannot see the same as one that does not exist.
 *
 * @param name The name or alias of the variant. Defaults to `droid-rebalance`.
 * @param actingUid The uid of the person to act for, or `undefined` for a visitor.
 * @returns The variant; `"notFound"` if the person may not view it or it is not a droid variant;
 * or `"unavailable"` if it could not be fetched.
 */
export async function resolveVisibleVariant(
    name: string | undefined,
    actingUid?: number,
): Promise<PPVariant | "notFound" | "unavailable"> {
    const requested = name ?? defaultVariantName;

    // Query parameters can be parsed into arrays or objects, so the type has to be checked.
    if (typeof requested !== "string") {
        return "notFound";
    }

    const variant = await BrokerClient.getVariant(requested, actingUid);

    if (variant === null) {
        return "unavailable";
    }

    return variant !== "notFound" && isOfferedVariant(variant)
        ? variant
        : "notFound";
}
