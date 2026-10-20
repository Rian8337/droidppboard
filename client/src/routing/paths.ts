import type { CalculationScope } from "app-structures";

export type VariantTab = "info" | "leaderboard" | "top-plays" | "queue" | "calculator" | "admin";

/** The Beatmap calculator tool. */
export const beatmapCalculatorPath = "/calculate";

/** The variant the site opens on. */
export const defaultVariant = "droid-rebalance";

export function getVariantPath(variant: string, tab: VariantTab = "leaderboard"): string {
    return `/v/${encodeURIComponent(variant)}/${tab}`;
}

/** The queue tab of a variant, with `player` filled in to be queued when given. */
export function getQueuePath(variant: string, player?: number): string {
    const path = getVariantPath(variant, "queue");

    return player === undefined ? path : `${path}?player=${player}`;
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
        : `${beatmapCalculatorPath}/s/${encodedId}`;
}

/** The admin area's page for a variant's settings and access, which also reaches variants the sidebar lacks. */
export function getAdminVariantPath(variant: string): string {
    return `/admin/variants/${encodeURIComponent(variant)}`;
}
