import { ObjectId } from "bson";
import { DatabaseManager } from "../../DatabaseManager";
import { DatabaseDPPAPIKey } from "../../structures/aliceDb/DatabaseDPPAPIKey";

/**
 * Represents a DPP API key.
 */
export class DPPAPIKey implements DatabaseDPPAPIKey {
    key: string;
    owner: string;
    readonly _id?: ObjectId;

    constructor(
        data: DatabaseDPPAPIKey = DatabaseManager.aliceDb?.collections.dppAPIKey
            .defaultDocument ?? {}
    ) {
        this._id = data._id;
        this.key = data.key;
        this.owner = data.owner;
    }
}
