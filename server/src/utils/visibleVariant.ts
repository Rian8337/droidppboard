import { PPVariant } from "app-structures";
import { BrokerClient } from "../clients/BrokerClient";

const defaultVariantName = "droid-rebalance";

/**
 * Resolves the droid prototype variant that a person may view.
 *
 * Variants the person cannot see are left out of the broker's list, so asking for one answers
 * the same as asking for one that does not exist.
 *
 * @param name The name or alias of the variant. Defaults to `droid-rebalance`.
 * @param actingUid The uid of the person to act for, or `undefined` for a visitor.
 * @returns The droid variants the person can see, sorted by name, along with the requested one;
 * `"notFound"` if it is not among them; or `"unavailable"` if the variants could not be fetched.
 */
export async function resolveVisibleVariant(
    name: string | undefined,
    actingUid?: number,
): Promise<
    { variants: PPVariant[]; current: PPVariant } | "notFound" | "unavailable"
> {
    const requested = name ?? defaultVariantName;
    const allVariants = await BrokerClient.getVariants(actingUid);

    if (allVariants === null) {
        return "unavailable";
    }

    const variants = allVariants
        .filter((v) => v.mode === "droid" || v.mode === null)
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    // Query parameters can be parsed into arrays or objects, so the type has to be checked.
    const current =
        typeof requested === "string"
            ? variants.find(
                  (v) => v.name === requested || v.aliases.includes(requested),
              )
            : undefined;

    return current ? { variants, current } : "notFound";
}
