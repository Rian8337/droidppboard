import { PPEntry } from "./PPEntry";

/**
 * Represents a prototype droid performance points (dpp) entry.
 */
export interface PrototypePPEntry extends PPEntry {
    /**
     * The pp before the score was recalculated.
     */
    prevPP: number;
}
