import {
    BeatmapDifficulty,
    MathUtils,
    ModApproachDifferent,
    ModAutopilot,
    ModDifficultyAdjust,
    ModEasy,
    ModFlashlight,
    ModFreezeFrame,
    ModHardRock,
    ModHidden,
    ModNoFail,
    ModPrecise,
    ModRandom,
    ModRateAdjust,
    ModReallyEasy,
    ModRelax,
    ModTimeRamp,
    ModTraceable,
    ModWindDown,
    ModWindUp,
} from "@rian8337/osu-base";
import { ScoreMultiplierCalculator } from "./ScoreMultiplierCalculator";

/**
 * Current osu!droid score multiplier calculator. This is used to calculate score after version 5 database migration.
 */
export class DroidScoreMultiplierCalculator extends ScoreMultiplierCalculator {
    constructor(
        difficulty: BeatmapDifficulty,
        appliedDifficulty: BeatmapDifficulty,
    ) {
        super(difficulty);

        //#region Difficulty Reduction

        this.single(ModEasy, 0.8);
        this.single(ModNoFail, 0.5);
        this.single(ModReallyEasy, 0.3);

        //#endregion

        //#region Difficulty Increase

        this.single(ModHardRock, 1.04);
        this.single(ModPrecise, 1.02 + (0.06 * appliedDifficulty.od) / 10);
        this.single(ModHidden, (hd) => this.hiddenMultiplier(hd));
        this.single(ModTraceable, 1.02);

        this.combination(
            [ModFlashlight, ModFreezeFrame],
            (fl) => 1 + (this.flashlightMultiplier(fl) - 1) / 2,
        );

        this.single(ModFlashlight, (fl) => this.flashlightMultiplier(fl));

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

        this.single(ModRandom, 0.7);
        this.single(ModApproachDifferent, 0.7);
        this.single(ModWindUp, (wu) => this.timeRampMultiplier(wu));
        this.single(ModWindDown, (wd) => this.timeRampMultiplier(wd));

        //#endregion
    }

    private difficultyAdjustMultiplier(mod: ModDifficultyAdjust): number {
        const { difficulty } = this;

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

    private hiddenMultiplier(mod: ModHidden): number {
        let value = 1.06;

        if (mod.onlyFadeApproachCircles.value) {
            value -= 0.03;
        }

        return value;
    }

    private flashlightMultiplier(mod: ModFlashlight): number {
        // Multiplier of 1.2x, reduced by 0.02 per 0.1 increase in flashlight size.
        let value = MathUtils.clamp(
            1.2 - 0.2 * (mod.sizeMultiplier.value - 1),
            1.02,
            1.2,
        );

        if (!mod.comboBasedSize.value) {
            value = 1 + (value - 1) / 5;
        }

        return value;
    }

    private rateAdjustMultiplier(mods: ModRateAdjust[]): number {
        const multiplier = mods.reduce((acc, mod) => acc * mod.rate, 1);

        return this.rateMultiplier(multiplier);
    }

    private rateMultiplier(rate: number): number {
        return rate >= 1
            ? // Linear from 1.0 to 1.46.
              // Default DT (1.5x) = 1.23
              1 + (rate - 1) * 0.46
            : // 0.2x at 0.5x speed, +0.07x per 0.05x speed increment.
              // Default HT (0.75x) = 0.55
              (Math.floor(rate * 20) / 20) * 1.4 - 0.5;
    }

    private timeRampMultiplier(mod: ModTimeRamp): number {
        const minSpeed = Math.min(mod.initialRate.value, mod.finalRate.value);
        const maxSpeed = Math.max(mod.initialRate.value, mod.finalRate.value);

        const minMultiplier = this.rateMultiplier(minSpeed);
        const maxMultiplier = this.rateMultiplier(maxSpeed);

        return 0.8 * minMultiplier + 0.2 * maxMultiplier;
    }
}
