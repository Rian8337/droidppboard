export interface ModMultiplierSampleEntry {
    readonly id: number;
    readonly uid: number;
    readonly mods: string;
    readonly prevMultiplier: number;
    readonly prevTotalScore: number;
    readonly newMultiplier: number;
    readonly newTotalScore: number;
    readonly combo: number;
    readonly accuracy: number;
    readonly mark: string;
}
