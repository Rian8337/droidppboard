import type { PrototypePPEntry } from "../structures/PrototypePPEntry";

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
    localPPTotal: number;

    /**
     * The total droid performance points (dpp) of the account before recalculation.
     */
    livePPTotal: number;

    /**
     * The total performance points of the account in the master recalculation.
     */
    masterPPTotal?: number;

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
    scanDone?: boolean;

    /**
     * The variant the profile is in.
     */
    reworkType: string;

    /**
     * The build (`builtAt`) of each variant whose calculations the entries hold, for the variants whose build stayed
     * the same throughout the profile's calculation. Calculations of a variant are only reused while its build is the
     * one recorded here.
     */
    calculatorBuilds?: Record<string, string>;
}
