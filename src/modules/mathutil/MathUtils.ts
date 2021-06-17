/**
 * Some math utility functions.
 */
export abstract class MathUtils {
    /**
     * Calculates the standard deviation of given data.
     * 
     * @param data The data to calculate.
     */
    static calculateStandardDeviation(data: number[]): number {
        if (data.length === 0) {
            return 0;
        }
        const mean: number = data.reduce((acc, value) => acc + value) / data.length;

        return Math.sqrt(data.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / data.length);
    }

    /**
     * Rounds a specified number with specified amount of fractional digits.
     * 
     * @param num The number to round.
     * @param fractionalDigits The amount of fractional digits.
     */
    static round(num: number, fractionalDigits: number): number {
        return parseFloat(num.toFixed(fractionalDigits));
    }

    /**
     * Limits the specified number on range `[min, max]`.
     * 
     * @param num The number to limit.
     * @param min The minimum range.
     * @param max The maximum range.
     */
    static clamp(num: number, min: number, max: number): number {
        return Math.max(min, Math.min(num, max));
    }

    static isRoughlyEqual(a: number, b: number): boolean {
        return a * 1.25 > b && a / 1.25 < b;
    }

    static isRatioEqual(ratio: number, a: number, b: number): boolean {
        return this.isRatioEqualGreater(ratio, a, b) && this.isRatioEqualLess(ratio, a, b);
    }

    static isRatioEqualGreater(ratio: number, a: number, b: number): boolean {
        return a + 5 > ratio * b;
    }

    static isRatioEqualLess(ratio: number, a: number, b: number): boolean {
        return a - 5 < ratio * b;
    }

    static isNullOrNaN(num?: number|null): boolean {
        return num === undefined || num === null || Number.isNaN(num);
    }

    /**
     * A boolean function that produces non-binary results when the value being checked is between the 100% True and 100% False thresholds.
     * 
     * @param value The value being evaluated.
     * @param transitionStart If the value is at or below this, the result is false.
     * @param transitionInterval Length of the interval through which the result gradually transitions from false to true.
     * @returns A number from [0, 1] where 0 is 100% false, and 1 is 100% true.
     */
    static transitionToTrue(value: number, transitionStart: number, transitionInterval: number): number {
        if (value <= transitionStart) {
            return 0;
        }

        if (value >= transitionStart + transitionInterval) {
            return 1;
        }

        return (-Math.cos((value - transitionStart) * Math.PI / transitionInterval) + 1) / 2;
    }

    /**
     * A boolean function that produces non-binary results when the value being checked is between the 100% True and 100% False thresholds.
     * 
     * @param value The value being evaluated.
     * @param transitionStart If the value is at or below this, the result is true.
     * @param transitionInterval Length of the interval through which the result gradually transitions from true to false.
     * @returns A number from [0, 1] where 0 is 100% false, and 1 is 100% true.
     */
    static transitionToFalse(value: number, transitionStart: number, transitionInterval: number): number {
        if (value <= transitionStart) {
            return 1;
        }

        if (value >= transitionStart + transitionInterval) {
            return 0;
        }

        return (Math.cos((value - transitionStart) * Math.PI / transitionInterval) + 1) / 2;
    }
}