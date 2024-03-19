import { DatabaseManager } from "../../managers/DatabaseManager";
import { IMapWhitelist, WhitelistDifficultyStatistics } from "app-structures";

/**
 * Represents a whitelisted beatmap.
 */
export class MapWhitelist implements IMapWhitelist {
    mapid: number;
    hashid: string;
    mapname: string;
    diffstat: WhitelistDifficultyStatistics;
    whitelistScanDone?: boolean;

    constructor(
        data: IMapWhitelist = DatabaseManager.elainaDb?.collections.mapWhitelist
            .defaultDocument ?? {}
    ) {
        this.mapid = data.mapid;
        this.hashid = data.hashid;
        this.mapname = data.mapname;
        this.diffstat = data.diffstat;
    }
}
