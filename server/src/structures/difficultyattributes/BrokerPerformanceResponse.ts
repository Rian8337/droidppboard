/**
 * Represents a response of the broker's performance route.
 */
export interface BrokerPerformanceResponse<TDifficulty, TPerformance> {
    /**
     * The difficulty attributes.
     */
    readonly difficulty: TDifficulty;

    /**
     * The performance attributes.
     */
    readonly performance: TPerformance;

    /**
     * The strain chart as a base64-encoded PNG, if requested.
     */
    readonly strainChart?: string;
}
