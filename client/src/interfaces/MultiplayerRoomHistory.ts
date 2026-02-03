import { MultiplayerSession } from "./MultiplayerSession";

/**
 * Response received when fetching match room history.
 */
export interface MultiplayerRoomHistory {
    /**
     * The name of the room.
     */
    readonly name: string;

    /**
     * The sessions in this room.
     */
    readonly sessions: MultiplayerSession[];
}
