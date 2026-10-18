import type { PPVariant } from "./PPVariant";

/**
 * The response from the server when fetching a prototype page.
 */
export interface PrototypeLeaderboardResponse<T> {
    /**
     * The droid prototype variants the viewer can see.
     */
    readonly variants: PPVariant[];

    /**
     * The variant being displayed.
     */
    readonly currentVariant: PPVariant;

    /**
     * The data for the page.
     */
    readonly data: T;
}
