import { DatabaseManager } from "../../managers/DatabaseManager";
import { DatabaseMapWhitelist } from "../../structures/elainaDb/DatabaseMapWhitelist";
import { WhitelistDifficultyStatistics } from "app-structures";

/**
 * Represents a whitelisted beatmap.
 */
export class MapWhitelist implements DatabaseMapWhitelist {
    mapid: number;
    hashid: string;
    mapname: string;
    diffstat: WhitelistDifficultyStatistics;
    whitelistScanDone?: boolean;

    constructor(data: DatabaseMapWhitelist = DatabaseManager.elainaDb?.collections.mapWhitelist.defaultDocument ?? {}) {
        this.mapid = data.mapid;
        this.hashid = data.hashid;
        this.mapname = data.mapname;
        this.diffstat = data.diffstat;
    }
}