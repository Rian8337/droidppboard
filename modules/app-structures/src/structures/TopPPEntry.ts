import { PPEntry } from "./PPEntry";

/**
 * Represents a PP entry that will be displayed in top plays list.
 */
export interface TopPPEntry extends PPEntry {
    /**
     * The username of the player who has this entry.
     */
    username: string;
}