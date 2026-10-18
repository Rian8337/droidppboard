import { Db } from "mongodb";
import { CalculationSnapshotCollectionManager } from "./aliceDb/CalculationSnapshotCollectionManager";
import { PlayerSkinCollectionManager } from "./aliceDb/PlayerSkinCollectionManager";
import { PrototypePPCollectionManager } from "./aliceDb/PrototypePPCollectionManager";

/**
 * Contains collections from Alice DB.
 */
export class AliceDBCollection {
    /**
     * The database collection for prototype droid performance points (dpp) entries of osu!droid players.
     */
    readonly prototypePP: PrototypePPCollectionManager;

    /**
     * The database collection for player skins.
     */
    readonly playerSkins: PlayerSkinCollectionManager;

    /**
     * The database collection for stored calculations that expire.
     */
    readonly calculationSnapshots: CalculationSnapshotCollectionManager;

    /**
     * @param aliceDb The database that is only used by this bot (my database).
     */
    constructor(aliceDb: Db) {
        this.prototypePP = new PrototypePPCollectionManager(
            aliceDb.collection("prototypepp"),
        );
        this.playerSkins = new PlayerSkinCollectionManager(
            aliceDb.collection("playerskins"),
        );
        this.calculationSnapshots = new CalculationSnapshotCollectionManager(
            aliceDb.collection("calculationsnapshots"),
        );
    }
}
