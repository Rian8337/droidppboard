import { ObjectId } from "bson";
import { ModUtil } from "../../../modules/utils/ModUtil";
import { DisplayPPEntry } from "../../../structures/DisplayPPEntry";
import { PPEntry } from "../../../structures/PPEntry";
import { RecalculationProgress } from "../../../structures/RecalculationProgress";
import { DatabaseManager } from "../../DatabaseManager";
import { DatabaseUserBind } from "../../structures/elainaDb/DatabaseUserBind";

/**
 * Represents a Discord user who has at least one osu!droid account binded.
 */
export class UserBind implements DatabaseUserBind {
    discordid: string;
    uid: number;
    username: string;
    pptotal: number;
    playc: number;
    pp: PPEntry[];
    clan?: string;
    previous_bind: number[];
    joincooldown?: number;
    oldclan?: string;
    oldjoincooldown?: number;
    hasAskedForRecalc: boolean;
    dppScanComplete?: boolean;
    dppRecalcComplete?: boolean;
    calculationInfo?: RecalculationProgress;
    readonly _id?: ObjectId;

    constructor(
        data: DatabaseUserBind = DatabaseManager.elainaDb?.collections.userBind
            .defaultDocument ?? {}
    ) {
        this._id = data._id;
        this.discordid = data.discordid;
        this.uid = data.uid;
        this.username = data.username;
        this.pptotal = data.pptotal;
        this.playc = data.playc;
        this.pp = data.pp;
        this.clan = data.clan;
        this.previous_bind = data.previous_bind;
        this.joincooldown = data.joincooldown;
        this.oldclan = data.oldclan;
        this.oldjoincooldown = data.oldjoincooldown;
        this.hasAskedForRecalc = data.hasAskedForRecalc;
        this.dppScanComplete = data.dppScanComplete;
        this.dppRecalcComplete = data.dppRecalcComplete;
        this.calculationInfo = data.calculationInfo;
    }

    /**
     * Converts this user's pp list into an array for displaying in site.
     */
    ppToDisplay(): DisplayPPEntry[] {
        const arr: DisplayPPEntry[] = [];

        for (const entry of this.pp) {
            arr.push({
                ...entry,
                displayMods: ModUtil.pcStringToMods(entry.mods),
            });
        }

        return arr;
    }
}
