import { ObjectId } from "bson";
import { ModUtil } from "@rian8337/osu-base";
import { DisplayPrototypePPEntry } from "../../../structures/DisplayPrototypePPEntry";
import { PrototypePPEntry } from "../../../structures/PrototypePPEntry";
import { DatabaseManager } from "../../DatabaseManager";
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
    readonly _id?: ObjectId;

    constructor(
        data: DatabasePrototypePP = DatabaseManager.aliceDb?.collections
            .prototypePP.defaultDocument ?? {}
    ) {
        this._id = data._id;
        this.discordid = data.discordid;
        this.lastUpdate = data.lastUpdate;
        this.pp = data.pp;
        this.pptotal = data.pptotal;
        this.prevpptotal = data.prevpptotal;
        this.uid = data.uid;
        this.previous_bind = data.previous_bind;
        this.username = data.username;
        this.scanDone = data.scanDone;
    }

    /**
     * Converts this user's pp list into an array for displaying in site.
     */
    ppToDisplay(): DisplayPrototypePPEntry[] {
        const arr: DisplayPrototypePPEntry[] = [];

        for (const entry of this.pp) {
            arr.push({
                ...entry,
                displayMods: ModUtil.pcStringToMods(entry.mods),
            });
        }

        return arr;
    }
}
