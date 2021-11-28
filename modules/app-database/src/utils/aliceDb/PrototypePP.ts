import { PrototypePPEntry } from "app-structures";
import { DatabaseManager } from "../../managers/DatabaseManager";
import { DatabasePrototypePP } from "../../structures/aliceDb/DatabasePrototypePP";

/**
 * Represents the prototype droid performance point (dpp) entry of an osu!droid account.
 */
export class PrototypePP implements DatabasePrototypePP {
    discordid: string;
    lastUpdate: number;
    pp: PrototypePPEntry[];
    pptotal: number;
    prevpptotal: number;
    uid: number;
    previous_bind: number[];
    username: string;
    scanDone: boolean;

    constructor(data: DatabasePrototypePP = DatabaseManager.aliceDb?.collections.prototypePP.defaultDocument ?? {}) {
        this.discordid = data.discordid;
        this.lastUpdate = data.lastUpdate;
        this.pp = data.pp ?? [];
        this.pptotal = data.pptotal;
        this.prevpptotal = data.prevpptotal;
        this.uid = data.uid;
        this.previous_bind = data.previous_bind ?? [];
        this.username = data.username;
        this.scanDone = data.scanDone;
    }
}