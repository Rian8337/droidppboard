import { DatabaseManager } from "../../DatabaseManager";
import { DatabaseMapWhitelist } from "../../structures/elainaDb/DatabaseMapWhitelist";
import { WhitelistDifficultyStatistics } from "../../../structures/WhitelistDifficultyStatistics";
import { ObjectId } from "bson";

/**
 * Represents a whitelisted beatmap.
 */
export class MapWhitelist implements DatabaseMapWhitelist {
    mapid: number;
    hashid: string;
    mapname: string;
    diffstat: WhitelistDifficultyStatistics;
    whitelistScanDone?: boolean;
    readonly _id?: ObjectId;

    constructor(data: DatabaseMapWhitelist = DatabaseManager.elainaDb?.collections.mapWhitelist.defaultDocument ?? {}) {
        this._id = data._id;
        this.mapid = data.mapid;
        this.hashid = data.hashid;
        this.mapname = data.mapname;
        this.diffstat = data.diffstat;
    }
}