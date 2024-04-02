import { PPEntry } from "../structures/PPEntry";

/**
 * Represents the in-game droid performance points (dpp) entry of an osu!droid account.
 */
export interface IInGamePP {
    /**
     * The Discord ID bound to the osu!droid account.
     */
    discordid: string;

    /**
     * The epoch time at which the account is last recalculated, in milliseconds.
     */
    lastUpdate: number;

    /**
     * The play count of the user (how many scores the user have submitted into the dpp system).
     */
    playc: number;

    /**
     * The prototype droid performance points (dpp) entries of the account.
     */
    pp: PPEntry[];

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
     * The UID of osu!droid accounts that are bound to the user.
     *
     * A user can only bind up to 2 osu!droid accounts, therefore
     * the maximum length of this array will never exceed 2.
     */
    previous_bind: number[];

    /**
     * The username of the account.
     */
    username: string;
}
