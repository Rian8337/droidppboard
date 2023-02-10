import { PPEntry } from "./PPEntry";

/**
 * Represents a top droid performance points (dpp) entry produced using
 * the old dpp calculation algorithm.
 */
export interface TopOldPPEntry extends PPEntry {
    /**
     * The username of the player who has this entry.
     */
    username: string;
}
