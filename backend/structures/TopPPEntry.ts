import { PPEntry } from "./PPEntry";

/**
 * Represents a PP entry that is used for caching.
 */
export interface TopPPEntry extends PPEntry {
    /**
     * The username of the player who has this entry.
     */
    username: string;
}
