import {
    BeatmapDifficulty,
    ModEasy,
    ModNoFail,
    ModReallyEasy,
    ModHardRock,
    ModPrecise,
    ModHidden,
    ModTraceable,
    ModFlashlight,
    ModDifficultyAdjust,
    ModRateAdjust,
    ModRelax,
    ModAutopilot,
    ModWindUp,
    ModWindDown,
    ModTimeRamp,
    Interpolation,
} from "@rian8337/osu-base";
import { ScoreMultiplierCalculator } from "./ScoreMultiplierCalculator";

/**
 * Current osu!droid score multiplier calculator. This is used to calculate score after version 5 database migration.
 */
export class DroidScoreMultiplierCalculator extends ScoreMultiplierCalculator {
    constructor(difficulty?: BeatmapDifficulty | null) {
        super(difficulty);

        //#region Difficulty Reduction

        this.single(ModEasy, 0.5);
        this.single(ModNoFail, 0.5);
        this.single(ModReallyEasy, 0.5);

        //#endregion

        //#region Difficulty Increase

        this.single(ModHardRock, 1.06);
        this.single(ModPrecise, 1.06);
        this.single(ModHidden, (h) => (h.usesDefaultSettings ? 1.06 : 1));
        this.single(ModTraceable, 1.06);
        this.single(ModFlashlight, (f) => (f.usesDefaultSettings ? 1.12 : 1));

        //#endregion

        //#region Conversion

        this.single(ModDifficultyAdjust, (da) =>
            this.difficultyAdjustMultiplier(da),
        );

        this.group(ModRateAdjust, (mods) => this.rateAdjustMultiplier(mods));

        //#endregion

        //#region Automation

        this.single(ModRelax, 1e-3);
        this.single(ModAutopilot, 1e-3);

        //#endregion

        //#region Fun

        this.single(ModWindUp, (wu) => this.timeRampMultiplier(wu));
        this.single(ModWindDown, (wd) => this.timeRampMultiplier(wd));

        //#endregion
    }

    private difficultyAdjustMultiplier(mod: ModDifficultyAdjust): number {
        const { difficulty } = this;

        if (!difficulty) {
            return 1;
        }

        // Graph: https://www.desmos.com/calculator/yrggkhrkzz
        let multiplier = 1;

        if (mod.cs.value !== null) {
            const diff = mod.cs.value - difficulty.cs;

            multiplier *=
                diff >= 0
                    ? 1 + 0.0075 * Math.pow(diff, 1.5)
                    : 2 / (1 + Math.exp(-0.5 * diff));
        }

        if (mod.od.value !== null) {
            const diff = mod.od.value - difficulty.od;

            multiplier *=
                diff >= 0
                    ? 1 + 0.005 * Math.pow(diff, 1.3)
                    : 2 / (1 + Math.exp(-0.25 * diff));
        }

        return multiplier;
    }

    private rateAdjustMultiplier(mods: ModRateAdjust[]): number {
        const multiplier = mods.reduce((acc, mod) => acc * mod.rate, 1);

        return this.rateMultiplier(multiplier);
    }

    private rateMultiplier(rate: number): number {
        return rate >= 1
            ? 1 + (rate - 1) * 0.24
            : Math.pow(0.3, (1 - rate) * 4);
    }

    private timeRampMultiplier(mod: ModTimeRamp): number {
        return Interpolation.lerp(
            this.rateMultiplier(mod.initialRate.value),
            this.rateMultiplier(mod.finalRate.value),
            ModTimeRamp.finalRateProgress,
        );
    }
}
