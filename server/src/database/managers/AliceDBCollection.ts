import { Db } from "mongodb";
import { PlayerSkinCollectionManager } from "./aliceDb/PlayerSkinCollectionManager";
import { PrototypePPCollectionManager } from "./aliceDb/PrototypePPCollectionManager";
import { InGamePPCollectionManager } from "./aliceDb/InGamePPCollectionManager";

/**
 * Contains collections from Alice DB.
 */
export class AliceDBCollection {
    /**
     * The database collection for in-game performance points (pp) entries of osu!droid players.
     */
    readonly inGamePP: InGamePPCollectionManager;

    /**
     * The database collection for prototype droid performance points (dpp) entries of osu!droid players.
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
        this.inGamePP = new InGamePPCollectionManager(
            aliceDb.collection("ingamepp"),
        );
        this.prototypePP = new PrototypePPCollectionManager(
            aliceDb.collection("prototypepp"),
        );
        this.playerSkins = new PlayerSkinCollectionManager(
            aliceDb.collection("playerskins"),
        );
    }
}
