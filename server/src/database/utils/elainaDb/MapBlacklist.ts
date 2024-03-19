import { IMapBlacklist, IMapWhitelist } from "app-structures";
import { DatabaseManager } from "../../managers/DatabaseManager";

/**
 * Represents a blacklisted beatmap.
 */
export class MapBlacklist implements IMapBlacklist {
    beatmapID: number;
    reason: string;

    constructor(
        data: IMapBlacklist = DatabaseManager.elainaDb?.collections.mapBlacklist
            .defaultDocument ?? {}
    ) {
        this.beatmapID = data.beatmapID;
        this.reason = data.reason;
    }
}
