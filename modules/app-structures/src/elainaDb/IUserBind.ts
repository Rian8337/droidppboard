import { PPEntry } from "../structures/PPEntry";
import { RecalculationProgress } from "../structures/RecalculationProgress";

/**
 * Represents a Discord user who has at least one osu!droid account binded.
 */
export interface IUserBind {
    /**
     * The Discord ID of the user.
     */
    discordid: string;

    /**
     * The UID of the osu!droid account binded to the user.
     */
    uid: number;

    /**
     * The username of the osu!droid account binded to the user.
     */
    username: string;

    /**
     * The total droid performance points (dpp) that the user has.
     */
    pptotal: number;

    /**
     * The play count of the user (how many scores the user has submitted into the dpp system).
     */
    playc: number;

    /**
     * The droid performance points entries of the user.
     */
    pp: PPEntry[];

    /**
     * The clan the user is currently in.
     */
    clan?: string;

    /**
     * The UID of osu!droid accounts that are binded to the user.
     *
     * A user can only bind up to 2 osu!droid accounts, therefore
     * the maximum length of this array will never exceed 2.
     */
    previous_bind: number[];

    /**
     * The epoch time at which the user can join another clan, in seconds.
     */
    joincooldown?: number;

    /**
     * The last clan that the user was in.
     */
    oldclan?: string;

    /**
     * The epoch time at which the user can rejoin his/her old clan, in seconds.
     */
    oldjoincooldown?: number;

    /**
     * Whether the user has asked for droid performance points and ranked score recalculation.
     */
    hasAskedForRecalc: boolean;

    /**
     * Whether the ongoing dpp scan is completed for this user.
     */
    dppScanComplete?: boolean;

    /**
     * Whether the ongoing dpp recalculation is completed for this user.
     */
    dppRecalcComplete?: boolean;

    /**
     * Progress of ongoing dpp calculation.
     */
    calculationInfo?: RecalculationProgress;
}
