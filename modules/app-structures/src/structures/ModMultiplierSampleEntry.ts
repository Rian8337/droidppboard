import { SerializedMod } from "@rian8337/osu-base";

export interface ModMultiplierSampleEntry {
    readonly id: number;
    readonly uid: number;
    readonly baseScore: number;
    readonly mods: string;
    readonly prevMultiplier: number;
    readonly prevTotalScore: number;
    readonly newMultiplier: number;
    readonly newTotalScore: number;
    readonly accuracy: number;
    readonly mark: string;
}
