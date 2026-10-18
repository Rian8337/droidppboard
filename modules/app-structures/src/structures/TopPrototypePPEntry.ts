import type { PrototypePPEntry } from "./PrototypePPEntry";

/**
 * Represents a PP entry that will be displayed in top plays list.
 */
export interface TopPrototypePPEntry extends PrototypePPEntry {
    /**
     * The UID of the player who has this entry.
     */
    uid: number;

    /**
     * The username of the player who has this entry.
     */
    username: string;
}
