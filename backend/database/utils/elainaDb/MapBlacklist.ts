import { DatabaseManager } from "../../DatabaseManager";
import { DatabaseMapBlacklist } from "../../structures/elainaDb/DatabaseMapBlacklist";
import { ObjectId } from "bson";

/**
 * Represents a blacklisted beatmap.
 */
export class MapBlacklist implements DatabaseMapBlacklist {
    beatmapID: number;
    reason: string;
    readonly _id?: ObjectId;

    constructor(data: DatabaseMapBlacklist = DatabaseManager.elainaDb?.collections.mapBlacklist.defaultDocument ?? {}) {
        this._id = data._id;
        this.beatmapID = data.beatmapID;
        this.reason = data.reason;
    }
}