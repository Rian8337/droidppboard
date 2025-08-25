import { MultiplayerTeamMode } from "./MultiplayerTeamMode";
import { MultiplayerWinCondition } from "./MultiplayerWinCondition";

/**
 * Represents a multiplayer session.
 */
export interface MultiplayerSession {
    /**
     * The ID of this room.
     */
    readonly id: string;

    /**
     * The name of this room.
     */
    readonly name: string;

    /**
     * The start time of this session, in ISO 8601 format.
     */
    readonly start_time: string;

    /**
     * The map hash of this session.
     */
    readonly map_hash: string;

    /**
     * The map name of this session.
     */
    readonly map_name: string;

    /**
     * The win condition of this session.
     */
    readonly win_condition: MultiplayerWinCondition;

    /**
     * The team mode of this session.
     */
    readonly team_mode: MultiplayerTeamMode;

    /**
     * Whether the remove slider lock setting was enabled.
     */
    readonly remove_slider_lock: boolean;
}
