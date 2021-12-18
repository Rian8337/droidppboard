import { DisplayPrototypePPEntry } from "./DisplayPrototypePPEntry";

/**
 * Represents a PP entry that will be displayed in top plays list.
 */
export interface TopPrototypePPEntry extends DisplayPrototypePPEntry {
    /**
     * The username of the player who has this entry.
     */
    username: string;
}
