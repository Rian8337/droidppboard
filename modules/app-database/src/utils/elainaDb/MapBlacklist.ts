import { DatabaseManager } from "../../managers/DatabaseManager";
import { DatabaseMapBlacklist } from "../../structures/elainaDb/DatabaseMapBlacklist";

/**
 * Represents a blacklisted beatmap.
 */
export class MapBlacklist implements DatabaseMapBlacklist {
    beatmapID: number;
    reason: string;

    constructor(data: DatabaseMapBlacklist = DatabaseManager.elainaDb?.collections.mapBlacklist.defaultDocument ?? {}) {
        this.beatmapID = data.beatmapID;
        this.reason = data.reason;
    }
}