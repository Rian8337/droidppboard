import { PrototypePPEntry } from "../structures/PrototypePPEntry";

/**
 * Represents the prototype droid performance point (dpp) entry of an osu!droid account.
 */
export interface IPrototypePP {
    /**
     * The epoch time at which the account is last
     * recalculated, in milliseconds.
     */
    lastUpdate: number;

    /**
     * The prototype droid performance points (dpp) entries of the account.
     */
    pp: PrototypePPEntry[];

    /**
     * The total droid performance points (dpp) of the account after recalculation.
     */
    pptotal: number;

    /**
     * The total droid performance points (dpp) of the account before recalculation.
     */
    prevpptotal: number;

    /**
     * The UID of the account.
     */
    uid: number;

    /**
     * The username of the account.
     */
    username: string;

    /**
     * Whether this prototype entry has been calculated against the latest changes.
     */
    scanDone: boolean;

    /**
     * The type of rework the profile is in.
     */
    reworkType: string;
}
