import type { SerializedMod } from "@rian8337/osu-base";

/** The teams of a Team VS room. */
export const MultiplayerTeam = { red: 0, blue: 1 } as const;
export type MultiplayerTeam = (typeof MultiplayerTeam)[keyof typeof MultiplayerTeam];

/** The team modes of a room. */
export const MultiplayerTeamMode = { headToHead: 0, teamVS: 1 } as const;
export type MultiplayerTeamMode = (typeof MultiplayerTeamMode)[keyof typeof MultiplayerTeamMode];

/** The names of the team modes, by their value. */
export const teamModeNames = ["Head to Head", "Team VS"] as const;

/** The names of the win conditions, by their value. */
export const winConditionNames = ["Score", "Accuracy", "Combo", "Score V2"] as const;

/** One player's result in a multiplayer session. */
export interface MultiplayerScore {
    /** The ID of the player. In Team VS, 0 is the red team's total and 1 is the blue team's. */
    readonly userId: number;
    readonly userName: string;
    readonly score: number;
    readonly accuracy: number;
    readonly hit300: number;
    readonly hit100: number;
    readonly hit50: number;
    readonly hit0: number;
    readonly maxCombo: number;

    /** Whether the player was still alive when the score was submitted. */
    readonly isAlive: boolean;
    readonly team?: MultiplayerTeam;
    readonly playMod: SerializedMod[];
}

/** One beatmap played in a room. */
export interface MultiplayerSession {
    readonly id: number;
    readonly mapName: string;

    /** When the session started, in ISO 8601. */
    readonly startTime: string;
    readonly winCondition: number;
    readonly teamMode: number;
    readonly removeSliderLock: boolean;
    readonly scores: MultiplayerScore[];
}

/** What the tournament server answers for a room. */
export interface MultiplayerRoomHistory {
    readonly name: string;
    readonly sessions: MultiplayerSession[];
}
