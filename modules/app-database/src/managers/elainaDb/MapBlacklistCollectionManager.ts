import { DatabaseMapBlacklist } from "../../structures/elainaDb/DatabaseMapBlacklist";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";
import { Collection } from "mongodb";

/**
 * A manager for the `mapblacklist` collection.
 */
export class MapBlacklistCollectionManager extends DatabaseCollectionManager<DatabaseMapBlacklist> {
    override get defaultDocument(): DatabaseMapBlacklist {
        return {
            beatmapID: 0,
            reason: ""
        };
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<DatabaseMapBlacklist>) {
        super(collection);
    }
}