import { CacheableDifficultyAttributes } from "@rian8337/osu-difficulty-calculator";
import { PerformanceAttributes } from "./PerformanceAttributes";
import { RawDifficultyAttributes } from "./RawDifficultyAttributes";

/**
 * An attribute with complete calculation result.
 */
export interface CompleteCalculationAttributes<
    TDiffAttr extends RawDifficultyAttributes,
    TPerfAttr extends PerformanceAttributes,
> {
    /**
     * The difficulty attributes.
     */
    readonly difficulty: CacheableDifficultyAttributes<TDiffAttr>;

    /**
     * The difficulty attributes.
     */
    readonly performance: TPerfAttr;
}
