import type { IPrototypePP } from "../aliceDb/IPrototypePP";

/**
 * A player of a prototype variant as the server presents them.
 */
export interface PrototypePlayer extends IPrototypePP {
    /**
     * The uppercase two-letter code of the player's country, or `null` if it is unknown.
     */
    country: string | null;
}
