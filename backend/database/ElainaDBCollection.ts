import { Db } from "mongodb";
import { MapBlacklistCollectionManager } from "./managers/elainaDb/MapBlacklistCollectionManager";
import { MapWhitelistCollectionManager } from "./managers/elainaDb/MapWhitelistCollectionManager";
import { UserBindCollectionManager } from "./managers/elainaDb/UserBindCollectionManager";

/**
 * Contains collections from Elaina DB.
 */
export class ElainaDBCollection {
    /**
     * The database collection for blacklisted beatmaps (dpp-related).
     */
    readonly mapBlacklist: MapBlacklistCollectionManager;

    /**
     * The database collection for whitelisted beatmaps (dpp-related).
     */
    readonly mapWhitelist: MapWhitelistCollectionManager;

    /**
     * The database collection for Discord users who have their osu!droid account(s) binded.
     */
    readonly userBind: UserBindCollectionManager;

    /**
     * @param elainaDb The database that is shared with the old bot (Nero's database).
     */
    constructor(elainaDb: Db) {
        this.mapBlacklist = new MapBlacklistCollectionManager(
            elainaDb.collection("mapblacklist")
        );
        this.mapWhitelist = new MapWhitelistCollectionManager(
            elainaDb.collection("mapwhitelist")
        );
        this.userBind = new UserBindCollectionManager(
            elainaDb.collection("userbind")
        );
    }
}
