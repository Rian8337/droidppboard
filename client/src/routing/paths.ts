import type { CalculationScope } from "app-structures";

export type VariantTab = "info" | "leaderboard" | "top-plays" | "queue" | "calculator" | "admin";

/** The variant the site opens on. */
export const defaultVariant = "droid-rebalance";

export function getVariantPath(variant: string, tab: VariantTab = "leaderboard"): string {
    return `/v/${encodeURIComponent(variant)}/${tab}`;
}

export function getProfilePath(variant: string, uid: number): string {
    return `/v/${encodeURIComponent(variant)}/players/${uid}`;
}

/**
 * The path of a calculation snapshot. A snapshot of the Beatmap calculator tool belongs to no
 * single variant, so `variant` only matters for the `variant` scope.
 */
export function getSnapshotPath(scope: CalculationScope, variant: string, id: string): string {
    const encodedId = encodeURIComponent(id);

    return scope === "variant"
        ? `/v/${encodeURIComponent(variant)}/calculator/s/${encodedId}`
        : `/calculate/s/${encodedId}`;
}
