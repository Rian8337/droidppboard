import type { TopPrototypePPEntry } from "./TopPrototypePPEntry";

/**
 * A top play as the server presents it.
 */
export interface PrototypeTopPlay extends TopPrototypePPEntry {
    /**
     * The uppercase two-letter code of the country of the player who has this entry, or `null` if
     * it is unknown.
     */
    country: string | null;
}
