/**
 * Calculates a total performance value from the performance values of a player's scores.
 *
 * @param values The performance values of the scores, in any order.
 * @returns The sum of the values from highest to lowest, each weighted by 0.95 to the power of its rank.
 */
export function weightedTotal(values: number[]): number {
    return values
        .slice()
        .sort((a, b) => b - a)
        .reduce(
            (total, value, rank) => total + value * Math.pow(0.95, rank),
            0,
        );
}
