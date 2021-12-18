import { MapBlacklist } from "../../utils/elainaDb/MapBlacklist";
import { DatabaseMapBlacklist } from "../../structures/elainaDb/DatabaseMapBlacklist";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";
import { Collection } from "mongodb";
import { DatabaseUtilityConstructor } from "../../DatabaseUtilityConstructor";

/**
 * A manager for the `mapblacklist` collection.
 */
export class MapBlacklistCollectionManager extends DatabaseCollectionManager<
    DatabaseMapBlacklist,
    MapBlacklist
> {
    protected override readonly utilityInstance: DatabaseUtilityConstructor<
        DatabaseMapBlacklist,
        MapBlacklist
    >;

    override get defaultDocument(): DatabaseMapBlacklist {
        return {
            beatmapID: 0,
            reason: "",
        };
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<DatabaseMapBlacklist>) {
        super(collection);

        this.utilityInstance = <
            DatabaseUtilityConstructor<DatabaseMapBlacklist, MapBlacklist>
        >new MapBlacklist().constructor;
    }
}
