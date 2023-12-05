import { MultiplayerTeam } from "./MultiplayerTeam";

/**
 * The structure of a multiplayer score in the database.
 */
export interface MultiplayerScore {
    /**
     * The ID of this session.
     */
    readonly session_id: string;

    /**
     * The ID of this room.
     */
    readonly room_id: string;

    /**
     * The ID of this user.
     */
    readonly user_id: string;

    /**
     * The name of this user.
     */
    readonly user_name: string;

    /**
     * The (numeric) score of this score.
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
     * The max combo of this score.
     */
    readonly max_combo: number;

    /**
     * Whether this user is alive.
     */
    readonly is_alive: boolean;

    /**
     * The team of this user.
     */
    readonly team?: MultiplayerTeam;

    /**
     * The play mod of this score.
     */
    readonly play_mod: string;
}
