import { Db } from "mongodb";
import { PlayerSkinCollectionManager } from "./aliceDb/PlayerSkinCollectionManager";
import { PrototypePPCollectionManager } from "./aliceDb/PrototypePPCollectionManager";

/**
 * Contains collections from Alice DB.
 */
export class AliceDBCollection {
    /**
     * The database collection for prototype droid performance point (dpp) entries of osu!droid players.
     */
    readonly prototypePP: PrototypePPCollectionManager;

    /**
     * The database collection for player skins.
     */
    readonly playerSkins: PlayerSkinCollectionManager;

    /**
     * @param aliceDb The database that is only used by this bot (my database).
     */
    constructor(aliceDb: Db) {
        this.prototypePP = new PrototypePPCollectionManager(
            aliceDb.collection("prototypepp")
        );
        this.playerSkins = new PlayerSkinCollectionManager(
            aliceDb.collection("playerskins")
        );
    }
}
