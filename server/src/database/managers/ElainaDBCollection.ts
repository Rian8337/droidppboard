import { Db } from "mongodb";
import { MapWhitelistCollectionManager } from "./elainaDb/MapWhitelistCollectionManager";

/**
 * Contains collections from Elaina DB.
 */
export class ElainaDBCollection {
    /**
     * The database collection for whitelisted beatmaps (dpp-related).
     */
    readonly mapWhitelist: MapWhitelistCollectionManager;

    /**
     * @param elainaDb The database that is shared with the old bot (Nero's database).
     */
    constructor(elainaDb: Db) {
        this.mapWhitelist = new MapWhitelistCollectionManager(
            elainaDb.collection("mapwhitelist"),
        );
    }
}
