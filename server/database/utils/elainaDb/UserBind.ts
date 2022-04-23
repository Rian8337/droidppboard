import { IUserBind, PPEntry, RecalculationProgress } from "app-structures";
import { DatabaseManager } from "../../managers/DatabaseManager";

/**
 * Represents a Discord user who has at least one osu!droid account binded.
 */
export class UserBind implements IUserBind {
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

    constructor(
        data: IUserBind = DatabaseManager.elainaDb?.collections.userBind
            .defaultDocument ?? {}
    ) {
        this.discordid = data.discordid;
        this.uid = data.uid;
        this.username = data.username;
        this.pptotal = data.pptotal;
        this.playc = data.playc;
        this.pp = data.pp ?? [];
        this.clan = data.clan;
        this.previous_bind = data.previous_bind ?? [];
        this.joincooldown = data.joincooldown;
        this.oldclan = data.oldclan;
        this.oldjoincooldown = data.oldjoincooldown;
        this.hasAskedForRecalc = data.hasAskedForRecalc;
        this.dppScanComplete = data.dppScanComplete;
        this.dppRecalcComplete = data.dppRecalcComplete;
        this.calculationInfo = data.calculationInfo;
    }
}
