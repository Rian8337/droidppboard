/**
 * Represents a blacklisted beatmap.
 */
export interface DatabaseMapBlacklist {
    /**
     * The ID of the beatmap.
     */
    beatmapID: number;

    /**
     * The reason the beatmap was blacklisted.
     */
    reason: string;
};