import { DatabaseCollectionManager } from "../DatabaseCollectionManager";
import { Collection } from "mongodb";
import { IMapBlacklist } from "app-structures";

/**
 * A manager for the `mapblacklist` collection.
 */
export class MapBlacklistCollectionManager extends DatabaseCollectionManager<IMapBlacklist> {
    override get defaultDocument(): IMapBlacklist {
        return {
            beatmapID: 0,
            reason: "",
        };
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<IMapBlacklist>) {
        super(collection);
    }
}
