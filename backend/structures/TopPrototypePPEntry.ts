import { PrototypePPEntry } from "./PrototypePPEntry";

/**
 * Represents a PP entry that is used for caching.
 */
export interface TopPrototypePPEntry extends PrototypePPEntry {
    /**
     * The username of the player who has this entry.
     */
    username: string;
}
