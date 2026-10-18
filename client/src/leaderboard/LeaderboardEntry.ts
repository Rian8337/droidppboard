import type { PrototypePlayer } from "app-structures";

/** A leaderboard row: a player and where they rank across the variant. */
export interface LeaderboardEntry {
    rank: number;
    player: PrototypePlayer;
}
