import { Db } from "mongodb";
import { DPPAPIKeyCollectionManager } from "./managers/aliceDb/DPPAPIKeyCollectionManager";
import { PrototypePPCollectionManager } from "./managers/aliceDb/PrototypePPCollectionManager";

/**
 * Contains collections from Alice DB.
 */
export class AliceDBCollection {
    /**
     * The database collection for droid performance point (dpp) API keys.
     */
    readonly dppAPIKey: DPPAPIKeyCollectionManager;

    /**
     * The database collection for prototype droid performance point (dpp) entries of osu!droid players.
     */
    readonly prototypePP: PrototypePPCollectionManager;

    /**
     * @param aliceDb The database that is only used by this bot (my database).
     */
    constructor(aliceDb: Db) {
        this.dppAPIKey = new DPPAPIKeyCollectionManager(
            aliceDb.collection("ppapikey")
        );
        this.prototypePP = new PrototypePPCollectionManager(
            aliceDb.collection("prototypepp")
        );
    }
}
