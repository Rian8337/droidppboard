import { Vector2 } from '../mathutil/Vector2';

/**
 * Precision utilities.
 */
export abstract class Precision {
    static readonly FLOAT_EPSILON: number = 1e-3;

    /**
     * Checks if two numbers are equal with a given tolerance.
     */
    static almostEqualsNumber(value1: number, value2: number, acceptableDifference: number = this.FLOAT_EPSILON): boolean {
        return Math.abs(value1 - value2) <= acceptableDifference;
    }

    /**
     * Checks if two vectors are equal with a given tolerance.
     */
    static almostEqualsVector(vec1: Vector2, vec2: Vector2, acceptableDifference: number = this.FLOAT_EPSILON): boolean {
        return this.almostEqualsNumber(vec1.x, vec2.x, acceptableDifference) && this.almostEqualsNumber(vec1.y, vec2.y, acceptableDifference);
    }
}