import { Collection } from "mongodb";
import { DatabaseUtilityConstructor } from "../../DatabaseUtilityConstructor";
import { DatabaseDPPAPIKey } from "../../structures/aliceDb/DatabaseDPPAPIKey";
import { DPPAPIKey } from "../../utils/aliceDb/DPPAPIKey";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `dppapikey` collection.
 */
export class DPPAPIKeyCollectionManager extends DatabaseCollectionManager<
    DatabaseDPPAPIKey,
    DPPAPIKey
> {
    protected override readonly utilityInstance: DatabaseUtilityConstructor<
        DatabaseDPPAPIKey,
        DPPAPIKey
    >;

    override get defaultDocument(): DatabaseDPPAPIKey {
        return {
            key: "",
            owner: "",
        };
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<DatabaseDPPAPIKey>) {
        super(collection);

        this.utilityInstance = <
            DatabaseUtilityConstructor<DatabaseDPPAPIKey, DPPAPIKey>
        >new DPPAPIKey().constructor;
    }
}
