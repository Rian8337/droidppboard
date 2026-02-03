import { SerializedMod } from "@rian8337/osu-base";
import { MultiplayerTeam } from "./MultiplayerTeam";

/**
 * Represents a multiplayer score.
 */
export interface MultiplayerScore {
    /**
     * The ID of the user who achieved this score.
     */
    readonly userId: number;

    /**
     * The name of the user who achieved this score.
     */
    readonly userName: string;

    /**
     * The total score achieved in this score.
     */
    readonly score: number;

    /**
     * The accuracy of this score.
     */
    readonly accuracy: number;

    /**
     * The number of 300s of this score.
     */
    readonly hit300: number;

    /**
     * The number of 100s of this score.
     */
    readonly hit100: number;

    /**
     * The number of 50s of this score.
     */
    readonly hit50: number;

    /**
     * The number of misses of this score.
     */
    readonly hit0: number;

    /**
     * The maximum combo of this score.
     */
    readonly maxCombo: number;

    /**
     * Whether this user is alive at the time of submission.
     */
    readonly isAlive: boolean;

    /**
     * The team of this user.
     */
    readonly team?: MultiplayerTeam;

    /**
     * The mods played in this score.
     */
    readonly playMod: SerializedMod[];
}
