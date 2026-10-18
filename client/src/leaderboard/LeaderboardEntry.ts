import type { IPrototypePP } from "app-structures";

/** A leaderboard row: a player and where they rank across the variant. */
export interface LeaderboardEntry {
    rank: number;
    player: IPrototypePP;
}
