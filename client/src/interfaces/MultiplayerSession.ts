import { MultiplayerScore } from "./MultiplayerScore";
import { MultiplayerTeamMode } from "./MultiplayerTeamMode";
import { MultiplayerWinCondition } from "./MultiplayerWinCondition";

/**
 * Represents a multiplayer session.
 */
export interface MultiplayerSession {
    /**
     * The ID of the session.
     */
    readonly id: number;

    /**
     * The name of the beatmap.
     */
    readonly mapName: string;

    /**
     * The time at which the session started, in ISO 8601 format.
     */
    readonly startTime: string;

    /**
     * The win condition of this session.
     */
    readonly winCondition: MultiplayerWinCondition;

    /**
     * The team mode of this session.
     */
    readonly teamMode: MultiplayerTeamMode;

    /**
     * Whether the remove slider lock setting was enabled.
     */
    readonly removeSliderLock: boolean;

    /**
     * The scores in this session.
     */
    readonly scores: MultiplayerScore[];
}
