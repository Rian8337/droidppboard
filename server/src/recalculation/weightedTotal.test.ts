import { describe, expect, it } from "vitest";
import { weightedTotal } from "./weightedTotal";

describe("weightedTotal", () => {
    it("weights scores by 0.95 per rank", () => {
        expect(weightedTotal([100, 200])).toBeCloseTo(295);
    });

    it("is 0 without scores", () => {
        expect(weightedTotal([])).toBe(0);
    });

    it("does not reorder the caller's array", () => {
        const values = [1, 3, 2];

        weightedTotal(values);

        expect(values).toEqual([1, 3, 2]);
    });
});
