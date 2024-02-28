import { DifficultyCalculationResult } from "./DifficultyCalculationResult";
import { PerformanceCalculationResult } from "./PerformanceCalculationResult";

export interface ICalculationResult {
    readonly beatmap: Readonly<{
        id?: number;
        artist: string;
        title: string;
        creator: string;
        version: string;
        maxCombo: number;
        stats: Readonly<{
            cs: number;
            ar: number;
            od: number;
            hp: number;
        }>;
        modifiedStats: Readonly<{
            cs: number;
            ar: number;
            od: number;
            hp: number;
        }>;
    }>;

    readonly difficulty: Readonly<{
        droid: DifficultyCalculationResult;
        osu: DifficultyCalculationResult;
    }>;

    readonly performance: Readonly<{
        droid: PerformanceCalculationResult;
        osu: PerformanceCalculationResult;
    }>;
}
