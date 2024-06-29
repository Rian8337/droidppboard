import { IPrototypePP } from "../aliceDb/IPrototypePP";
import { IPrototypePPType } from "../aliceDb/IPrototypePPType";

/**
 * The response from the server when fetching the prototype leaderboard.
 */
export interface PrototypeLeaderboardResponse<T> {
    /**
     * The reworks available for the prototype leaderboard.
     */
    readonly reworks: IPrototypePPType[];

    /**
     * The current rework being displayed.
     */
    readonly currentRework?: IPrototypePPType;

    /**
     * The data for the prototype leaderboard.
     */
    readonly data: T[];
}
