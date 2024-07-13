/**
 * Represents a response of calculation requests to the dpp processor.
 */
export interface DPPProcessorCalculationResponse<TAttr> {
    /**
     * The calculation attributes.
     */
    readonly attributes: TAttr;

    /**
     * The strain chart in binary data.
     */
    readonly strainChart: number[];
}
