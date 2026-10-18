import { CalculationScope } from "app-structures";
import { liveVariantName } from "../utils/visibleVariant";

/**
 * The variants that the beatmap calculator tool offers.
 */
export const toolVariantNames = [
    liveVariantName,
    "droid-rebalance",
    "osu-live",
    "osu-rebalance",
] as const;

export type ToolVariantName = (typeof toolVariantNames)[number];

const toolBaselines: Readonly<Record<ToolVariantName, string | null>> = {
    "droid-live": null,
    "droid-rebalance": liveVariantName,
    "osu-live": null,
    "osu-rebalance": "osu-live",
};

/**
 * Checks whether a name is one of the variants that the beatmap calculator tool offers.
 *
 * @param name The name to check.
 * @returns Whether the name is a tool variant.
 */
export function isToolVariantName(name: string): name is ToolVariantName {
    return (toolVariantNames as readonly string[]).includes(name);
}

/**
 * Gets the variant that a variant is compared with.
 *
 * @param scope What the calculation is made for.
 * @param variant The name of the variant.
 * @returns The name of the baseline variant, or `null` if the variant is not compared with one.
 */
export function getBaselineVariant(
    scope: CalculationScope,
    variant: string,
): string | null {
    if (scope === "variant") {
        return liveVariantName;
    }

    return isToolVariantName(variant) ? toolBaselines[variant] : null;
}
